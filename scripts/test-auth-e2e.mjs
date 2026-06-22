import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const env = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i)] = val;
  }
}

const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const anon = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY;
const appBase = process.argv[2] ?? "https://wpall-home-decor.vercel.app";

const email = `e2e+${Date.now()}@mailinator.com`;
const password = "TestPass123!";

async function signup() {
  const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { full_name: "E2E" } }),
  });
  return { status: res.status, body: await res.json() };
}

async function confirmViaApi(userId) {
  const res = await fetch(`${appBase}/api/public/auth-confirm-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return { status: res.status, body: await res.json() };
}

async function login() {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json() };
}

const su = await signup();
const userId = su.body.id ?? su.body.user?.id;
console.log("signup", su.status, userId);
const cf = await confirmViaApi(userId);
console.log("confirm API", cf.status, cf.body);
const lo = await login();
console.log(
  "login",
  lo.status,
  lo.body.error_description ?? (lo.body.access_token ? "ok" : lo.body),
);
