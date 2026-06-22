import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { fmtTHB } from "@/lib/pricing";
import { TIER_INFO, type Tier } from "@/lib/tier";
import { ACCOUNT_SIDEBAR_NAV, isAccountNavActive } from "@/lib/customer/account-nav";
import logo from "@/assets/wp-logo.png";

export interface AccountSidebarBadges {
  notifications?: number;
  claims?: number;
}

interface AccountSidebarProps {
  profile?: {
    full_name: string | null;
    email: string | null;
    tier: Tier;
  } | null;
  walletBalance?: number;
  badges?: AccountSidebarBadges;
}

export function AccountSidebar({ profile, walletBalance, badges }: AccountSidebarProps) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const tierInfo = profile ? TIER_INFO[profile.tier] : null;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-card border border-border rounded-2xl my-4 ml-0 shadow-sm self-start sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-accent p-1.5">
            <img src={logo} alt="WP ALL" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-sm">บัญชีของฉัน</div>
            <div className="text-[11px] text-muted-foreground">WP ALL Member</div>
          </div>
        </div>
      </div>

      {profile && (
        <div className="px-5 py-4 border-b border-border space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="size-11 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ backgroundColor: tierInfo?.color ?? "var(--primary)" }}
            >
              {(profile.full_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">
                {profile.full_name ?? profile.email}
              </div>
              {tierInfo && (
                <div className="text-[11px] text-muted-foreground">
                  {tierInfo.label} · ลด {(tierInfo.discount * 100).toFixed(0)}%
                </div>
              )}
            </div>
          </div>
          {typeof walletBalance === "number" && (
            <Link
              to="/account/wallet"
              className="block rounded-xl bg-muted/60 px-3 py-2 text-xs hover:bg-muted transition-colors"
            >
              <span className="text-muted-foreground">ยอด Wallet</span>
              <div className="font-bold text-sm text-primary">{fmtTHB(walletBalance)}</div>
            </Link>
          )}
        </div>
      )}

      <nav className="px-3 py-3 flex-1">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl text-xs text-muted-foreground hover:bg-muted/60"
        >
          <ArrowLeft className="size-3.5" /> กลับหน้าร้าน
        </Link>
        <ul className="space-y-0.5 pb-2">
          {ACCOUNT_SIDEBAR_NAV.map((item) => {
            const active = isAccountNavActive(pathname, item.to);
            const badgeCount =
              item.badgeKey === "notifications"
                ? badges?.notifications
                : item.badgeKey === "claims"
                  ? badges?.claims
                  : undefined;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[44px] ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted/60 text-foreground/90"
                  }`}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badgeCount != null && badgeCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
