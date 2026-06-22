import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CompareTable } from "@/components/storefront/compare-table";
import { useCompareList } from "@/hooks/use-compare-list";
import { useAuth } from "@/hooks/use-auth";
import { useShopCart } from "@/hooks/use-shop-cart";
import { PageSkeleton } from "@/components/loading";
import {
  compareItemFromShopee,
  computeRefPrice,
  defaultSelectedOptions,
  isPerMeterProduct,
  parseCompareIds,
  REF_HEIGHT_CM,
  REF_WIDTH_CM,
  type CompareItem,
  type CompareProduct,
} from "@/lib/compare";
import { buildCartConfig } from "@/lib/cart.types";
import type { PDAttrGroup } from "@/components/product/product-detail";
import type { TierPrice } from "@/lib/tier-pricing";
import type { Tier } from "@/lib/tier";
import { appPublicUrl } from "@/lib/app-public-url";

const searchSchema = z.object({
  ids: z.string().optional(),
});

const PRODUCT_PUBLIC_COLS =
  "id,slug,name,category,category_id,description,sku,unit,stock,sale_price,base_price,image_url,badge,tags,attributes,kind";

async function fetchCompareProducts(ids: string[]) {
  if (ids.length === 0) {
    return {
      products: [] as CompareProduct[],
      groupsByProduct: new Map<string, PDAttrGroup[]>(),
      tierPrices: [] as TierPrice[],
    };
  }

  const { data: prods, error } = await supabase
    .from("products")
    .select(PRODUCT_PUBLIC_COLS)
    .in("id", ids)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const products: CompareProduct[] = (prods ?? []).map((prod) => ({
    id: prod.id,
    slug: prod.slug,
    name: prod.name,
    category: prod.category,
    category_id: prod.category_id,
    description: prod.description,
    sku: prod.sku,
    unit: prod.unit ?? "ชิ้น",
    stock: Number(prod.stock ?? 0),
    sale_price: Number(prod.sale_price ?? prod.base_price ?? 0) || Number(prod.base_price ?? 0),
    base_price: Number(prod.base_price ?? 0),
    image_url: prod.image_url,
    badge: prod.badge,
    tags: prod.tags ?? [],
    attributes: (prod.attributes ?? {}) as Record<string, unknown>,
    kind: prod.kind ?? "",
  }));

  const productIds = products.map((p) => p.id);
  const categoryIds = Array.from(
    new Set(products.map((p) => p.category_id).filter(Boolean)),
  ) as string[];

  const [hotspotsRes, tierRes] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("product_hotspots")
          .select("product_id, attribute_group_id")
          .in("product_id", productIds)
      : Promise.resolve({
          data: [] as { product_id: string; attribute_group_id: string }[],
          error: null,
        }),
    productIds.length > 0 || categoryIds.length > 0
      ? supabase
          .from("product_tier_prices")
          .select("id, product_id, category_id, tier, price_type, value")
          .or(
            [
              productIds.length ? `product_id.in.(${productIds.join(",")})` : null,
              categoryIds.length ? `category_id.in.(${categoryIds.join(",")})` : null,
            ]
              .filter(Boolean)
              .join(","),
          )
      : Promise.resolve({ data: [] as TierPrice[], error: null }),
  ]);

  const groupIds = Array.from(new Set((hotspotsRes.data ?? []).map((h) => h.attribute_group_id)));

  let allGroups: PDAttrGroup[] = [];
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

    allGroups = (gs ?? []).map((g) => ({
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

  const groupsByProduct = new Map<string, PDAttrGroup[]>();
  for (const pid of productIds) {
    const pGroupIds = new Set(
      (hotspotsRes.data ?? []).filter((h) => h.product_id === pid).map((h) => h.attribute_group_id),
    );
    groupsByProduct.set(
      pid,
      allGroups.filter((g) => pGroupIds.has(g.id)),
    );
  }

  const tierPrices: TierPrice[] = (tierRes.data ?? []).map((t) => ({
    id: t.id,
    product_id: t.product_id,
    category_id: t.category_id,
    tier: t.tier as Tier,
    price_type: t.price_type as "fixed" | "discount_pct",
    value: Number(t.value),
  }));

  const orderMap = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return { products, groupsByProduct, tierPrices };
}

function toCompareItems(prods: CompareProduct[]): CompareItem[] {
  return prods.map((p) =>
    compareItemFromShopee({
      id: p.id,
      slug: p.slug,
      name: p.name,
      image_url: p.image_url,
      sale_price: p.sale_price,
      base_price: p.base_price,
      category: p.category,
    }),
  );
}

export const Route = createFileRoute("/_app/compare")({
  validateSearch: searchSchema,
  head: () => {
    const url = `${appPublicUrl()}/compare`;
    return {
      meta: [
        { title: "เปรียบเทียบสินค้า · WP ALL" },
        { name: "description", content: "เปรียบเทียบรายละเอียด ราคา และสเปกสินค้าสูงสุด 4 รายการ" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ComparePage,
});

function ComparePage() {
  const { ids: urlIdsRaw } = Route.useSearch();
  const navigate = useNavigate();
  const { ids: listIds, remove, syncItems } = useCompareList();
  const { profile } = useAuth();
  const { addItem } = useShopCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  const urlIds = parseCompareIds(urlIdsRaw);

  const effectiveIds = useMemo(() => {
    if (urlIds.length >= 2) return urlIds;
    if (listIds.length >= 2) return listIds;
    return urlIds.length > 0 ? urlIds : listIds;
  }, [urlIds, listIds]);

  useEffect(() => {
    if (effectiveIds.length >= 2 || redirected) return;
    setRedirected(true);
    toast.info("เลือกอย่างน้อย 2 สินค้าเพื่อเปรียบเทียบ");
    navigate({ to: "/products" });
  }, [effectiveIds.length, navigate, redirected]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["compare-products", effectiveIds.join(",")],
    queryFn: () => fetchCompareProducts(effectiveIds),
    enabled: effectiveIds.length >= 2,
  });

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const groupsByProduct = useMemo(
    () => data?.groupsByProduct ?? new Map<string, PDAttrGroup[]>(),
    [data?.groupsByProduct],
  );
  const tierPrices = useMemo(() => data?.tierPrices ?? [], [data?.tierPrices]);
  const tier: Tier = profile?.tier ?? "bronze";

  const productIdsKey = products.map((p) => p.id).join(",");

  useEffect(() => {
    if (products.length === 0) return;
    syncItems(toCompareItems(products));
  }, [productIdsKey, products, syncItems]);

  useEffect(() => {
    if (!data?.products) return;
    const found = new Set(data.products.map((p) => p.id));
    const missing = effectiveIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      for (const id of missing) remove(id, { silent: true });
      toast.info("ลบสินค้าที่ไม่พร้อมขายออกจากรายการเปรียบเทียบแล้ว");
    }
  }, [data?.products, effectiveIds, remove]);

  const refPrices = useMemo(
    () =>
      products.map((p) => computeRefPrice(p, groupsByProduct.get(p.id) ?? [], tierPrices, tier)),
    [products, groupsByProduct, tierPrices, tier],
  );

  const handleAddToCart = async (product: CompareProduct, groups: PDAttrGroup[]) => {
    const selected = defaultSelectedOptions(groups);
    const opts = groups.map((g) => {
      const o = g.options.find((x) => x.id === selected[g.id]);
      return { group: g.name, value: o?.label ?? "-", optionId: o?.id };
    });
    const attrs = product.attributes ?? {};
    const isPerMeter = isPerMeterProduct(product.unit, attrs);
    const refPrice = computeRefPrice(product, groups, tierPrices, tier);

    setAddingId(product.id);
    try {
      await addItem.mutateAsync({
        productId: product.id,
        productName: product.name,
        config: buildCartConfig({
          widthCm: REF_WIDTH_CM,
          heightCm: isPerMeter ? 100 : REF_HEIGHT_CM,
          qty: 1,
          attributes: opts,
        }),
        qty: 1,
        unitPrice: refPrice,
        lineTotal: refPrice,
        note: opts.length ? opts.map((o) => `${o.group}: ${o.value}`).join(" • ") : undefined,
      });
      toast.success("เพิ่มลงตะกร้าแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มตะกร้าไม่สำเร็จ");
    } finally {
      setAddingId(null);
    }
  };

  if (effectiveIds.length < 2) return null;

  const categories = new Set(products.map((p) => p.category).filter(Boolean));

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 pb-8">
      <Link
        to="/products"
        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground gap-1 mb-3"
      >
        <ChevronLeft className="size-3.5" /> กลับสินค้าทั้งหมด
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <GitCompare className="size-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">เปรียบเทียบสินค้า</h1>
          <p className="text-sm text-muted-foreground">
            สูงสุด 4 รายการ · ราคาอ้างอิงขนาด {REF_WIDTH_CM}×{REF_HEIGHT_CM} ซม.
          </p>
        </div>
      </div>

      {categories.size > 1 && (
        <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
          สินค้าคนละหมวด — บางสเปกอาจไม่ตรงกัน ค่าที่ไม่มีจะแสดงเป็น —
        </p>
      )}

      {isLoading && <PageSkeleton cards={4} className="py-4" label="กำลังโหลดเปรียบเทียบ..." />}

      {error && (
        <div className="text-sm text-destructive py-12 text-center">
          โหลดข้อมูลไม่สำเร็จ — ลองใหม่อีกครั้ง
        </div>
      )}

      {!isLoading && !error && products.length >= 2 && (
        <CompareTable
          products={products}
          groupsByProduct={groupsByProduct}
          refPrices={refPrices}
          onRemove={remove}
          onAddToCart={handleAddToCart}
          addingId={addingId}
        />
      )}

      {!isLoading && !error && products.length < 2 && (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground text-sm">ไม่พบสินค้าที่เลือกเปรียบเทียบ</p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            ไปเลือกสินค้า
          </Link>
        </div>
      )}
    </div>
  );
}
