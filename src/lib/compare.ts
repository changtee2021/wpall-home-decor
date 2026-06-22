import { fmtTHB } from "@/lib/pricing";
import { tierDiscount, type Tier } from "@/lib/tier";
import { resolveLocalPrice, type TierPrice } from "@/lib/tier-pricing";
import type { PDAttrGroup } from "@/components/product/product-detail";

export const MAX_COMPARE = 4;
export const COMPARE_STORAGE_KEY = "wpall-compare";

/** Reference dimensions for fair price comparison */
export const REF_WIDTH_CM = 200;
export const REF_HEIGHT_CM = 240;

export interface CompareItem {
  id: string;
  slug?: string | null;
  name: string;
  image_url?: string | null;
  sale_price: number;
  base_price?: number | null;
  category?: string | null;
}

export interface CompareProduct {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  category_id: string | null;
  description: string | null;
  sku: string | null;
  unit: string;
  stock: number;
  sale_price: number;
  base_price: number;
  image_url: string | null;
  badge: string | null;
  tags: string[];
  attributes: Record<string, unknown>;
  kind: string;
}

export interface CompareStockBadge {
  label: string;
  cls: string;
}

export interface CompareRow {
  key: string;
  label: string;
  values: (string | null)[];
  highlightLowest?: boolean;
}

const RESERVED_ATTR_KEYS = new Set(["weight_kg", "weight", "per_box", "features", "pricing"]);

export function parseCompareIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => UUID_RE.test(id))
    .slice(0, MAX_COMPARE);
}

export function loadCompareFromStorage(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function saveCompareToStorage(items: CompareItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_COMPARE)));
  } catch {
    /* ignore quota errors */
  }
}

export function compareItemFromShopee(p: {
  id: string;
  slug?: string | null;
  name: string;
  image_url?: string | null;
  sale_price: number;
  base_price?: number | null;
  category?: string | null;
}): CompareItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image_url: p.image_url,
    sale_price: p.sale_price,
    base_price: p.base_price,
    category: p.category,
  };
}

export function getStockBadge(stock: number, unit: string): CompareStockBadge {
  if (stock > 10) {
    return { label: "พร้อมส่ง", cls: "bg-success/15 text-success border-success/30" };
  }
  if (stock > 0) {
    return {
      label: `เหลือ ${stock} ${unit}`,
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    };
  }
  return { label: "สั่งผลิต 7-14 วัน", cls: "bg-muted text-muted-foreground border-border" };
}

export function isPerMeterProduct(unit: string, attrs: Record<string, unknown>): boolean {
  return unit === "เมตร" || attrs.pricing === "per_meter";
}

export function defaultSelectedOptions(groups: PDAttrGroup[]): Record<string, string> {
  const init: Record<string, string> = {};
  for (const g of groups) {
    if (g.options[0]) init[g.id] = g.options[0].id;
  }
  return init;
}

export function computeUpcharge(groups: PDAttrGroup[], selected: Record<string, string>): number {
  let s = 0;
  for (const g of groups) {
    const optId = selected[g.id];
    const opt = g.options.find((o) => o.id === optId);
    if (opt) s += Number(opt.price_delta || 0);
  }
  return s;
}

export function computeRefPrice(
  product: CompareProduct,
  groups: PDAttrGroup[],
  tierPrices: TierPrice[],
  tier: Tier,
): number {
  const attrs = product.attributes ?? {};
  const isPerMeter = isPerMeterProduct(product.unit, attrs);
  const selected = defaultSelectedOptions(groups);
  const upcharge = computeUpcharge(groups, selected);

  const tp =
    tierPrices.find((x) => x.product_id === product.id && x.tier === tier) ??
    tierPrices.find((x) => x.category_id === product.category_id && x.tier === tier) ??
    null;

  const tieredPrice = resolveLocalPrice(product.sale_price, tp);
  const hasTierPrice = tierPrices.some(
    (x) =>
      x.tier === tier && (x.product_id === product.id || x.category_id === product.category_id),
  );

  const areaM2 = isPerMeter ? REF_WIDTH_CM / 100 : (REF_WIDTH_CM * REF_HEIGHT_CM) / 10000;
  const unitPrice = isPerMeter
    ? tieredPrice * Math.max(REF_WIDTH_CM / 100, 0.01) + upcharge
    : tieredPrice * Math.max(areaM2, 1) + upcharge;

  const tierDisc = tierDiscount(tier);
  const tieredUnit = hasTierPrice ? unitPrice : unitPrice * (1 - tierDisc);
  return Math.round(tieredUnit * 100) / 100;
}

