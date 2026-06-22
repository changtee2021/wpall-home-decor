import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ensureCustomerProfile } from "@/lib/customer/ensure-profile";

const OAUTH_RETURN_KEY = "wpall_oauth_return";

const BLOCKED_PREFIXES = [
  "/login",
  "/signup",
  "/auth/callback",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

/** Safe internal path only — blocks open redirects and auth loops. */
export function sanitizeReturnPath(path: string | undefined | null): string | null {
  if (!path?.startsWith("/") || path.startsWith("//")) return null;
  if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return path;
}

export function saveOAuthReturnPath(path: string | undefined): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeReturnPath(path);
  if (safe) sessionStorage.setItem(OAUTH_RETURN_KEY, safe);
}

export function consumeOAuthReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OAUTH_RETURN_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
  return sanitizeReturnPath(raw);
}

export async function loadAppRole(userId: string): Promise<AppRole | null> {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const list = (roles ?? []).map((r) => r.role as AppRole);
  if (list.includes("admin")) return "admin";
  if (list.includes("customer")) return "customer";
  return null;
}

/** Default landing after sign-in: saved return path → account hub → home. */
export function resolvePostLoginPath(role: AppRole | null, explicitNext?: string | null): string {
  const next = sanitizeReturnPath(explicitNext ?? undefined) ?? consumeOAuthReturnPath();
  if (next) return next;
  if (role === "admin") return "/admin";
  if (role === "customer") return "/account";
  return "/";
}

/** Ensure profile row exists and return the post-login redirect path. */
export async function completeClientSignIn(
  user: User,
  explicitNext?: string | null,
): Promise<string> {
  await ensureCustomerProfile(user);
  const role = await loadAppRole(user.id);
  return resolvePostLoginPath(role, explicitNext);
}
