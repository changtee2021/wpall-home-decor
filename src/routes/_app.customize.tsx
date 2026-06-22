import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Palette, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCustomizeCatalog, type CustomizeProductRow } from "@/lib/customize-catalog";
import { ProductCardShopee, type ShopeeProduct } from "@/components/storefront/product-card-shopee";
import { appPublicUrl } from "@/lib/app-public-url";
import { ProductGridSkeleton } from "@/components/loading";

const searchSchema = z.object({
  kind: z.string().optional(),
  q: z.string().optional(),
});

const CUSTOMIZE_TITLE = "ออกแบบม่าน · WP ALL";
const CUSTOMIZE_DESC =
  "เลือกประเภทม่าน แล้วปรับสีราง ผ้า และรายละเอียดได้ทันที พร้อมดูราคาแบบเรียลไทม์";

type KindChip = { kind: string; label: string; count: number };
type SortKey = "default" | "price_asc" | "price_desc" | "name";

export const Route = createFileRoute("/_app/customize")({
  head: () => {
    const url = `${appPublicUrl()}/customize`;
    return {
      meta: [
        { title: CUSTOMIZE_TITLE },
        { name: "description", content: CUSTOMIZE_DESC },
        { property: "og:title", content: CUSTOMIZE_TITLE },
        { property: "og:description", content: CUSTOMIZE_DESC },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  validateSearch: searchSchema,
  component: CustomizePage,
});

function CustomizePage() {
  const { kind: activeKind, q: urlQ } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [rows, setRows] = useState<CustomizeProductRow[]>([]);
  const [kindChips, setKindChips] = useState<KindChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(urlQ ?? "");
  const [sortBy, setSortBy] = useState<SortKey>("default");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const catalog = await fetchCustomizeCatalog({ activeOnly: true });
        const ready = catalog.filter((p) => p.status === "ready");
        if (cancelled) return;
        setRows(ready);

        const { data: categories } = await supabase
          .from("product_categories")
          .select("kind,name")
          .eq("is_active", true)
          .order("sort_order");

        const kindLabel = new Map((categories ?? []).map((c) => [c.kind, c.name]));
        const kindMap = new Map<string, number>();
        for (const p of ready) {
          kindMap.set(p.kind, (kindMap.get(p.kind) ?? 0) + 1);
        }
        setKindChips(
          Array.from(kindMap.entries()).map(([kind, count]) => ({
            kind,
            count,
            label: kindLabel.get(kind) ?? kind.replace(/_/g, " "),
          })),
        );
      } catch (e) {
        console.error("[customize] load failed", e);
        if (!cancelled) {
          setRows([]);
          setKindChips([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQ(urlQ ?? "");
  }, [urlQ]);

  const list = useMemo((): (ShopeeProduct & { hotspotCount: number })[] => {
    const term = q.trim().toLowerCase();
    let filtered = rows.filter((p) => {
      if (activeKind && p.kind !== activeKind) return false;
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !(p.category ?? "").toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });

    filtered = [...filtered];
    switch (sortBy) {
      case "price_asc":
        filtered.sort((a, b) => a.sale_price - b.sale_price);
        break;
      case "price_desc":
        filtered.sort((a, b) => b.sale_price - a.sale_price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name, "th"));
        break;
    }

    return filtered.map((p) => ({
      id: p.slug || p.id,
      slug: p.slug,
      name: p.name,
      image_url: p.image_url ?? p.images[0] ?? null,
      sale_price: p.sale_price,
      base_price: p.base_price,
      badge: p.badge,
      hotspotCount: p.hotspotCount,
    }));
  }, [rows, activeKind, q, sortBy]);

  const setKindFilter = (kind?: string) => {
    const term = q.trim();
    navigate({
      search: {
        ...(term ? { q: term } : {}),
        ...(kind ? { kind } : {}),
      },
    });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate({
      search: {
        ...(term ? { q: term } : {}),
        ...(activeKind ? { kind: activeKind } : {}),
      },
    });
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Palette className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ออกแบบม่าน</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              เลือกประเภทม่าน แล้วปรับสีราง ผ้า และรายละเอียดได้ทันที —
              ดูราคาแบบเรียลไทม์ก่อนใส่ตะกร้า
            </p>
          </div>
        </div>
        <ol className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { step: "1", text: "เลือกประเภทม่าน" },
            { step: "2", text: "ปรับสีราง / ผ้า / รายละเอียด" },
            { step: "3", text: "ใส่ตะกร้าและสั่งซื้อ" },
          ].map((s) => (
            <li
              key={s.step}
              className="flex items-center gap-2 rounded-xl bg-card/80 border border-border px-3 py-2.5"
            >
              <span className="size-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {s.step}
              </span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า..."
            className="w-full pl-9 pr-4 py-2.5 rounded-full bg-muted/50 border border-border focus:border-primary focus:outline-none text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="px-4 py-2.5 rounded-full bg-card border border-border text-sm"
        >
          <option value="default">เรียงตามค่าเริ่มต้น</option>
          <option value="price_asc">ราคา ต่ำ → สูง</option>
          <option value="price_desc">ราคา สูง → ต่ำ</option>
          <option value="name">ชื่อ A–Z</option>
        </select>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          ค้นหา
        </button>
      </form>

      {kindChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKindFilter()}
            className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
              !activeKind
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border hover:border-foreground/30"
            }`}
          >
            ทั้งหมด ({rows.length})
          </button>
          {kindChips.map((c) => (
            <button
              key={c.kind}
              type="button"
              onClick={() => setKindFilter(c.kind)}
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                activeKind === c.kind
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border hover:border-foreground/30"
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <ProductGridSkeleton
          count={8}
          className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        />
      ) : list.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "ยังไม่มีสินค้าที่พร้อมคัสตอม — แอดมินต้องตั้ง hotspot และตัวเลือกให้ครบก่อน"
              : "ไม่พบสินค้าในหมวดนี้"}
          </p>
          <Link to="/products" className="text-sm text-primary font-semibold hover:underline">
            ดูสินค้าทั้งหมด →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((p) => (
            <ProductCardShopee key={p.id} p={p} customBadge={`คัสตอม ${p.hotspotCount} จุด`} />
          ))}
        </div>
      )}
    </div>
  );
}