function lowestIndices(nums: (number | null)[]): Set<number> {
  const valid = nums
    .map((n, i) => (n != null && n > 0 ? { n, i } : null))
    .filter((x): x is { n: number; i: number } => x != null);
  if (valid.length === 0) return new Set();
  const min = Math.min(...valid.map((x) => x.n));
  return new Set(valid.filter((x) => x.n === min).map((x) => x.i));
}

export function buildCompareRows(
  products: CompareProduct[],
  groupsByProduct: Map<string, PDAttrGroup[]>,
  _refPrices: number[],
): CompareRow[] {
  const rows: CompareRow[] = [];

  rows.push({
    key: "sale_price",
    label: "ราคาขาย",
    values: products.map((p) => {
      const hasDiscount = p.base_price > p.sale_price;
      const off = hasDiscount ? Math.round((1 - p.sale_price / p.base_price) * 100) : 0;
      const parts = [fmtTHB(p.sale_price)];
      if (hasDiscount) parts.push(`เดิม ${fmtTHB(p.base_price)} (-${off}%)`);
      return parts.join(" · ");
    }),
    highlightLowest: true,
  });

  rows.push({
    key: "ref_price",
    label: `ราคาอ้างอิง (${REF_WIDTH_CM}×${REF_HEIGHT_CM} ซม.)`,
    values: products.map((p, i) => {
      const attrs = p.attributes ?? {};
      const perM = isPerMeterProduct(p.unit, attrs);
      const dimLabel = perM
        ? `กว้าง ${REF_WIDTH_CM / 100} ม.`
        : `${REF_WIDTH_CM}×${REF_HEIGHT_CM} ซม.`;
      return `${fmtTHB(_refPrices[i] ?? 0)} (${dimLabel})`;
    }),
    highlightLowest: true,
  });

  rows.push({
    key: "stock",
    label: "สถานะสต็อก",
    values: products.map((p) => getStockBadge(p.stock, p.unit).label),
  });

  rows.push({
    key: "sku",
    label: "รหัสสินค้า (SKU)",
    values: products.map((p) => p.sku ?? "—"),
  });

  rows.push({
    key: "unit",
    label: "หน่วยนับ",
    values: products.map((p) => p.unit),
  });

  rows.push({
    key: "weight",
    label: "น้ำหนักต่อหน่วย",
    values: products.map((p) => {
      const attrs = p.attributes ?? {};
      const w = Number(attrs.weight_kg ?? attrs.weight ?? 1.2);
      return `${w.toFixed(2)} kg`;
    }),
  });

  rows.push({
    key: "per_box",
    label: "จำนวนต่อกล่อง",
    values: products.map((p) => {
      const attrs = p.attributes ?? {};
      const perBox = Number(attrs.per_box ?? 4);
      return `${perBox} ${p.unit}`;
    }),
  });

  const allFeatures = new Set<string>();
  for (const p of products) {
    const feats = (p.attributes?.features ?? []) as unknown;
    if (Array.isArray(feats)) {
      for (const f of feats) if (typeof f === "string") allFeatures.add(f);
    }
  }
  for (const feat of allFeatures) {
    rows.push({
      key: `feat_${feat}`,
      label: feat,
      values: products.map((p) => {
        const feats = (p.attributes?.features ?? []) as unknown;
        if (!Array.isArray(feats)) return "—";
        return feats.includes(feat) ? "✓" : "—";
      }),
    });
  }

  const attrKeys = new Set<string>();
  for (const p of products) {
    for (const [k] of Object.entries(p.attributes ?? {})) {
      if (!RESERVED_ATTR_KEYS.has(k)) attrKeys.add(k);
    }
  }
  for (const key of attrKeys) {
    rows.push({
      key: `attr_${key}`,
      label: key,
      values: products.map((p) => {
        const v = (p.attributes ?? {})[key];
        return v != null && v !== "" ? String(v) : "—";
      }),
    });
  }

  const groupNames = new Set<string>();
  for (const groups of groupsByProduct.values()) {
    for (const g of groups) groupNames.add(g.name);
  }
  for (const name of groupNames) {
    rows.push({
      key: `grp_${name}`,
      label: name,
      values: products.map((p) => {
        const groups = groupsByProduct.get(p.id) ?? [];
        const g = groups.find((x) => x.name === name);
        if (!g) return "—";
        return `${g.options.length} ตัวเลือก`;
      }),
    });
  }

  if (products.some((p) => p.tags.length > 0)) {
    rows.push({
      key: "tags",
      label: "แท็ก",
      values: products.map((p) => (p.tags.length ? p.tags.join(", ") : "—")),
    });
  }

  return rows;
}

export function getLowestPriceIndices(products: CompareProduct[]): Set<number> {
  return lowestIndices(products.map((p) => p.sale_price));
}

export function getLowestRefIndices(refPrices: number[]): Set<number> {
  return lowestIndices(refPrices);
}
