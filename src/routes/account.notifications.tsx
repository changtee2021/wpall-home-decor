import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Bell, CheckCheck } from "lucide-react";
import { AccountPageSkeleton } from "@/components/loading";
import {
  formatNotificationTime,
  notificationCategoryClass,
  NOTIFICATION_CATEGORY_LABELS,
  type CustomerNotification,
} from "@/lib/customer/notifications";

export const Route = createFileRoute("/account/notifications")({
  head: () => ({ meta: [{ title: "การแจ้งเตือน · WP ALL" }] }),
  component: NotificationsPage,
});

type NotifTab = "all" | "order" | "promo" | "system";

const TABS: { key: NotifTab; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "order", label: "ออเดอร์" },
  { key: "promo", label: "โปรโมชัน" },
  { key: "system", label: "ระบบ" },
];

const CATEGORY_LABELS = NOTIFICATION_CATEGORY_LABELS;

function matchesTab(category: string, tab: NotifTab): boolean {
  if (tab === "all") return true;
  if (tab === "order") return category === "order" || category === "claim" || category === "wallet";
  if (tab === "promo") return category === "promo";
  return category === "system" || !["order", "claim", "wallet", "promo"].includes(category);
}

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [tab, setTab] = useState<NotifTab>("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as CustomerNotification[]);
  };

  useEffect(() => {
    load();
  }, [user]);

  const filtered = useMemo(() => items.filter((n) => matchesTab(n.category, tab)), [items, tab]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    load();
  };

  const openNotif = async (n: CustomerNotification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link) {
      navigate({ to: n.link });
    }
  };

  if (loading) return <AccountPageSkeleton variant="cards" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AccountPageShell title="การแจ้งเตือน" icon={<Bell className="size-6 text-purple-500" />}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-2 rounded-full text-xs font-semibold min-h-[44px] ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex items-center gap-1 text-sm text-primary font-semibold min-h-[44px] px-2 self-end sm:self-auto"
        >
          <CheckCheck className="size-4" /> อ่านทั้งหมด
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          ยังไม่มีการแจ้งเตือนในหมวดนี้
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {filtered.map((n) => {
            const inner = (
              <>
                <div
                  className={`size-2 rounded-full mt-2 shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-sm">{n.title}</div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${notificationCategoryClass(n.category)}`}
                    >
                      {CATEGORY_LABELS[n.category] ?? n.category}
                    </span>
                  </div>
                  {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatNotificationTime(n.created_at)}
                  </div>
                </div>
              </>
            );

            if (n.link) {
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotif(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/40 transition-colors min-h-[44px] ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div
                key={n.id}
                className={`px-4 py-3 flex gap-3 ${!n.is_read ? "bg-primary/5" : ""}`}
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </AccountPageShell>
  );
}
