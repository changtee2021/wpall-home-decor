/**
 * Quick smoke test — HTTP routes + Supabase schema sanity (no browser).
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const base = process.argv[2] ?? "http://localhost:8080";

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = val;
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY;
const SCHEMA = env.VITE_SUPABASE_SCHEMA ?? env.SUPABASE_SCHEMA ?? "wpall_home_decor";

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function pass(msg) {
  console.log(`OK: ${msg}`);
}

async function checkRoute(path, { expectStatus = 200, label } = {}) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const body = await res.text();
    if (res.status !== expectStatus) {
      fail(`${label ?? path} -> HTTP ${res.status} (expected ${expectStatus})`);
      return body;
    }
    pass(`${label ?? path} -> HTTP ${res.status} (${body.length} bytes)`);
    return body;
  } catch (err) {
    fail(`${label ?? path} -> ${err instanceof Error ? err.message : String(err)}`);
    return "";
  }
}

async function checkSupabaseTable(table, { mustExist = true } = {}) {
  if (!SUPABASE_URL || !ANON_KEY) {
    fail(`Supabase env missing — skip table check: ${table}`);
    return;
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Accept-Profile": SCHEMA,
        "Content-Profile": SCHEMA,
      },
    });
    const text = await res.text();
    const missing = res.status === 404 || text.includes("Could not find the table");
    if (mustExist) {
      if (missing) {
        fail(`Supabase ${SCHEMA}.${table} -> table not found (${res.status})`);
        return;
      }
      if (res.status === 401 || res.status === 403) {
        pass(`Supabase ${SCHEMA}.${table} -> exists (${res.status} without session — expected)`);
        return;
      }
      if (!res.ok) {
        fail(`Supabase ${SCHEMA}.${table} -> HTTP ${res.status}: ${text.slice(0, 120)}`);
        return;
      }
      pass(`Supabase ${SCHEMA}.${table} -> HTTP ${res.status}`);
    } else if (!missing) {
      fail(`Supabase ${SCHEMA}.${table} -> should not exist (legacy table name)`);
    } else {
      pass(`Supabase ${SCHEMA}.${table} -> absent (expected — use product_claims)`);
    }
  } catch (err) {
    fail(`Supabase ${SCHEMA}.${table} -> ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n=== wpall-home-decor smoke test ===`);
console.log(`base: ${base}`);
console.log(`schema: ${SCHEMA}`);
console.log(`supabase: ${SUPABASE_URL ? "configured" : "MISSING"}\n`);

// HTTP
await checkRoute("/api/public/health", { label: "health API" });
const accountHtml = await checkRoute("/account", { label: "account SSR" });
const loginRes = await fetch(`${base}/login`, { redirect: "manual" });
if (loginRes.status === 307 || loginRes.status === 302) {
  pass(`/login -> redirect ${loginRes.status}`);
} else if (loginRes.status === 200) {
  pass(`/login -> HTTP 200`);
} else {
  fail(`/login -> HTTP ${loginRes.status}`);
}
await checkRoute("/account/profile", { label: "account/profile SSR" });

if (accountHtml.includes("animate-pulse")) {
  pass("account SSR renders loading skeleton (no server session — expected)");
} else {
  pass("account SSR has no pulse skeleton");
}

// Supabase schema — catches wrong table name `claims` vs `product_claims`
console.log("\n--- Supabase table probes ---");
await checkSupabaseTable("profiles");
await checkSupabaseTable("user_roles");
await checkSupabaseTable("notifications");
await checkSupabaseTable("claims", { mustExist: false });
await checkSupabaseTable("product_claims");

console.log(`\n=== done: ${failed} failure(s) ===\n`);
process.exit(failed > 0 ? 1 : 0);
