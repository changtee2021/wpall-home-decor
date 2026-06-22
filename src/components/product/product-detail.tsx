import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { fmtTHB } from "@/lib/pricing";
import { useAuth } from "@/hooks/use-auth";
import { TIER_INFO, tierDiscount, type Tier } from "@/lib/tier";
import { resolveLocalPrice, type TierPrice } from "@/lib/tier-pricing";
import { useShopCart } from "@/hooks/use-shop-cart";
import { buildCartConfig } from "@/lib/cart.types";
import type { ShopeeProduct } from "@/components/storefront/product-card-shopee";
import { CompareToggleButton } from "@/components/storefront/compare-table";
import { compareItemFromShopee } from "@/lib/compare";
import { OrderPanelClean, MobileStickyCta } from "@/components/product/order-panel-clean";
import { ProductTabsClean } from "@/components/product/product-tabs-clean";

export interface PDProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  sku: string | null;
  unit: string;
  stock: number;
  sale_price: number;
  base_price: number;
  image_url: string | null;
  images: string[];
  badge: string | null;
  tags: string[];
  attributes: Record<string, unknown>;
  category_id: string | null;
}

export interface PDHotspot {
  id: string;
  pin_label: string;
  coord_x: number;
  coord_y: number;
  attribute_group_id: string;
  group?: PDAttrGroup | null;
}

export interface PDAttrGroup {
  id: string;
  name: string;
  display_type: string;
  options: PDAttrOption[];
}

export interface PDAttrOption {
  id: string;
  label: string;
  price_delta: number;
  swatch_color: string | null;
  image_url: string | null;
  group_id: string;
}

export interface PDData {
  product: PDProduct;
  hotspots: PDHotspot[];
  groups: PDAttrGroup[];
  tierPrices: TierPrice[];
  related: ShopeeProduct[];
}

