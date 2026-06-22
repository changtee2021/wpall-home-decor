import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appPublicUrl } from "@/lib/app-public-url";

function siteBaseUrl(): string {
  return (
    process.env.VITE_APP_PUBLIC_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim() ||
    appPublicUrl()
  ).replace(/\/$/, "");
}

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/products", changefreq: "daily", priority: "0.9" },
          { path: "/login", changefreq: "yearly", priority: "0.2" },
          { path: "/signup", changefreq: "yearly", priority: "0.2" },
          { path: "/cart", changefreq: "monthly", priority: "0.3" },
          { path: "/checkout", changefreq: "monthly", priority: "0.3" },
          { path: "/account", changefreq: "monthly", priority: "0.3" },
          { path: "/orders", changefreq: "monthly", priority: "0.3" },
          { path: "/customers", changefreq: "monthly", priority: "0.3" },
        ];

        try {
          const { data } = await supabaseAdmin
            .from("products")
            .select("id, updated_at")
            .eq("is_active", true);
          for (const row of data ?? []) {
            entries.push({
              path: `/products/${row.id}`,
              lastmod: row.updated_at ?? undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        } catch {
          // fall through with static entries if DB is unreachable
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${siteBaseUrl()}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
