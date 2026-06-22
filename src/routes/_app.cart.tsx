import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { VAT_RATE } from "@/lib/pricing";
import { appPublicUrl } from "@/lib/app-public-url";
import { useAuth } from "@/hooks/use-auth";
import { useShopCart } from "@/hooks/use-shop-cart";
import { useCompareListOptional } from "@/hooks/use-compare-list";
import { TIER_INFO } from "@/lib/tier";
import { CartSkeleton } from "@/components/loading";
import { supabase } from "@/integrations/supabase/client";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { CartSelectBar } from "@/components/cart/cart-select-bar";
import { CartSummaryPanel } from "@/components/cart/cart-summary-panel";
import { CartCheckoutBar } from "@/components/cart/cart-checkout-bar";
import { CartUpsellSection } from "@/components/cart/cart-upsell-section";
import { CartRecommendations } from "@/components/cart/cart-recommendations";

const CART_TITLE = "ตะกร้าสินค้า · WP ALL";
const CART_DESC =
  "ตรวจสอบสินค้าในตะกร้า ปรับจำนวน ใช้คูปอง และดำเนินการชำระเงินอย่างปลอดภัยที่ WP ALL";
const CART_URL = `${appPublicUrl()}/cart`;

type ProductMeta = { image_url: string | null; slug: string | null };

export const Route = createFileRoute("/_app/cart")({
  head: () => ({
    meta: [
      { title: CART_TITLE },
      { name: "description", content: CART_DESC },
      { name: "robots", content: "noindex,follow" },
      { property: "og:title", content: CART_TITLE },
      { property: "og:description", content: CART_DESC },
      { property: "og:url", content: CART_URL },
    ],
    links: [{ rel: "canonical", href: CART_URL }],
  }),
  component: CartPage,
});

function CartPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const compare = useCompareListOptional();
  const { items, subtotal, itemCount, isLoading, removeItem, updateQty } = useShopCart();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [productMeta, setProductMeta] = useState<Record<string, ProductMeta>>({});

  const productIds = useMemo(
    () => items.map((i) => i.productId).filter((id): id is string => !!id),
    [items],
  );

  useEffect(() => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  }, [items]);

  useEffect(() => {
    if (productIds.length === 0) {
      setProductMeta({});
      return;
    }
    supabase
      .from("products")
      .select("id, image_url, slug")
      .in("id", productIds)
      .then(({ data }) => {
        const map: Record<string, ProductMeta> = {};
        for (const row of (data ?? []) as Array<{
          id: string;
          image_url: string | null;
          slug: string | null;
        }>) {
          map[row.id] = { image_url: row.image_url, slug: row.slug };
        }
        setProductMeta(map);
      });
  }, [productIds.join(",")]);

  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  const selectedSubtotal = selectedItems.reduce((s, i) => s + i.lineTotal, 0);
  const selectedQty = selectedItems.reduce((s, i) => s + i.qty, 0);

  const tierPct = profile ? TIER_INFO[profile.tier].discount : 0;
  const tierDisc = selectedSubtotal * tierPct;
  const netBeforeVat = selectedSubtotal - tierDisc;
  const vat = netBeforeVat * VAT_RATE;
  const grand = netBeforeVat + vat;

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const mobilePad = items.length > 0 ? (compare && compare.count > 0 ? "pb-44" : "pb-32") : "";

  const goCheckout = () => {
    if (selectedIds.size === 0) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: "/checkout" });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const deleteSelected = () => {
    for (const id of selectedIds) {
      removeItem.mutate(id);
    }
    setSelectedIds(new Set());
  };

  if (isLoading) return <CartSkeleton />;

  return (
    <div
      className={`max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 ${mobilePad} lg:pb-6`}
    >
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
        ตะกร้าสินค้า
        {itemCount > 0 && (
          <span className="text-muted-foreground font-normal text-base ml-2">({itemCount})</span>
        )}
      </h1>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-12 px-6 text-center">
          <ShoppingBag className="size-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold mt-4">ตะกร้าสินค้าว่าง</h2>
          <p className="text-sm text-muted-foreground mt-1">เลือกสินค้าและปรับขนาดได้เลย</p>
          <Link
            to="/products"
            className="mt-5 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold min-h-[44px]"
          >
            เลือกสินค้า
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <section className="bg-muted/20 rounded-2xl border border-border p-3 sm:p-4 space-y-2">
              <CartSelectBar
                allSelected={allSelected}
                someSelected={someSelected}
                selectedCount={selectedIds.size}
                onToggleAll={toggleAll}
                onDeleteSelected={deleteSelected}
              />
              <div className="space-y-2">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    product={item.productId ? productMeta[item.productId] : undefined}
                    selected={selectedIds.has(item.id)}
                    onSelect={(checked) => toggleOne(item.id, checked)}
                    onRemove={() => removeItem.mutate(item.id)}
                    onUpdateQty={(qty) =>
                      updateQty.mutate({
                        itemId: item.id,
                        qty,
                        unitPrice: item.unitPrice,
                        lineTotal: item.unitPrice * qty,
                      })
                    }
                  />
                ))}
              </div>
            </section>

            <CartUpsellSection
              subtotal={selectedSubtotal || subtotal}
              tier={profile?.tier}
              tierPct={tierPct}
            />

            <CartRecommendations productIds={productIds} />
          </div>

          <CartSummaryPanel
            className="hidden lg:block"
            subtotal={selectedSubtotal}
            tierDisc={tierDisc}
            netBeforeVat={netBeforeVat}
            vat={vat}
            grand={grand}
            tier={profile?.tier}
            tierPct={tierPct}
            itemCount={selectedQty}
            user={user}
            onCheckout={goCheckout}
          />
        </div>
      )}

      {items.length === 0 && (
        <>
          <CartUpsellSection subtotal={0} tier={profile?.tier} tierPct={tierPct} />
          <CartRecommendations productIds={[]} title="แนะนำสำหรับคุณ" />
        </>
      )}

      {items.length > 0 && (
        <CartCheckoutBar
          grand={grand}
          itemCount={selectedQty}
          user={user}
          onCheckout={goCheckout}
        />
      )}
    </div>
  );
}
