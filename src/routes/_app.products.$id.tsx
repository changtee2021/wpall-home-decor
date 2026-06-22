import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppErrorPage } from "@/components/errors/app-error-page";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { appPublicUrl } from "@/lib/app-public-url";
import { productRouteParam } from "@/lib/product-route";
import {
  ProductDetail,
  type PDData,
  type PDAttrGroup,
  type PDProduct,
} from "@/components/product/product-detail";
import type { ShopeeProduct } from "@/components/storefront/product-card-shopee";
import type { TierPrice } from "@/lib/tier-pricing";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_PUBLIC_COLS =
  "id,slug,name,category,category_id,description,sku,unit,stock,sale_price,base_price,image_url,images,badge,tags,attributes,kind,is_active,sort_order,created_at,updated_at";

async function fetchPD(idOrSlug: string): Promise<PDData> {
  const filter = UUID_RE.test(idOrSlug)
    ? supabase.from("products").select(PRODUCT_PUBLIC_COLS).eq("id", idOrSlug).maybeSingle()
    : supabase.from("products").select(PRODUCT_PUBLIC_COLS).eq("slug", idOrSlug).maybeSingle();
  const { data: prod, error } = await filter;
  if (error) throw new Error(error.message);
  if (!prod) throw notFound();

  const product: PDProduct = {
    id: prod.id,
    slug: prod.slug,
    name: prod.name,
    category: prod.category,
    description: prod.description,
    sku: prod.sku,
    unit: prod.unit,
    stock: Number(prod.stock ?? 0),
    sale_price: Number(prod.sale_price ?? prod.base_price ?? 0) || Number(prod.base_price ?? 0),
    base_price: Number(prod.base_price ?? 0),
    image_url: prod.image_url,
    images: Array.isArray(prod.images) ? (prod.images as string[]) : [],
    badge: prod.badge,
    tags: prod.tags ?? [],
    attributes: (prod.attributes ?? {}) as Record<string, unknown>,
    category_id: prod.category_id,
  };

  const [hotspotsRes, tierRes, relatedRes] = await Promise.all([
    supabase
      .from("product_hotspots")
      .select("id, pin_label, coord_x, coord_y, attribute_group_id, sort_order")
      .eq("product_id", product.id)
      .order("sort_order"),
    supabase
      .from("product_tier_prices")
      .select("id, product_id, category_id, tier, price_type, value")
      .or(
        `product_id.eq.${product.id}${product.category_id ? `,category_id.eq.${product.category_id}` : ""}`,
      ),
    product.category_id
      ? supabase
          .from("products")
          .select("id, slug, name, image_url, sale_price, base_price, badge")
          .eq("is_active", true)
          .eq("category_id", product.category_id)
          .neq("id", product.id)
          .limit(6)
      : Promise.resolve({ data: [] as ShopeeProduct[], error: null }),
  ]);

  const hotspots = hotspotsRes.data ?? [];
  const groupIds = Array.from(new Set(hotspots.map((h) => h.attribute_group_id)));
  let groups: PDAttrGroup[] = [];
  if (groupIds.length > 0) {
    const { data: gs } = await supabase
      .from("attribute_groups")
      .select("id, name, display_type")
      .in("id", groupIds);
    const { data: opts } = await supabase
      .from("attribute_options")
      .select("id, label, price_delta, swatch_color, image_url, group_id, sort_order")
      .in("group_id", groupIds)
      .eq("is_active", true)
      .order("sort_order");
    groups = (gs ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      display_type: g.display_type,
      options: (opts ?? [])
        .filter((o) => o.group_id === g.id)
        .map((o) => ({
          id: o.id,
          label: o.label,
          price_delta: Number(o.price_delta ?? 0),
          swatch_color: o.swatch_color,
          image_url: o.image_url,
          group_id: o.group_id,
        })),
    }));
  }

  const hotspotsOut = hotspots.map((h) => ({
    id: h.id,
    pin_label: h.pin_label,
    coord_x: Number(h.coord_x),
    coord_y: Number(h.coord_y),
    attribute_group_id: h.attribute_group_id,
    group: groups.find((g) => g.id === h.attribute_group_id) ?? null,
  }));

  const related: ShopeeProduct[] = (
    (relatedRes.data ?? []) as Array<{
      id: string;
      slug: string | null;
      name: string;
      image_url: string | null;
      sale_price: number | string | null;
      base_price: number | string | null;
      badge: string | null;
    }>
  ).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    image_url: r.image_url,
    sale_price: Number(r.sale_price ?? 0),
    base_price: r.base_price != null ? Number(r.base_price) : null,
    badge: r.badge,
  }));

  const tierPrices: TierPrice[] = (tierRes.data ?? []).map((t) => ({
    id: t.id,
    product_id: t.product_id,
    category_id: t.category_id,
    tier: t.tier,
    price_type: t.price_type as "fixed" | "discount_pct",
    value: Number(t.value),
  }));

  return { product, hotspots: hotspotsOut, groups, tierPrices, related };
}

const pdQueryOptions = (idOrSlug: string) =>
  queryOptions({
    queryKey: ["product-detail", idOrSlug],
    queryFn: () => fetchPD(idOrSlug),
  });

export const Route = createFileRoute("/_app/products/$id")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(pdQueryOptions(params.id)),
  head: ({ params }) => {
    const url = `${appPublicUrl()}/products/${params.id}`;
    return {
      meta: [
        { title: "สินค้า · WP ALL" },
        { name: "description", content: "ดูรายละเอียดสินค้าและสั่งตัดผ้าม่านที่ WP ALL" },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ProductDetailPage,
  errorComponent: ({ error, reset }) => (
    <AppErrorPage
      error={error}
      reset={reset}
      title="โหลดสินค้าไม่สำเร็จ"
      reportBoundary="product_detail_error"
      compact
    />
  ),
  notFoundComponent: () => (
    <NotFoundPage
      title="ไม่พบสินค้านี้"
      description="สินค้าอาจถูกนำออกหรือลิงก์ไม่ถูกต้อง ลองค้นหาสินค้าอื่นแทน"
      backTo={{ label: "กลับสินค้าทั้งหมด", to: "/products" }}
      compact
    />
  ),
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(pdQueryOptions(id));
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4">
      <Link
        to="/products"
        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground gap-1 mb-3"
      >
        <ChevronLeft className="size-3.5" /> สินค้าทั้งหมด
      </Link>
      <ProductDetail data={data} />
    </div>
  );
}
