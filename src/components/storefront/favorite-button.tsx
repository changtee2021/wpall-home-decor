import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, type MouseEvent } from "react";
import { toast } from "sonner";

/** Toggle product favorite — stops click propagation for use inside Link cards. */
export function FavoriteButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoriteId(null);
      return;
    }
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle()
      .then(({ data }) => setFavoriteId(data?.id ?? null));
  }, [user, productId]);

  const toggle = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("เข้าสู่ระบบเพื่อบันทึกรายการโปรด");
      return;
    }
    setBusy(true);
    try {
      if (favoriteId) {
        const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
        if (error) throw error;
        setFavoriteId(null);
        toast.success("ลบออกจากรายการโปรดแล้ว");
      } else {
        const { data, error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId })
          .select("id")
          .single();
        if (error) throw error;
        setFavoriteId(data.id);
        toast.success("เพิ่มในรายการโปรดแล้ว");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favoriteId ? "ลบจากรายการโปรด" : "เพิ่มในรายการโปรด"}
      className={`z-10 flex size-9 items-center justify-center min-h-[44px] min-w-[44px] disabled:opacity-50 ${className}`}
    >
      <Heart
        className={`size-4 ${favoriteId ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
      />
    </button>
  );
}
