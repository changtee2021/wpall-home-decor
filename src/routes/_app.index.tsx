import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIconGrid } from "@/components/storefront/category-icon-grid";
import { BannerCarousel } from "@/components/storefront/banner-carousel";
import { FlashSaleStrip } from "@/components/storefront/flash-sale-strip";
import { ProductCardShopee, type ShopeeProduct } from "@/components/storefront/product-card-shopee";
import { CategoryRail } from "@/components/storefront/category-rail";
import { ServiceIconsRow } from "@/components/storefront/service-icons-row";
import { PromoCardGrid } from "@/components/storefront/promo-card-grid";
import { CouponStrip } from "@/components/storefront/coupon-strip";
import { appPublicUrl } from "@/lib/app-public-url";

const HOME_TITLE = "WP ALL — ม่าน มู่ลี่ ของแต่งบ้าน ครบจบที่เดียว";
const HOME_DESC =
  "ช้อปม่าน มู่ลี่ วอลเปเปอร์ พร้อมบริการวัด-ติดตั้งฟรีถึงบ้าน รับส่วนลดสมาชิกและ Flash Sale ทุกวัน ส่งทั่วไทย";
const HOME_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5ac69895-e22e-4615-a709-232f74e5c71f/id-preview-438bac4e--82db1670-f779-4e71-8634-91e1316a3426.lovable.app-1780468756050.png";

export const Route = createFileRoute("/_app/")({
  head: () => {
    const homeUrl = `${appPublicUrl()}/`;
    return {
      meta: [
        { title: HOME_TITLE },
        { name: "description", content: HOME_DESC },
        { property: "og:title", content: HOME_TITLE },
        { property: "og:description", content: HOME_DESC },
        { property: "og:url", content: homeUrl },
        { property: "og:image", content: HOME_IMAGE },
        { name: "twitter:title", content: HOME_TITLE },
        { name: "twitter:description", content: HOME_DESC },
        { name: "twitter:image", content: HOME_IMAGE },
      ],
      links: [{ rel: "canonical", href: homeUrl }],
    };
  },
  component: HomePage,
});

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  sale_price: number;
  base_price: number;
  badge: string | null;
}
interface BannerRow {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
}
interface FlashRow {
  id: string;
  title: string;
  ends_at: string;
  items: ShopeeProduct[];
}

function HomePage() {
  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [flash, setFlash] = useState<FlashRow | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,slug,name,image_url,sale_price,base_price,badge")
      .eq("is_active", true)
      .order("sort_order")
      .limit(24)
      .then(({ data }) =>
        setProducts(
          ((data ?? []) as ProductRow[]).map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            image_url: p.image_url,
            sale_price: Number(p.sale_price || p.base_price || 0),
            base_price: Number(p.base_price || 0),
            badge: p.badge,
            rating: 4.5 + Math.random() * 0.5,
            sold: Math.floor(20 + Math.random() * 500),
          })),
        ),
      );
    supabase
      .from("banners")
      .select("id,title,image_url,link_url")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setBanners((data ?? []) as BannerRow[]));
    supabase
      .from("flash_sales")
      .select("id,title,ends_at,starts_at,is_active")
      .eq("is_active", true)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(1)
      .then(async ({ data }) => {
        const fs = (data ?? [])[0];
        if (!fs) return;
        const { data: items } = await supabase
          .from("flash_sale_items")
          .select("product_id, sale_price, sold_count")
          .eq("flash_sale_id", fs.id);
        const rows = (items ?? []) as Array<{
          product_id: string;
          sale_price: number;
          sold_count: number;
        }>;
        if (rows.length === 0) {
          setFlash({ id: fs.id, title: fs.title, ends_at: fs.ends_at, items: [] });
          return;
        }
        const { data: prods } = await supabase
          .from("products")
          .select("id,slug,name,image_url,base_price")
          .in(
            "id",
            rows.map((r) => r.product_id),
          );
        const byId = new Map(((prods ?? []) as ProductRow[]).map((p) => [p.id, p]));
        const mapped: ShopeeProduct[] = rows.flatMap((r) => {
          const p = byId.get(r.product_id);
          if (!p) return [];
          return [
            {
              id: p.id,
              slug: p.slug,
              name: p.name,
              image_url: p.image_url,
              sale_price: Number(r.sale_price),
              base_price: Number(p.base_price),
              badge: "FLASH",
              sold: r.sold_count,
            },
          ];
        });
        setFlash({ id: fs.id, title: fs.title, ends_at: fs.ends_at, items: mapped });
      });
  }, []);

  return (
    <div className="pb-20 lg:pb-8">
      <h1 className="sr-only">ผ้าม่านและมู่ลี่คุณภาพดีที่ WP ALL</h1>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 space-y-5">
        <section className="grid lg:grid-cols-[240px_1fr] gap-4">
          <div className="hidden lg:block">
            <CategoryRail />
          </div>
          <BannerCarousel banners={banners} />
        </section>

        <ServiceIconsRow />

        <div className="lg:hidden">
          <CategoryIconGrid />
        </div>

        <section aria-labelledby="promo-heading">
          <h2 id="promo-heading" className="sr-only">
            โปรโมชั่นแนะนำ
          </h2>
          <PromoCardGrid />
        </section>

        <CouponStrip />

        {flash && flash.items.length > 0 && (
          <section aria-labelledby="flash-heading">
            <h2 id="flash-heading" className="sr-only">
              Flash Sale
            </h2>
            <FlashSaleStrip title={flash.title} endsAt={flash.ends_at} items={flash.items} />
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base sm:text-lg font-bold">แนะนำสำหรับคุณ</h2>
            <Link to="/products" className="text-xs text-primary font-semibold">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {products.map((p) => (
              <ProductCardShopee key={p.id} p={p} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
