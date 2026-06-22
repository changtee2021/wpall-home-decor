import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { displayThaiText } from "@/lib/locale";

interface PromoRow {
  id: string;
  title: string;
  subtitle: string | null;
  tone: string;
  link_url: string;
}

const TONE: Record<string, string> = {
  cream: "bg-gradient-to-br from-pink-50 to-amber-50 text-foreground",
  teal: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
  orange: "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground",
  blue: "bg-gradient-to-br from-sky-100 to-sky-50 text-foreground",
};

export function PromoCardGrid({ layout = "grid" }: { layout?: "grid" | "scroll" }) {
  const [promos, setPromos] = useState<PromoRow[]>([]);
  useEffect(() => {
    supabase
      .from("promo_cards")
      .select("id,title,subtitle,tone,link_url")
      .eq("is_active", true)
      .order("sort_order")
      .limit(8)
      .then(({ data }) => setPromos((data ?? []) as PromoRow[]));
  }, []);

  if (promos.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg font-bold">โปรดีทุกสัปดาห์</h2>
        <Link to="/products" className="text-xs text-primary font-semibold">
          ดูโปรโมชั่นทั้งหมด →
        </Link>
      </div>
      <div
        className={
          layout === "scroll"
            ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-none"
            : "grid grid-cols-2 lg:grid-cols-4 gap-3"
        }
      >
        {promos.map((p) => (
          <a
            key={p.id}
            href={p.link_url}
            className={`block rounded-xl p-4 aspect-[16/10] flex flex-col justify-between hover:shadow-md transition-shadow shrink-0 ${layout === "scroll" ? "w-[72vw] max-w-[280px] snap-start" : ""} ${TONE[p.tone] ?? TONE.teal}`}
          >
            <div className="font-bold text-base sm:text-lg leading-tight">
              {displayThaiText(p.title)}
            </div>
            {p.subtitle && (
              <div className="text-xs sm:text-sm opacity-90">{displayThaiText(p.subtitle)}</div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
