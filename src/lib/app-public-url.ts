const DEFAULT = "https://wpall-home-decor.vercel.app";

/** Public site base URL — override with VITE_APP_PUBLIC_URL in production. */
export function appPublicUrl(): string {
  const fromEnv = import.meta.env.VITE_APP_PUBLIC_URL?.trim();
  return (fromEnv || DEFAULT).replace(/\/$/, "");
}
