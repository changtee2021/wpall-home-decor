const DEFAULT_BACKOFFICE = "https://wp-backoffice.vercel.app";

export function backofficeShopAdminUrl(adminPath: string): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta.env.VITE_BACKOFFICE_URL as string | undefined)) ||
    DEFAULT_BACKOFFICE;
  const shopPath = adminPath.replace(/^\/admin(\/|$)/, "/shop$1") || "/shop";
  return `${base.replace(/\/$/, "")}${shopPath.startsWith("/") ? shopPath : `/${shopPath}`}`;
}
