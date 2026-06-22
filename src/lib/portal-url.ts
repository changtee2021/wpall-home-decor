const DEFAULT_PORTAL = "https://wpgroup-portal.vercel.app";

function trimUrl(url: string | undefined): string {
  return url?.trim().replace(/\/$/, "") ?? "";
}

export function portalInfraUrl(): string {
  const base = trimUrl(import.meta.env.VITE_PORTAL_URL as string | undefined) || DEFAULT_PORTAL;
  return `${base}/infrastructure`;
}
