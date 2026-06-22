import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock, PackageCheck, RotateCcw, Truck } from "lucide-react";

/** Hub / orders tab filter keys (Shopee-style 5 buckets). */
export type HubStatusKey = "pending_payment" | "preparing" | "shipped" | "done" | "cancelled";

export interface HubStatusItem {
  key: HubStatusKey;
  label: string;
  icon: LucideIcon;
}

export const HUB_ORDER_STATUS: HubStatusItem[] = [
  { key: "pending_payment", label: "รอชำระ", icon: Clock },
  { key: "preparing", label: "กำลังเตรียม", icon: PackageCheck },
  { key: "shipped", label: "กำลังจัดส่ง", icon: Truck },
  { key: "done", label: "สำเร็จ", icon: CheckCircle2 },
  { key: "cancelled", label: "ยกเลิก/คืนเงิน", icon: RotateCcw },
];

/** DB order.status values mapped to each hub bucket. */
export const HUB_STATUS_TO_DB: Record<HubStatusKey, readonly string[]> = {
  pending_payment: ["pending_payment"],
  preparing: ["paid", "producing"],
  shipped: ["shipped"],
  done: ["done"],
  cancelled: ["cancelled"],
};

const ALL_HUB_KEYS = new Set<string>(Object.keys(HUB_STATUS_TO_DB));

export function isHubStatusKey(value: string | undefined): value is HubStatusKey {
  return value !== undefined && ALL_HUB_KEYS.has(value);
}

export function orderMatchesHubStatus(dbStatus: string, hubKey: HubStatusKey): boolean {
  return HUB_STATUS_TO_DB[hubKey].includes(dbStatus);
}

export function filterOrdersByHubStatus<T extends { status: string }>(
  orders: T[],
  hubKey: HubStatusKey | undefined,
): T[] {
  if (!hubKey) return orders;
  return orders.filter((o) => orderMatchesHubStatus(o.status, hubKey));
}

export function countOrdersByHubStatus(
  orders: readonly { status: string }[],
): Record<HubStatusKey, number> {
  const counts: Record<HubStatusKey, number> = {
    pending_payment: 0,
    preparing: 0,
    shipped: 0,
    done: 0,
    cancelled: 0,
  };
  for (const o of orders) {
    for (const hub of HUB_ORDER_STATUS) {
      if (orderMatchesHubStatus(o.status, hub.key)) {
        counts[hub.key]++;
        break;
      }
    }
  }
  return counts;
}

/** Precise DB status labels for list/detail badges. */
export const ORDER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "ฉบับร่าง", cls: "bg-muted text-foreground" },
  pending_payment: { label: "รอชำระเงิน", cls: "bg-secondary text-secondary-foreground" },
  paid: { label: "ชำระแล้ว", cls: "bg-success text-success-foreground" },
  producing: { label: "กำลังผลิต", cls: "bg-primary text-primary-foreground" },
  shipped: { label: "จัดส่งแล้ว", cls: "bg-accent text-accent-foreground" },
  done: { label: "เสร็จสิ้น", cls: "bg-success text-success-foreground" },
  cancelled: { label: "ยกเลิก", cls: "bg-destructive/20 text-destructive" },
};

export function orderStatusMeta(status: string) {
  return (
    ORDER_STATUS_LABELS[status] ?? {
      label: status,
      cls: "bg-muted text-foreground",
    }
  );
}
