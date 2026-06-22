import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Heart, Trash2 } from "lucide-react";
import { fmtTHB } from "@/lib/pricing";
import { productRouteParam } from "@/lib/product-route";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/favorites")({
  head: () => ({ meta: [{ title: "สินค้าที่ถูกใจ · WP ALL" }] }),
  component: FavoritesPage,
});

interface FavRow {
  id: string;
  product_id: string;
  product?: {
    name: string;
    slug: string;
    sale_price: number;
    base_price: number;
    images: string[];
    image_url: string | null;
  } | null;
}

function FavoritesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<FavRow[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("favorites")
      .select("id,product_id")
      .eq("user_id", user.id);
    if (!data) return setItems([]);
    const ids = data.map((d) => d.product_id);
    if (ids.length === 0) return setItems([]);
    const { data: products } = await supabase
      .from("products")
      .select("id,name,slug,sale_price,base_price,images,image_url")
      .in("id", ids);
    const map = new Map((products ?? []).map((p) => [p.id, p]));
    setItems(
      data.map((d) => ({ ...d, product: (map.get(d.product_id) as FavRow["product"]) ?? null })),
    );
  };

  useEffect(() => {
    load();
  }, [user]);

  const remove = async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    load();
  };

  if (loading) return <AccountPageSkeleton variant="grid" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AccountPageShell title="สินค้าที่ถูกใจ" icon={<Heart className="size-6 text-pink-500" />}>
      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          ยังไม่มีสินค้าที่ถูกใจ{" "}
          <Link to="/products" className="text-primary font-semibold ml-1">
            เลือกสินค้า →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((f) => {
            const p = f.product;
            if (!p) return null;
            const img = (Array.isArray(p.images) && p.images[0]) || p.image_url;
            const price = p.sale_price || p.base_price;
            return (
              <div
                key={f.id}
                className="bg-card border border-border rounded-2xl overflow-hidden group"
              >
                <Link
                  to="/products/$id"
                  params={{ id: productRouteParam({ id: f.product_id, slug: p.slug }) }}
                  className="block aspect-square bg-muted"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : null}
                </Link>
                <div className="p-3">
                  <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                  <div className="text-primary font-bold mt-1">{fmtTHB(price)}</div>
                  <button
                    onClick={() => remove(f.id)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1 text-xs text-destructive hover:bg-destructive/5 py-1.5 rounded-lg"
                  >
                    <Trash2 className="size-3.5" /> เอาออก
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountPageShell>
  );
}
