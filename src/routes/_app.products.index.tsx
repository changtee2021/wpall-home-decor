import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProductCardShopee, type ShopeeProduct } from "@/components/storefront/product-card-shopee";
import { ProductGridSkeleton } from "@/components/loading";
import { appPublicUrl } from "@/lib/app-public-url";
import {
  fetchActiveCategories,
  findCategoryBySlug,
  matchesCategoryFilter,
  type Category,
} from "@/lib/categories";
import { KINDS } from "@/lib/product-kinds";

const searchSchema = z.object({
  q: z.string().optional(),
  kind: z.string().optional(),
  cat: z.string().optional(),
});

const PRODUCTS_TITLE = "สินค้าทั้งหมด · ม่าน มู่ลี่ วอลเปเปอร์ · WP ALL";
const PRODUCTS_DESC =
  "เลือกชมแคตตาล็อกม่าน มู่ลี่ และของแต่งบ้านครบทุกหมวด ปรับขนาด ผ้า และรางได้ทันที พร้อมบริการวัด-ติดตั้งฟรี";

export const Route = createFileRoute("/_app/products/")({
  head: () => {
    const productsUrl = `${appPublicUrl()}/products`;
    return {
      meta: [
        { title: PRODUCTS_TITLE },
        { name: "description", content: PRODUCTS_DESC },
        { property: "og:title", content: PRODUCTS_TITLE },
        { property: "og:description", content: PRODUCTS_DESC },
        { property: "og:url", content: productsUrl },
        { name: "twitter:title", content: PRODUCTS_TITLE },
        { name: "twitter:description", content: PRODUCTS_DESC },
      ],
      links: [{ rel: "canonical", href: productsUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: PRODUCTS_TITLE,
            description: PRODUCTS_DESC,
            url: productsUrl,
          }),
        },
      ],
    };
  },
  validateSearch: searchSchema,
  component: ProductsPage,
});

type CatalogRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  category_id: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  sale_price: number | null;
  base_price: number | null;
  badge: string | null;
};

type ProductSearch = {
  q?: string;
  kind?: string;
  cat?: string;
};

function ProductsPage() {
  const { q: initialQ, kind: initialKind, cat: initialCat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(initialQ ?? "");
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCat = initialCat ? findCategoryBySlug(allCategories, initialCat) : undefined;
  const effectiveKind = activeCat?.kind ?? initialKind;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data, error }, categories] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id,slug,name,kind,category_id,category,description,image_url,sale_price,base_price,badge",
          )
          .eq("is_active", true)
          .order("sort_order"),
        fetchActiveCategories(),
      ]);
      if (cancelled) return;
      if (error) {
        console.error("[products] load failed", error.message);
        setRows([]);
        setAllCategories([]);
      } else {
        setRows((data ?? []) as CatalogRow[]);
        setAllCategories(categories);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQ(initialQ ?? "");
  }, [initialQ]);

  const kindChips = useMemo(() => {
    const kindsInCatalog = new Set(rows.map((p) => p.kind).filter(Boolean));
    const labelByKind = new Map(
      allCategories.filter((c) => !c.parent_id).map((c) => [c.kind, c.name]),
    );
    return KINDS.filter((k) => kindsInCatalog.has(k.value)).map((k) => ({
      kind: k.value,
      label: labelByKind.get(k.value) ?? k.label,
    }));
  }, [rows, allCategories]);

  const subcategoryChips = useMemo(() => {
    if (activeCat) {
      const children = allCategories.filter((c) => c.parent_id === activeCat.id);
      if (children.length > 0) return children;
      if (activeCat.parent_id) {
        return allCategories.filter((c) => c.parent_id === activeCat.parent_id);
      }
      return [];
    }
    if (effectiveKind) {
      return allCategories.filter((c) => c.kind === effectiveKind && !c.parent_id);
    }
    return allCategories.filter((c) => !c.parent_id);
  }, [activeCat, allCategories, effectiveKind]);

  const term = q.trim().toLowerCase();
  const list = useMemo((): ShopeeProduct[] => {
    return rows
      .filter((p) => {
        const matchScope =
          !initialCat && !initialKind
            ? true
            : matchesCategoryFilter(
                p,
                allCategories,
                initialCat,
                initialCat ? undefined : initialKind,
              );
        const matchQ =
          !term ||
          p.name.toLowerCase().includes(term) ||
          (p.category ?? "").toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term);
        return matchScope && matchQ;
      })
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        image_url: p.image_url,
        sale_price: Number(p.sale_price ?? p.base_price ?? 0),
        base_price: Number(p.base_price ?? 0),
        badge: p.badge,
      }));
  }, [rows, allCategories, initialCat, initialKind, term]);

  const buildSearch = (opts: { q?: string; kind?: string; cat?: string }): ProductSearch => {
    const t = opts.q !== undefined ? opts.q : q.trim();
    const search: ProductSearch = {};
    if (t) search.q = t;
    if (opts.cat) search.cat = opts.cat;
    else if (opts.kind) search.kind = opts.kind;
    return search;
  };

  const setKindFilter = (kind?: string) => {
    navigate({ search: kind ? buildSearch({ kind }) : buildSearch({}) });
  };

  const setCategoryFilter = (slug: string) => {
    navigate({ search: buildSearch({ cat: slug }) });
  };

  const pageTitle =
    activeCat?.name ??
    (effectiveKind ? kindChips.find((k) => k.kind === effectiveKind)?.label : null);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {pageTitle ? pageTitle : "สินค้าทั้งหมด"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pageTitle
            ? `สินค้าในหมวด ${pageTitle}`
            : "เลือกรุ่นที่ต้องการแล้วปรับขนาด · ผ้า · ราง ได้ทันที"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({
            search: buildSearch({
              cat: initialCat,
              kind: initialCat ? undefined : initialKind,
            }),
          });
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อสินค้า หมวดหมู่ หรือคำอธิบาย..."
          className="flex-1 px-4 py-2.5 rounded-full bg-muted/50 border border-border focus:border-primary focus:outline-none text-sm"
        />
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
              !effectiveKind && !initialCat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-foreground/30"
            }`}
          >
            ทุกประเภท
          </button>
          {kindChips.map((c) => (
            <button
              key={c.kind}
              type="button"
              onClick={() => setKindFilter(c.kind)}
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                effectiveKind === c.kind && !initialCat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-foreground/30"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {subcategoryChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeCat?.parent_id && (
            <button
              type="button"
              onClick={() => {
                const root = allCategories.find((c) => c.id === activeCat.parent_id);
                if (root) setCategoryFilter(root.slug);
              }}
              className="px-4 py-2 rounded-full text-xs font-medium border bg-card border-border hover:border-foreground/30"
            >
              ← หมวดหลัก
            </button>
          )}
          {subcategoryChips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.slug)}
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                initialCat === c.slug
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border hover:border-foreground/30"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {term && (
        <div className="text-sm text-muted-foreground">
          ผลลัพธ์สำหรับ <span className="font-semibold text-foreground">&quot;{term}&quot;</span> ·
          พบ {list.length} รายการ
        </div>
      )}

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : list.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          ไม่พบสินค้าที่ตรงกับคำค้นหา
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((p) => (
            <ProductCardShopee key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
