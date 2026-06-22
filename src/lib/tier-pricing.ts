import type { Tier } from "./tier";

export interface TierPrice {
  id?: string;
  product_id: string | null;
  category_id: string | null;
  tier: Tier;
  price_type: "fixed" | "discount_pct";
  value: number;
}

export const TIERS: Tier[] = ["bronze", "silver", "gold", "platinum", "vip"];

export function resolveLocalPrice(base: number, tp?: TierPrice | null) {
  if (!tp) return base;
  if (tp.price_type === "fixed") return tp.value;
  return Math.round(base * (1 - tp.value / 100) * 100) / 100;
}
