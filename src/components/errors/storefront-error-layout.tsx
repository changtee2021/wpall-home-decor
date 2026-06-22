import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabBar } from "@/components/storefront/bottom-tab-bar";

/** Wraps error / 404 content with the same chrome as `_app` routes. */
export function StorefrontErrorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 pb-24 lg:pb-8">{children}</main>
      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
