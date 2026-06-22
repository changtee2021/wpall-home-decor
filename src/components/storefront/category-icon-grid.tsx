import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { categoryProductsSearch, fetchActiveCategories, type Category } from "@/lib/categories";
import { displayThaiText } from "@/lib/locale";

const EMOJI: Record<string, string> = {
  curtain: "🪟",
  wood_blind: "🪵",
  aluminum_blind: "🎚️",
  venetian: "🌅",
  roller: "📜",
  dim_blind: "🌒",
  ready_curtain: "🧵",
  partition: "🚪",
  accessory: "🔧",
  other: "🎁",
  wallpaper: "🖼️",
};

export function CategoryIconGrid() {
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    fetchActiveCategories()
      .then((all) => setCats(all.filter((c) => !c.parent_id).slice(0, 8)))
      .catch(() => setCats([]));
  }, []);

  return (
    <section className="bg-card rounded-xl p-3 border border-border">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {cats.map((c, i) => (
          <Link
            key={c.id}
            to="/products"
            search={categoryProductsSearch(c.slug)}
            className="flex flex-col items-center gap-2 py-2 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <div
              className={`size-14 sm:size-16 rounded-full flex items-center justify-center text-2xl ${i % 2 === 0 ? "bg-primary/10" : "bg-secondary/10"}`}
            >
              {EMOJI[c.kind] ?? "🛍️"}
            </div>
            <div className="text-[11px] sm:text-xs text-center font-medium leading-tight">
              {displayThaiText(c.name)}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
