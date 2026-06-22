import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  User,
  FileText,
  MapPin,
  Heart,
  Bell,
  Ticket,
  Star,
  Wallet,
  UserCircle,
  LogOut,
  ShoppingBag,
  Home,
  Package,
  Palette,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { releaseBodyScrollLock } from "@/hooks/use-sheet-navigate";
import { TIER_INFO } from "@/lib/tier";
import { isAccountNavActive } from "@/lib/customer/account-nav";
import { useEffect } from "react";

const MENU = [
  { to: "/account", icon: UserCircle, label: "ภาพรวมบัญชี" },
  { to: "/account/profile", icon: User, label: "ข้อมูลส่วนตัว" },
  { to: "/orders", icon: FileText, label: "ออเดอร์ของฉัน" },
  { to: "/account/wallet", icon: Wallet, label: "กระเป๋าเงิน" },
  { to: "/account/coupons", icon: Ticket, label: "คูปองของฉัน" },
  { to: "/account/addresses", icon: MapPin, label: "ที่อยู่จัดส่ง" },
  { to: "/account/favorites", icon: Heart, label: "รายการโปรด" },
  { to: "/account/reviews", icon: Star, label: "รีวิวของฉัน" },
  { to: "/account/notifications", icon: Bell, label: "การแจ้งเตือน" },
] as const;

const SHOP = [
  { to: "/", icon: Home, label: "หน้าหลัก" },
  { to: "/products", icon: Package, label: "สินค้าทั้งหมด" },
  { to: "/customize", icon: Palette, label: "ออกแบบม่าน" },
  { to: "/cart", icon: ShoppingBag, label: "ตะกร้า" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
}

function shopActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function UserMenuSheet({ open, onOpenChange, side = "right" }: Props) {
  const { user, profile, role, signOut } = useAuth();
  const tier = profile?.tier;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    onOpenChange(false);
    releaseBodyScrollLock();
  }, [pathname, onOpenChange]);

  if (!user) return null;

  const closeOnNav = () => onOpenChange(false);

  const navLinkClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] text-left ${
      active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent text-foreground"
    }`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="w-[300px] sm:w-[340px] p-0 flex flex-col">
        <SheetHeader className="p-5 border-b border-border bg-gradient-to-br from-primary/10 to-secondary/10">
          <SheetTitle className="text-left">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{profile?.full_name || user.email}</div>
                {tier && (
                  <div
                    className="text-[11px] font-semibold"
                    style={{ color: TIER_INFO[tier].color }}
                  >
                    {TIER_INFO[tier].label}
                  </div>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-1">
              เมนูร้านค้า
            </div>
            <ul className="space-y-0.5">
              {SHOP.map((m) => (
                <li key={m.to}>
                  <Link
                    to={m.to}
                    onClick={closeOnNav}
                    className={navLinkClass(shopActive(pathname, m.to))}
                  >
                    <m.icon className="size-4 text-muted-foreground" />
                    <span>{m.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-1">
              บัญชีของฉัน
            </div>
            <ul className="space-y-0.5">
              {MENU.map((m) => (
                <li key={m.to}>
                  <Link
                    to={m.to}
                    onClick={closeOnNav}
                    className={navLinkClass(isAccountNavActive(pathname, m.to))}
                  >
                    <m.icon className="size-4 text-muted-foreground" />
                    <span>{m.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          {role === "admin" && (
            <Link
              to="/admin"
              onClick={closeOnNav}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:opacity-90"
            >
              <LayoutDashboard className="size-4" /> เข้าสู่หน้า Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              releaseBodyScrollLock();
              void signOut().then(() => navigate({ to: "/" }));
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" /> ออกจากระบบ
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
