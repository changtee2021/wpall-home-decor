import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useShopCart } from "@/hooks/use-shop-cart";
import { useAuth } from "@/hooks/use-auth";
import { TIER_INFO } from "@/lib/tier";
import { supabase } from "@/integrations/supabase/client";
import { CompareHeaderLink } from "@/components/storefront/compare-bar";
import { NotificationBellPopover } from "@/components/layout/notification-bell-popover";
import { useUserMenu } from "@/hooks/use-user-menu";

export function SiteHeader({
  defaultMenuSide = "right",
}: { defaultMenuSide?: "left" | "right" } = {}) {
  const { itemCount: cartCount } = useShopCart();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { setOpen, setSide } = useUserMenu();
  const navigate = useNavigate();
  const [tier, setTier] = useState<keyof typeof TIER_INFO | null>(null);
  const [name, setName] = useState<string>("");
  const [q, setQ] = useState("");

  useEffect(() => {
    setSide(defaultMenuSide);
  }, [defaultMenuSide, setSide]);

  useEffect(() => {
    if (!user) {
      setTier(null);
      setName("");
      return;
    }
    supabase
      .from("profiles")
      .select("tier,full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTier(data.tier as keyof typeof TIER_INFO);
          setName(data.full_name ?? user.email ?? "");
        }
      });
  }, [user]);

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      {/* Main header */}
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-1.5 sm:gap-4">
        <Link
          to="/"
          className="font-extrabold text-primary tracking-tight shrink-0 text-xl sm:text-2xl"
          aria-label="WP ALL"
        >
          WP<span className="text-secondary hidden sm:inline">ALL</span>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            navigate({ to: "/products", search: term ? { q: term } : {} });
          }}
          className="flex-1 min-w-0 max-w-3xl flex items-center gap-2 bg-muted/50 focus-within:bg-muted border border-border focus-within:border-primary/40 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 transition-colors"
          role="search"
        >
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            aria-label="ค้นหาสินค้า"
            className="flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm placeholder:text-muted-foreground sm:placeholder:text-sm"
          />
          {q && (
            <button
              type="submit"
              className="text-xs font-semibold text-primary hover:underline shrink-0"
            >
              ค้นหา
            </button>
          )}
        </form>

        <Link
          to="/customize"
          className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <Palette className="size-4" />
          <span>ออกแบบม่าน</span>
        </Link>

        <CompareHeaderLink className="hidden lg:inline-flex text-muted-foreground hover:text-foreground" />

        <Link
          to="/cart"
          className="relative inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-full bg-card border border-border hover:bg-accent transition-colors shrink-0"
          aria-label="ตะกร้า"
        >
          <ShoppingCart className="size-4" />
          <span className="hidden lg:inline text-sm">ตะกร้า</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        {user && <NotificationBellPopover />}

        {user ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-3 py-1 rounded-full bg-card border border-border hover:bg-accent transition-colors shrink-0"
            aria-label="โปรไฟล์"
          >
            <div className="size-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
              <User className="size-3.5" />
            </div>
            <div className="hidden md:block leading-tight text-left">
              <div className="text-xs font-semibold truncate max-w-[120px]">
                {name || user.email}
              </div>
              {tier && (
                <div className="text-[10px] font-bold" style={{ color: TIER_INFO[tier].color }}>
                  {TIER_INFO[tier].label}
                </div>
              )}
            </div>
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shrink-0"
          >
            <User className="size-4 sm:hidden" />
            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
          </Link>
        )}
      </div>
    </header>
  );
}
