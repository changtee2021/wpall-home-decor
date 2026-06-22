import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Palette, ShoppingBag, Bell, User } from "lucide-react";
import { useShopCart } from "@/hooks/use-shop-cart";

interface Tab {
  to: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
  badge?: boolean;
}
const TABS: Tab[] = [
  { to: "/", label: "หน้าแรก", icon: Home, match: (p) => p === "/" },
  {
    to: "/customize",
    label: "ออกแบบ",
    icon: Palette,
    match: (p) => p.startsWith("/customize"),
  },
  {
    to: "/cart",
    label: "ตะกร้า",
    icon: ShoppingBag,
    match: (p) => p.startsWith("/cart"),
    badge: true,
  },
  {
    to: "/account/notifications",
    label: "แจ้งเตือน",
    icon: Bell,
    match: (p) => p.startsWith("/account/notifications"),
  },
  {
    to: "/account",
    label: "ฉัน",
    icon: User,
    match: (p) =>
      p === "/account" || (p.startsWith("/account") && !p.startsWith("/account/notifications")),
  },
];

export function BottomTabBar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { itemCount: cartCount } = useShopCart();
  if (pathname.startsWith("/admin") || pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-col items-center gap-0.5 py-2 ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <div className="relative">
                <t.icon className="size-5" />
                {t.badge && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
