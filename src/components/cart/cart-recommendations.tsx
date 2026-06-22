import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCardShopee, type ShopeeProduct } from "@/components/storefront/product-card-shopee";

export function CartRecommendations({
  productIds,
  title = "คุณอาจสนใจ",
}: {
  productIds: string[];
  title?: string;
}) {
  const [products, setProducts] = useState<ShopeeProduct[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const exclude = new Set(productIds.filter(Boolean));
      let categoryIds: string[] = [];

      if (productIds.length > 0) {
        const { data: inCart } = await supabase
          .from("products")
          .select("category_id")
          .in("id", productIds.filter(Boolean));
        categoryIds = Array.from(
          new Set(
            ((inCart ?? []) as Array<{ category_id: string | null }>)
              .map((p) => p.category_id)
              .filter((id): id is string => !!id),
          ),
        );
      }

      let query = supabase
        .from("products")
        .select("id,slug,name,image_url,sale_price,base_price,badge")
        .eq("is_active", true)
        .order("sort_order")
        .limit(12);

      if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      }

      const { data } = await query;
      if (cancelled) return;

      const mapped: ShopeeProduct[] = (
        (data ?? []) as Array<{
          id: string;
          slug: string | null;
          name: string;
          image_url: string | null;
          sale_price: number;
          base_price: number;
          badge: string | null;
        }>
      )
        .filter((p) => !exclude.has(p.id))
        .slice(0, 10)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          image_url: p.image_url,
          sale_price: Number(p.sale_price || p.base_price || 0),
          base_price: Number(p.base_price || 0),
          badge: p.badge,
          rating: 4.5,
          sold: undefined,
        }));

      setProducts(mapped);
    }

    load().catch(() => setProducts([]));
    return () => {
      cancelled = true;
    };
  }, [productIds.join(",")]);

  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg font-bold">{title}</h2>
        <Link to="/products" className="text-xs text-primary font-semibold">
          ดูทั้งหมด →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {products.map((p) => (
          <ProductCardShopee key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
