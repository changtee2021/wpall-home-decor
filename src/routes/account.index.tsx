import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TIER_INFO, nextTier } from "@/lib/tier";
import { fmtTHB } from "@/lib/pricing";
import { WalletCard } from "@/components/wallet/wallet-card";
import { getMyWallet, type Wallet } from "@/lib/wallet";
import { ACCOUNT_HUB_SERVICES } from "@/lib/customer/account-nav";
import { ensureCustomerProfile, type CustomerProfileRow } from "@/lib/customer/ensure-profile";
import {
  countOrdersByHubStatus,
  HUB_ORDER_STATUS,
  type HubStatusKey,
} from "@/lib/customer/order-status";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { AccountHubSkeleton } from "@/components/loading";
import { EmailVerifyBanner } from "@/components/account/email-verify-banner";

export const Route = createFileRoute("/account/")({
  component: AccountHubPage,
});

type Profile = CustomerProfileRow;

const OPEN_CLAIM_STATUSES = ["submitted", "reviewing", "processing"] as const;

function AccountHubPage() {
  const { user } = useAuth();
  const unreadNotifs = useUnreadNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [hubCounts, setHubCounts] = useState<Record<HubStatusKey, number>>({
    pending_payment: 0,
    preparing: 0,
    shipped: 0,
    done: 0,
    cancelled: 0,
  });
  const [openClaims, setOpenClaims] = useState(0);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    void (async () => {
      try {
        const row = await ensureCustomerProfile(user);
        if (!cancelled) setProfile(row);
      } catch {
        if (!cancelled) {
          setProfile({
            full_name: user.email?.split("@")[0] ?? "สมาชิก WP ALL",
            phone: user.phone ?? null,
            email: user.email ?? null,
            tier: "bronze",
            total_spent: 0,
            order_count: 0,
          });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    getMyWallet(user.id).then((w) => {
      if (!cancelled) setWallet(w);
    });
    supabase
      .from("orders")
      .select("status")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!cancelled) setHubCounts(countOrdersByHubStatus(data ?? []));
      });
    supabase
      .from("product_claims")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", [...OPEN_CLAIM_STATUSES])
      .then(({ count }) => {
        if (!cancelled) setOpenClaims(count ?? 0);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayProfile =
    profile ??
    (user
      ? {
          full_name:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "สมาชิก WP ALL",
          phone: user.phone ?? null,
          email: user.email ?? null,
          tier: "bronze" as const,
          total_spent: 0,
          order_count: 0,
        }
      : null);

  if (!user || !displayProfile) {
    return <AccountHubSkeleton />;
  }

  if (profileLoading && !profile) {
    return <AccountHubSkeleton />;
  }

  const info = TIER_INFO[displayProfile.tier];
  const next = nextTier(displayProfile.tier);
  const nextInfo = next ? TIER_INFO[next] : null;
  const progress = nextInfo
    ? Math.min(100, (displayProfile.total_spent / nextInfo.min) * 100)
    : 100;

  const serviceBadge = (badgeKey?: string) => {
    if (badgeKey === "notifications" && unreadNotifs > 0) return unreadNotifs;
    if (badgeKey === "claims" && openClaims > 0) return openClaims;
    return 0;
  };

  const profileCard = (
    <div
      className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden bg-gradient-to-br"
      style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)` }}
    >
      <div className="relative z-10 flex items-center gap-4">
        <div className="size-16 sm:size-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold border-2 border-white/40">
          {(displayProfile.full_name ?? displayProfile.email ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg sm:text-xl font-bold truncate">
            {displayProfile.full_name ?? displayProfile.email}
          </div>
          <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-xs font-bold">
            ⭐ {info.label} · ส่วนลด {(info.discount * 100).toFixed(0)}%
          </div>
          {nextInfo && (
            <div className="mt-3 max-w-md">
              <div className="flex justify-between text-[10px] opacity-90 mb-1">
                <span>ไปยัง {nextInfo.label}</span>
                <span>
                  {fmtTHB(Math.max(0, nextInfo.min - displayProfile.total_spent))} เพิ่มเติม
                </span>
              </div>
              <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-white/10" />
    </div>
  );

  const walletCard = (
    <WalletCard balance={wallet?.balance ?? 0} totalTopup={wallet?.total_topup ?? 0} />
  );

  const ordersSection = (
    <section className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-base">ออเดอร์ของฉัน</div>
        <Link to="/orders" className="text-xs text-primary font-semibold">
          ดูทั้งหมด →
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {HUB_ORDER_STATUS.map((s) => (
          <Link
            key={s.key}
            to="/orders"
            search={{ status: s.key }}
            className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-muted/50 transition-colors min-h-[44px]"
          >
            <div className="relative">
              <s.icon className="size-6 text-muted-foreground" />
              {hubCounts[s.key] > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {hubCounts[s.key]}
                </span>
              )}
            </div>
            <div className="text-[10px] text-center leading-tight">{s.label}</div>
          </Link>
        ))}
      </div>
    </section>
  );

  const servicesSection = (
    <section className="bg-card border border-border rounded-2xl p-4">
      <div className="font-bold text-base mb-3">บริการของฉัน</div>
      <div className="grid grid-cols-4 gap-3">
        {ACCOUNT_HUB_SERVICES.map((m) => {
          const badge = serviceBadge(m.badgeKey);
          return (
            <Link
              key={m.to}
              to={m.to}
              className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-muted/50 transition-colors relative min-h-[44px]"
            >
              <div
                className={`relative size-12 rounded-2xl flex items-center justify-center ${m.color}`}
              >
                <m.icon className="size-6" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-center leading-tight font-medium">{m.label}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-5 max-w-screen-lg w-full mx-auto">
      {user ? <EmailVerifyBanner user={user} /> : null}

      {/* Mobile + tablet: stacked */}
      <div className="lg:hidden space-y-5">
        {profileCard}
        {walletCard}
        {ordersSection}
        {servicesSection}
      </div>

      {/* PC: 2-column hub */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        <div className="space-y-5">
          {profileCard}
          {walletCard}
        </div>
        <div className="space-y-5">
          {ordersSection}
          {servicesSection}
        </div>
      </div>
    </div>
  );
}
