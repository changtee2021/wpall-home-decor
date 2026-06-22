const REF_STORAGE_KEY = "wp_aff_ref";
const REF_TS_KEY = "wp_aff_ref_ts";
const DEFAULT_COOKIE_DAYS = 30;

export function captureReferralFromSearch(search: string, cookieDays = DEFAULT_COOKIE_DAYS) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(search);
  const ref = params.get("ref")?.trim();
  if (!ref) return;

  const normalized = ref.toUpperCase();
  localStorage.setItem(REF_STORAGE_KEY, normalized);
  localStorage.setItem(REF_TS_KEY, String(Date.now()));

  const maxAge = cookieDays * 24 * 60 * 60;
  document.cookie = `${REF_STORAGE_KEY}=${encodeURIComponent(normalized)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function getStoredReferral(cookieDays = DEFAULT_COOKIE_DAYS): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage = localStorage.getItem(REF_STORAGE_KEY);
  const ts = localStorage.getItem(REF_TS_KEY);
  if (fromStorage && ts) {
    const ageMs = Date.now() - Number(ts);
    if (ageMs <= cookieDays * 24 * 60 * 60 * 1000) return fromStorage;
    localStorage.removeItem(REF_STORAGE_KEY);
    localStorage.removeItem(REF_TS_KEY);
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_STORAGE_KEY}=([^;]*)`));
  if (match?.[1]) return decodeURIComponent(match[1]);

  return null;
}

import { appPublicUrl } from "@/lib/app-public-url";

export function buildReferralUrl(code: string, path = "/"): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = new URL(path, base || appPublicUrl());
  url.searchParams.set("ref", code);
  return url.toString();
}
