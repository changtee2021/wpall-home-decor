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

const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const anon = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const schema = env.VITE_SUPABASE_SCHEMA ?? "wpall_home_decor";

const email = `smoke+${Date.now()}@mailinator.com`;
const password = "TestPass123!";

async function signup() {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: "Smoke Test" },
    }),
  });
  return { status: res.status, body: await res.json() };
}

async function login() {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json() };
}

async function confirmUser(userId) {
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_confirm: true }),
  });
  return { status: res.status, body: await res.json() };
}

async function checkProfile(userId, accessToken) {
  const res = await fetch(`${url}/rest/v1/profiles?select=id,full_name,email&id=eq.${userId}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`,
      "Accept-Profile": schema,
    },
  });
  return { status: res.status, body: await res.json() };
}

async function checkRoles(userId, accessToken) {
  const res = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${userId}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`,
      "Accept-Profile": schema,
    },
  });
  return { status: res.status, body: await res.json() };
}

console.log("email:", email);
const su = await signup();
const userId = su.body.user?.id ?? su.body.id;
console.log("signup:", su.status, {
  userId,
  hasSession: !!su.body.session,
  confirmed: su.body.user?.email_confirmed_at ?? su.body.email_confirmed_at,
  error: su.body.error_description ?? su.body.msg,
});

const lo1 = await login();
console.log(
  "login before confirm:",
  lo1.status,
  lo1.body.error_description ?? lo1.body.msg ?? "ok",
);

if (userId && service) {
  const cf = await confirmUser(userId);
  console.log("admin confirm:", cf.status, cf.body.msg ?? cf.body.message ?? "ok");
}

const lo2 = await login();
console.log("login after confirm:", lo2.status, lo2.body.error_description ?? lo2.body.msg ?? "ok");

if (lo2.body.access_token && userId) {
  const prof = await checkProfile(userId, lo2.body.access_token);
  console.log("profile:", prof.status, prof.body);
  const roles = await checkRoles(userId, lo2.body.access_token);
  console.log("roles:", roles.status, roles.body);
}
