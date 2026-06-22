import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { UserMenuProvider } from "@/hooks/use-user-menu";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";
import { appPublicUrl } from "@/lib/app-public-url";
import { AppErrorPage } from "@/components/errors/app-error-page";
import { NotFoundPage } from "@/components/errors/not-found-page";

function RootNotFound() {
  return <NotFoundPage />;
}

function RootError({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <AppErrorPage error={error} reset={reset} reportBoundary="tanstack_root_error_component" />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { httpEquiv: "content-language", content: "th" },
      { title: "WP ALL Home & Decor — ม่าน มู่ลี่ ของแต่งบ้าน" },
      {
        name: "description",
        content:
          "ช้อปม่าน มู่ลี่ วอลเปเปอร์ และของแต่งบ้านจาก WP ALL Home & Decor — บริการวัด-ติดตั้ง สมาชิกรับส่วนลด",
      },
      { property: "og:site_name", content: "WP ALL Home & Decor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "WP ALL",
          url: appPublicUrl(),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "WP ALL",
          url: appPublicUrl(),
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthListener() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        qc.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserMenuProvider>
          <AuthListener />
          <Outlet />
          <Toaster position="top-right" richColors />
        </UserMenuProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
