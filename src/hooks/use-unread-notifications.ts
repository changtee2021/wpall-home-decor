import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SUPABASE_SCHEMA } from "@/lib/erp-config";

export function useUnreadNotifications(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const refresh = async () => {
      const { count: c } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setCount(c ?? 0);
    };

    refresh();
    const channel = supabase
      .channel(`notif-count:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: SUPABASE_SCHEMA,
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