export function ProductDetail({ data }: { data: PDData }) {
  const { product, hotspots, groups, tierPrices, related } = data;
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const { addItem } = useShopCart();

  const tier: Tier = profile?.tier ?? "bronze";
  const tierBadge = TIER_INFO[tier];

  const gallery = useMemo(() => {
    const arr: string[] = [];
    if (product.image_url) arr.push(product.image_url);
    for (const x of product.images ?? []) {
      if (typeof x === "string" && !arr.includes(x)) arr.push(x);
    }
    return arr;
  }, [product]);

  const [activeImg, setActiveImg] = useState(0);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(240);
  const [qty, setQty] = useState(1);
  const [salesMode, setSalesMode] = useState(false);
  const [override, setOverride] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [adding, setAdding] = useState(false);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) if (g.options[0]) init[g.id] = g.options[0].id;
    return init;
  });

  const attrs = (product.attributes ?? {}) as Record<string, unknown>;
  const isPerMeter = product.unit === "เมตร" || attrs.pricing === "per_meter";

  const tieredPrice = useMemo(() => {
    const tp =
      tierPrices.find((x) => x.product_id === product.id && x.tier === tier) ??
      tierPrices.find((x) => x.category_id === product.category_id && x.tier === tier) ??
      null;
    return resolveLocalPrice(product.sale_price, tp);
  }, [tierPrices, product, tier]);

  const upcharge = useMemo(() => {
    let s = 0;
    for (const g of groups) {
      const optId = selected[g.id];
      const opt = g.options.find((o) => o.id === optId);
      if (opt) s += Number(opt.price_delta || 0);
    }
    return s;
  }, [groups, selected]);

  const areaM2 = isPerMeter ? width / 100 : (width * height) / 10000;
  const unitPrice = isPerMeter
    ? tieredPrice * Math.max(width / 100, 0.01) + upcharge
    : tieredPrice * Math.max(areaM2, 1) + upcharge;
  const tierDisc = salesMode ? 0 : tierDiscount(tier);
  const hasTierPrice = tierPrices.some(
    (x) =>
      x.tier === tier && (x.product_id === product.id || x.category_id === product.category_id),
  );
  const tieredUnit = hasTierPrice ? unitPrice : unitPrice * (1 - tierDisc);
  const overridePct = salesMode ? Math.max(0, Math.min(50, Number(override) || 0)) : 0;
  const finalUnit = tieredUnit * (1 - overridePct / 100);
  const total = finalUnit * Math.max(1, qty);

  const weightPerUnit = Number(attrs.weight_kg ?? attrs.weight ?? 1.2);
  const perBox = Number(attrs.per_box ?? 4);
  const measure = isPerMeter ? Math.max(width / 100, 0.01) : Math.max(areaM2, 1);
  const totalWeight = weightPerUnit * measure * qty;
  const totalBoxes = Math.max(1, Math.ceil(qty / Math.max(1, perBox)));

  const stockBadge =
    product.stock > 10
      ? { label: "พร้อมส่ง", cls: "bg-success/15 text-success border-success/30" }
      : product.stock > 0
        ? {
            label: `เหลือ ${product.stock} ${product.unit}`,
            cls: "bg-amber-500/15 text-amber-700 border-amber-500/30",
          }
        : { label: "สั่งผลิต 7-14 วัน", cls: "bg-muted text-muted-foreground border-border" };

  const onSelectOption = (groupId: string, optionId: string) => {
    setSelected((s) => ({ ...s, [groupId]: optionId }));
  };

  const onAdd = async () => {
    const opts = groups.map((g) => {
      const o = g.options.find((x) => x.id === selected[g.id]);
      return { group: g.name, value: o?.label ?? "-", optionId: o?.id };
    });
    setAdding(true);
    try {
      await addItem.mutateAsync({
        productId: product.id,
        productName: product.name,
        config: buildCartConfig({
          widthCm: width,
          heightCm: isPerMeter ? 100 : height,
          qty,
          attributes: opts,
        }),
        qty,
        unitPrice: finalUnit,
        lineTotal: total,
        note: opts.length ? opts.map((o) => `${o.group}: ${o.value}`).join(" • ") : undefined,
      });
      toast.success("เพิ่มลงตะกร้าแล้ว");
      navigate({ to: "/cart" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เพิ่มตะกร้าไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  };

  const onQuote = () => {
    toast.success("บันทึกใบเสนอราคาเรียบร้อย", {
      description: `${product.name} · ${fmtTHB(total)} (${qty} ${product.unit})`,
    });
  };

  const panelProps = {
    product,
    groups,
    selected,
    onSelectOption,
    width,
    height,
    onWidthChange: setWidth,
    onHeightChange: setHeight,
    qty,
    onQtyChange: setQty,
    total,
    finalUnit,
    areaM2,
    totalWeight,
    totalBoxes,
    isPerMeter,
    hasTierPrice,
    tierBadgeLabel: tierBadge.label,
    tierBadgeColor: tierBadge.color,
    overridePct,
    stockBadge,
    showTierBadge: !!profile,
    showSalesMode: role === "admin",
    salesMode,
    onSalesModeChange: setSalesMode,
    customerName,
    onCustomerNameChange: setCustomerName,
    override,
    onOverrideChange: setOverride,
    onAdd,
    onQuote,
    adding,
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-0">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link to="/" className="hover:text-primary">
          หน้าแรก
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary">
          สินค้า
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.category}</span>
      </nav>

      {/* IKEA 3-col: thumbs+image | panel — gallery spans cols 1-2 on desktop */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8 lg:gap-10 items-start">
        <ProductGalleryClean
          productName={product.name}
          badge={product.badge}
          gallery={gallery}
          activeImg={activeImg}
          onActiveImgChange={setActiveImg}
          hotspots={hotspots}
          selected={selected}
          onSelectOption={onSelectOption}
        />

        <div className="hidden lg:block space-y-3">
          <CompareToggleButton
            item={compareItemFromShopee({
              id: product.id,
              slug: product.slug,
              name: product.name,
              image_url: product.image_url,
              sale_price: product.sale_price,
              base_price: product.base_price,
              category: product.category,
            })}
            className="w-full"
          />
          <OrderPanelClean {...panelProps} hideMobileCta={false} />
        </div>

        {/* Mobile: order panel without duplicate CTAs */}
        <div className="lg:hidden space-y-3">
          <CompareToggleButton
            item={compareItemFromShopee({
              id: product.id,
              slug: product.slug,
              name: product.name,
              image_url: product.image_url,
              sale_price: product.sale_price,
              base_price: product.base_price,
              category: product.category,
            })}
            className="w-full"
          />
          <OrderPanelClean {...panelProps} hideMobileCta />
        </div>
      </div>

      <ProductTabsClean
        product={product}
        attrs={attrs}
        weightPerUnit={weightPerUnit}
        perBox={perBox}
        tier={tier}
        tierBadgeLabel={tierBadge.label}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        related={related}
      />

      <MobileStickyCta total={total} qty={qty} onQtyChange={setQty} onAdd={onAdd} adding={adding} />
    </div>
  );
}
