import { Link, useRouter } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { supabase } from "@/integrations/supabase/client";
import {
  formatNotificationTime,
  notificationCategoryClass,
  notificationCategoryLabel,
  type CustomerNotification,
} from "@/lib/customer/notifications";
import { SUPABASE_SCHEMA } from "@/lib/erp-config";

const PREVIEW_LIMIT = 8;

export function NotificationBellPopover() {
  const { user } = useAuth();
  const router = useRouter();
  const unread = useUnreadNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,link,category,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PREVIEW_LIMIT);
    setItems((data ?? []) as CustomerNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user || !open) return;

    void load();
    const channel = supabase
      .channel(`notif-popover:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: SUPABASE_SCHEMA,
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, open, load]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const openNotif = async (n: CustomerNotification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.link) {
      void router.history.push(n.link);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center size-10 rounded-full bg-card border border-border hover:bg-accent transition-colors shrink-0"
          aria-label="การแจ้งเตือน"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,22rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <div className="font-semibold text-sm">การแจ้งเตือน</div>
            {unread > 0 && (
              <div className="text-[11px] text-muted-foreground">{unread} ยังไม่ได้อ่าน</div>
            )}
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
            >
              <CheckCheck className="size-3.5" />
              อ่านทั้งหมด
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              กำลังโหลด...
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีการแจ้งเตือน
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openNotif(n)}
                    className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-muted/50 transition-colors ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-medium text-sm leading-snug line-clamp-1">
                          {n.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${notificationCategoryClass(n.category)}`}
                        >
                          {notificationCategoryLabel(n.category)}
                        </span>
                      </span>
                      {n.body && (
                        <span className="block text-xs text-muted-foreground line-clamp-2">
                          {n.body}
                        </span>
                      )}
                      <span className="block text-[10px] text-muted-foreground mt-1">
                        {formatNotificationTime(n.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2.5">
          <Link
            to="/account/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-semibold text-primary hover:underline py-1"
          >
            ดูการแจ้งเตือนทั้งหมด →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
