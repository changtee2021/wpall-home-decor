import { appPublicUrl } from "@/lib/app-public-url";

/** Base URL for auth redirects — browser origin in client, env default on server. */
export function authRedirectBase(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return appPublicUrl();
}

export function authVerifyEmailRedirectUrl(): string {
  return `${authRedirectBase()}/verify-email`;
}

export function authResetPasswordRedirectUrl(): string {
  return `${authRedirectBase()}/reset-password`;
}

export function authOAuthCallbackUrl(): string {
  return `${authRedirectBase()}/auth/callback`;
}
