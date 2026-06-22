import type { LucideIcon } from "lucide-react";
import { Banknote, Boxes, FileText, LayoutDashboard, Users } from "lucide-react";
import { backofficeShopAdminUrl } from "@/lib/backoffice-shop-url";

export interface AdminNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** When true, link opens wp-backoffice /shop (full admin). */
  external?: boolean;
}

/** Lean in-app admin — daily order intake. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "ออเดอร์", url: "/admin/orders", icon: FileText },
  { title: "ตรวจสลิป", url: "/admin/payments", icon: Banknote },
  { title: "สินค้า", url: "/admin/products", icon: Boxes },
  { title: "ลูกค้า", url: "/admin/customers", icon: Users },
  {
    title: "จัดการเต็มรูปแบบ (Backoffice)",
    url: "/admin",
    icon: LayoutDashboard,
    external: true,
  },
];

export function adminNavHref(item: AdminNavItem): string {
  if (item.external) return backofficeShopAdminUrl("/admin");
  return item.url;
}

export function isAdminNavActive(pathname: string, url: string): boolean {
  if (url === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname.startsWith(url);
}
