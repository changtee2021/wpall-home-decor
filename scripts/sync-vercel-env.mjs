/**
 * Push env vars from local .env (+ salepage fallback) → wpall-home-decor Vercel project.
 * Usage: node scripts/sync-vercel-env.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) out[key] = val;
  }
  return out;
}

function loadFile(path) {
  if (!existsSync(path)) return {};
  return parseEnv(readFileSync(path, "utf8"));
}

const ALLOW = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_SCHEMA",
  "VITE_APP_PUBLIC_URL",
  "SUPABASE_URL",
  "SUPABASE_SCHEMA",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_TO",
  "APP_PUBLIC_URL",
  "C2C2P_MERCHANT_ID",
  "C2C2P_SECRET_KEY",
  "C2C2P_ENV",
  "NITRO_PRESET",
  "INTEGRATIONS_ENABLED",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const OVERRIDES = {
  VITE_SUPABASE_SCHEMA: "wpall_home_decor",
  SUPABASE_SCHEMA: "wpall_home_decor",
  VITE_APP_PUBLIC_URL: "https://wpall-home-decor.vercel.app",
  APP_PUBLIC_URL: "https://wpall-home-decor.vercel.app",
  INTEGRATIONS_ENABLED: "false",
};

const raw = {
  ...loadFile(resolve(root, "../wpallin1-salepage/.env.vercel.prod")),
  ...loadFile(resolve(root, "../wpallin1-salepage/.env")),
  ...loadFile(resolve(root, ".env")),
};

const vars = { ...raw, ...OVERRIDES };

if (!vars.VITE_SUPABASE_URL || !vars.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase keys in .env — cannot sync");
  process.exit(1);
}

const envs = ["production", "preview", "development"];
let ok = 0;
let fail = 0;

for (const name of ALLOW) {
  const value = vars[name];
  if (!value) continue;
  for (const env of envs) {
    try {
      execSync(
        `npx vercel env add ${name} ${env} --value "${value.replace(/"/g, '\\"')}" --yes --force`,
        { cwd: root, stdio: ["pipe", "pipe", "pipe"] },
      );
      console.log(`OK ${name} (${env})`);
      ok++;
    } catch (e) {
      const msg = e.stderr?.toString() || e.message;
      console.error(`FAIL ${name} (${env}): ${msg.slice(0, 160)}`);
      fail++;
    }
  }
}

console.log(`\nDone: ${ok} set, ${fail} failed`);
