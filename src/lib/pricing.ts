import type { CurtainConfig, PriceBreakdown, Product } from "./types";
import { fabrics, tracks, accessories } from "./mock/fabrics";

export const VAT_RATE = 0.07;

export const curtainTypeLabels: Record<string, string> = {
  s_fold: "ม่านลอน (S-Fold)",
  pinch_pleat: "ม่านจีบ (Pinch Pleat)",
  eyelet: "ม่านตาไก่ (Eyelet)",
  roman: "ม่านพับ (Roman)",
};

export const trackTypeLabels: Record<string, string> = {
  show: "รางโชว์",
  concealed: "รางเอ็มซ่อน",
  motorized: "รางมอเตอร์",
};

export function calcPrice(config: CurtainConfig, product: Product): PriceBreakdown {
  const fabric = fabrics.find((f) => f.id === config.fabricId) ?? fabrics[0];
  const track = tracks.find((t) => t.id === config.trackId) ?? tracks[0];

  // Fabric calculation: width * fullness, then divide by roll width to know rolls needed,
  // but for simplicity we charge by meters of fabric used along the rail.
  const widthM = Math.max(config.widthCm, 30) / 100;
  const heightM = Math.max(config.heightCm, 30) / 100;
  // total fabric length needed (m of fabric off the roll, where roll width = rollWidthCm)
  const totalWidthRequired = widthM * config.fullness; // meters along the rail × fullness
  const rolls = Math.ceil(totalWidthRequired / (fabric.rollWidthCm / 100));
  const fabricMeters = +(rolls * (heightM + 0.3)).toFixed(2); // +30cm hem allowance
  const fabricCost = fabricMeters * fabric.pricePerMeter;
  const fabricCostRaw = fabricMeters * fabric.costPerMeter;

  const trackMeters = +(widthM + 0.2).toFixed(2);
  const trackCost = trackMeters * track.pricePerMeter;
  const trackCostRaw = trackMeters * track.costPerMeter;

  const accs = accessories.filter((a) => config.accessoryIds.includes(a.id));
  const accessoriesCost = accs.reduce((s, a) => s + a.price, 0);
  const accessoriesCostRaw = accs.reduce((s, a) => s + a.cost, 0);

  const panels = Math.max(1, Math.ceil(widthM / 1.5));
  const labor = panels * product.laborPerPanel;
  const laborRaw = labor * 0.4;

  const qty = Math.max(1, config.quantity);
  const subtotal = (fabricCost + trackCost + accessoriesCost + labor) * qty;
  const costSubtotal = (fabricCostRaw + trackCostRaw + accessoriesCostRaw + laborRaw) * qty;

  return {
    fabricMeters,
    fabricCost: +fabricCost.toFixed(2),
    trackMeters,
    trackCost: +trackCost.toFixed(2),
    accessoriesCost,
    labor,
    subtotal: +subtotal.toFixed(2),
    costSubtotal: +costSubtotal.toFixed(2),
  };
}

export function fmtTHB(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Compact sold count for product cards — e.g. 1200 → "1.2k", 15000 → "15k" */
export function fmtSoldK(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  if (n >= 10_000) return `${Math.round(k)}k`;
  const rounded = Math.round(k * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}k` : `${rounded}k`;
}

export function defaultConfigFor(product: Product): CurtainConfig {
  return {
    widthCm: 200,
    heightCm: 240,
    curtainType: product.curtainType,
    fullness: 2.5,
    fabricId: product.defaultFabricId,
    trackId: product.defaultTrackId,
    accessoryIds: ["a1"],
    quantity: 1,
  };
}
