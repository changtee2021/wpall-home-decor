export interface CustomerNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  category: string;
  is_read: boolean;
  created_at: string;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  order: "ออเดอร์",
  promo: "โปรโมชัน",
  claim: "เคลม",
  system: "ระบบ",
  wallet: "Wallet",
};

export function notificationCategoryLabel(category: string): string {
  return NOTIFICATION_CATEGORY_LABELS[category] ?? category;
}

export function notificationCategoryClass(category: string): string {
  switch (category) {
    case "order":
      return "bg-blue-50 text-blue-700";
    case "promo":
      return "bg-amber-50 text-amber-700";
    case "claim":
      return "bg-orange-50 text-orange-700";
    case "wallet":
      return "bg-emerald-50 text-emerald-700";
    case "system":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
