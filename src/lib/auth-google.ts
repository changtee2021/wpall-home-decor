import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authOAuthCallbackUrl } from "@/lib/auth-redirect";
import { saveOAuthReturnPath } from "@/lib/auth-post-login";

export interface GoogleSignInOptions {
  /** Path to return to after OAuth (e.g. `/cart`). */
  returnTo?: string;
}

/** Start Google OAuth — browser redirects to Google, then `/auth/callback`. */
export async function signInWithGoogle(
  options: GoogleSignInOptions = {},
): Promise<{ error?: string }> {
  saveOAuthReturnPath(options.returnTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authOAuthCallbackUrl(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) return { error: error.message };
  return {};
}

/** Exchange PKCE `code` from callback URL, or fall back to existing session. */
export async function completeOAuthCallback(): Promise<{ user: User | null; error?: string }> {
  if (typeof window === "undefined") {
    return { user: null, error: "ไม่พบ session" };
  }

  const url = new URL(window.location.href);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    const desc = url.searchParams.get("error_description");
    return { user: null, error: desc ?? oauthError };
  }

  const code = url.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    window.history.replaceState({}, "", url.pathname);
    if (error) return { user: null, error: error.message };
    return { user: data.session?.user ?? null };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) return { user: null, error: error.message };
  return { user: data.session?.user ?? null };
}

function googleDisplayName(meta: Record<string, unknown>): string {
  const full = meta.full_name;
  if (typeof full === "string" && full.trim()) return full.trim();
  const name = meta.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return "";
}

function googleAvatarUrl(meta: Record<string, unknown>): string {
  const avatar = meta.avatar_url;
  if (typeof avatar === "string" && avatar.trim()) return avatar.trim();
  const picture = meta.picture;
  if (typeof picture === "string" && picture.trim()) return picture.trim();
  return "";
}

/** Sync name and avatar from Google metadata when profile is still empty/default. */
export async function syncGoogleProfile(user: User): Promise<void> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = googleDisplayName(meta);
  const avatar = googleAvatarUrl(meta);
  if (!name && !avatar) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const emailPrefix = user.email?.split("@")[0] ?? "";
  const currentName = profile?.full_name?.trim() ?? "";
  const shouldUpdateName = name && (!currentName || currentName === emailPrefix);
  const shouldUpdateAvatar = avatar && !profile?.avatar_url?.trim();

  if (!shouldUpdateName && !shouldUpdateAvatar) return;

  const payload: { full_name?: string; avatar_url?: string } = {};
  if (shouldUpdateName) payload.full_name = name;
  if (shouldUpdateAvatar) payload.avatar_url = avatar;

  await supabase.from("profiles").update(payload).eq("id", user.id);
}

/** @deprecated Use syncGoogleProfile */
export async function syncGoogleProfileName(user: User): Promise<void> {
  await syncGoogleProfile(user);
}
