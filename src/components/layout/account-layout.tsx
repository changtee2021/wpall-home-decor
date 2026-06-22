import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/layout/site-header";
import { AccountSidebar, type AccountSidebarBadges } from "@/components/layout/account-sidebar";
import { AccountLayoutProvider } from "@/components/layout/account-layout-context";
import { getMyWallet } from "@/lib/wallet";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { Tier } from "@/lib/tier";
import { AccountMobileNav } from "@/components/layout/account-mobile-nav";
import { AccountLayoutSkeleton } from "@/components/loading";
import { releaseBodyScrollLock } from "@/hooks/use-sheet-navigate";

const OPEN_CLAIM_STATUSES = ["submitted", "reviewing", "processing"] as const;

interface ProfileMini {
  full_name: string | null;
  email: string | null;
  tier: Tier;
}

interface AccountLayoutProps {
  children?: ReactNode;
}

function useAccountSidebarData(userId: string | undefined) {
  const unreadNotifs = useUnreadNotifications();
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | undefined>();
  const [openClaims, setOpenClaims] = useState(0);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setWalletBalance(undefined);
      setOpenClaims(0);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name,email,tier")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as ProfileMini);
      });
    getMyWallet(userId).then((w) => setWalletBalance(w?.balance ?? 0));
    supabase
      .from("product_claims")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", [...OPEN_CLAIM_STATUSES])
      .then(({ count }) => setOpenClaims(count ?? 0));
  }, [userId]);

  const badges: AccountSidebarBadges = {
    notifications: unreadNotifs,
    claims: openClaims,
  };

  return { profile, walletBalance, badges };
}

/** Remount child routes on navigation so content always follows the URL. */
function AccountOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    releaseBodyScrollLock();
  }, [pathname]);

  return <Outlet key={pathname} />;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const { user, loading } = useAuth();
  const { profile, walletBalance, badges } = useAccountSidebarData(user?.id);

  useEffect(() => {
    releaseBodyScrollLock();
  }, []);

  if (loading) return <AccountLayoutSkeleton />;
  if (!user) return <Navigate to="/login" search={{ next: "/account" }} replace />;

  return (
    <AccountLayoutProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader defaultMenuSide="left" />
        <div className="flex-1 flex max-w-screen-2xl w-full mx-auto px-4 sm:px-6 gap-6">
          <AccountSidebar profile={profile} walletBalance={walletBalance} badges={badges} />
          <main className="flex-1 min-w-0 py-4 pb-8">
            <AccountMobileNav />
            {children ?? <AccountOutlet />}
          </main>
        </div>
      </div>
    </AccountLayoutProvider>
  );
}

/** Orders under `_app` — sidebar only on PC (header from AppLayout). */
export function AccountOrdersContentShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, walletBalance, badges } = useAccountSidebarData(user?.id);

  if (!user) {
    return <div className="flex-1 min-w-0">{children}</div>;
  }

  return (
    <div className="flex gap-6 max-w-screen-2xl w-full mx-auto">
      <AccountSidebar profile={profile} walletBalance={walletBalance} badges={badges} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
