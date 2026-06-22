import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppErrorPage } from "@/components/errors/app-error-page";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { StorefrontErrorLayout } from "@/components/errors/storefront-error-layout";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabBar } from "@/components/storefront/bottom-tab-bar";
import { CompareBar } from "@/components/storefront/compare-bar";
import { CompareProvider, useCompareList } from "@/hooks/use-compare-list";
export const Route = createFileRoute("/_app")({
  component: AppLayout,
  notFoundComponent: StorefrontNotFound,
  errorComponent: StorefrontError,
});

function AppLayout() {
  return (
    <CompareProvider>
      <AppLayoutInner />
    </CompareProvider>
  );
}

function AppLayoutInner() {
  const { count } = useCompareList();
  const comparePad = count > 0 ? "pb-36" : "pb-24";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className={`flex-1 ${comparePad} lg:pb-8`}>
        <Outlet />
      </main>
      <SiteFooter />
      <CompareBar />
      <BottomTabBar />
    </div>
  );
}

function StorefrontNotFound() {
  return (
    <StorefrontErrorLayout>
      <NotFoundPage />
    </StorefrontErrorLayout>
  );
}

function StorefrontError({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <StorefrontErrorLayout>
      <AppErrorPage error={error} reset={reset} reportBoundary="storefront_layout_error" />
    </StorefrontErrorLayout>
  );
}
