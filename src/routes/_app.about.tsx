import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/about")({
  head: () => ({
    meta: [
      { title: "เกี่ยวกับเรา · WP ALL" },
      { name: "description", content: "เรื่องราวของ WP ALL โรงงานม่านขายส่งและบริการคัสตอม" },
      { property: "og:title", content: "เกี่ยวกับเรา · WP ALL" },
    ],
  }),
  component: AboutPage,
});

interface SiteRow {
  brand_name: string;
  tagline: string | null;
  about_html: string | null;
}

function AboutPage() {
  const [s, setS] = useState<SiteRow | null>(null);
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("brand_name,tagline,about_html")
      .eq("key", "main")
      .maybeSingle()
      .then(({ data }) => setS((data ?? null) as SiteRow | null));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header>
        <h1 className="text-3xl font-bold">เกี่ยวกับ {s?.brand_name ?? "เรา"}</h1>
        {s?.tagline && <p className="text-muted-foreground mt-2">{s.tagline}</p>}
      </header>
      <article className="prose prose-sm max-w-none bg-card border border-border rounded-2xl p-6 whitespace-pre-wrap text-sm leading-7">
        {s?.about_html ? (
          <div dangerouslySetInnerHTML={{ __html: s.about_html }} />
        ) : (
          "ยังไม่ได้กรอกข้อมูล กรุณาเข้าไปที่ /admin/site-settings เพื่อแก้ไข"
        )}
      </article>
    </div>
  );
}
