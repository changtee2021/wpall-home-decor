import type { LucideIcon } from "lucide-react";
import {
  Bell,
  FileText,
  Heart,
  Home,
  MapPin,
  Handshake,
  ShieldAlert,
  ShieldCheck,
  Star,
  Ticket,
  UserCircle,
  Wallet,
} from "lucide-react";

export interface AccountNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar-only (not in hub services grid). */
  sidebarOnly?: boolean;
  /** Hub grid tile styling. */
  color?: string;
  /** Badge key for dynamic counts. */
  badgeKey?: "notifications" | "claims";
}

/** PC sidebar navigation (ordered). */
export const ACCOUNT_SIDEBAR_NAV: AccountNavItem[] = [
  { to: "/account", label: "บัญชีของฉัน", icon: Home, sidebarOnly: true },
  { to: "/account/wallet", label: "กระเป๋าเงิน", icon: Wallet, sidebarOnly: true },
  { to: "/orders", label: "ออเดอร์ของฉัน", icon: FileText },
  {
    to: "/account/profile",
    label: "ข้อมูลส่วนตัว",
    icon: UserCircle,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    to: "/account/addresses",
    label: "ที่อยู่จัดส่ง",
    icon: MapPin,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    to: "/account/favorites",
    label: "สินค้าที่ถูกใจ",
    icon: Heart,
    color: "bg-pink-50 text-pink-600",
  },
  {
    to: "/account/affiliate",
    label: "ช่วยขายรับคอม",
    icon: Handshake,
    color: "bg-violet-50 text-violet-600",
  },
  {
    to: "/account/claims",
    label: "เคลมสินค้า",
    icon: ShieldAlert,
    color: "bg-orange-50 text-orange-600",
    badgeKey: "claims",
  },
  {
    to: "/account/coupons",
    label: "คูปองของฉัน",
    icon: Ticket,
    color: "bg-amber-50 text-amber-600",
  },
  {
    to: "/account/notifications",
    label: "การแจ้งเตือน",
    icon: Bell,
    color: "bg-purple-50 text-purple-600",
    badgeKey: "notifications",
  },
  {
    to: "/account/reviews",
    label: "รีวิวที่เขียน",
    icon: Star,
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    to: "/account/security",
    label: "ความปลอดภัย",
    icon: ShieldCheck,
    color: "bg-slate-100 text-slate-700",
  },
];

/** Hub "บริการของฉัน" grid — excludes sidebar-only items. */
export const ACCOUNT_HUB_SERVICES = ACCOUNT_SIDEBAR_NAV.filter((item) => !item.sidebarOnly);

export function isAccountNavActive(pathname: string, href: string): boolean {
  if (href === "/account") {
    return pathname === "/account" || pathname === "/account/";
  }
  if (href === "/orders") {
    return pathname === "/orders" || pathname.startsWith("/orders/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
