import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { displayThaiText } from "@/lib/locale";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Row {
  id: string;
  label: string;
  icon: string;
  link_url: string;
  tone: string;
}

export function ServiceIconsRow() {
  const [items, setItems] = useState<Row[]>([]);
  useEffect(() => {
    supabase
      .from("service_icons")
      .select("id,label,icon,link_url,tone")
      .eq("is_active", true)
      .order("sort_order")
      .limit(14)
      .then(({ data }) => setItems((data ?? []) as Row[]));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="bg-card rounded-xl border border-border p-3 sm:p-4">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
        {items.map((s) => {
          const Icon = (Icons as unknown as Record<string, LucideIcon>)[s.icon] ?? Icons.Sparkles;
          const ring =
            s.tone === "orange" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary";
          return (
            <a
              key={s.id}
              href={s.link_url}
              className="flex flex-col items-center gap-2 py-1 rounded-lg hover:bg-accent/40 transition-colors"
            >
              <div
                className={`size-14 sm:size-16 rounded-full flex items-center justify-center ${ring}`}
              >
                <Icon className="size-6 sm:size-7" />
              </div>
              <div className="text-[11px] sm:text-xs text-center font-medium leading-tight">
                {displayThaiText(s.label)}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
