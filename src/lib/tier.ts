export type Tier = "bronze" | "silver" | "gold" | "platinum" | "vip";

export const TIER_INFO: Record<
  Tier,
  { label: string; color: string; discount: number; min: number }
> = {
  bronze: { label: "Bronze", color: "#b87333", discount: 0, min: 0 },
  silver: { label: "Silver", color: "#9aa0a6", discount: 0.03, min: 30000 },
  gold: { label: "Gold", color: "#d4a017", discount: 0.05, min: 100000 },
  platinum: { label: "Platinum", color: "#5e6c84", discount: 0.08, min: 300000 },
  vip: { label: "VIP", color: "#7c3aed", discount: 0.12, min: Infinity },
};

export const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "platinum"];

export function nextTier(t: Tier): Tier | null {
  const i = TIER_ORDER.indexOf(t);
  if (i === -1 || i === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[i + 1];
}

export function tierDiscount(t: Tier): number {
  return TIER_INFO[t].discount;
}
