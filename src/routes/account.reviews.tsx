import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { RatingStars } from "@/components/storefront/rating-stars";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/reviews")({
  head: () => ({ meta: [{ title: "รีวิวของฉัน · WP ALL" }] }),
  component: ReviewsPage,
});

interface Review {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  product_name?: string;
  product_image?: string | null;
}

interface PendingReview {
  order_id: string;
  product_id: string;
  product_name: string;
}

function ReviewsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Review[]>([]);
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [draft, setDraft] = useState<Record<string, { rating: number; comment: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: rs } = await supabase
      .from("reviews")
      .select("id,product_id,rating,comment,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const rows = (rs ?? []) as Review[];
    const reviewedProductIds = new Set(rows.map((r) => r.product_id));

    if (rows.length) {
      const { data: prods } = await supabase
        .from("products")
        .select("id,name,image_url,images")
        .in(
          "id",
          rows.map((r) => r.product_id),
        );
      const m = new Map(
        (
          (prods ?? []) as {
            id: string;
            name: string;
            image_url: string | null;
            images: string[];
          }[]
        ).map((p) => [p.id, p]),
      );
      rows.forEach((r) => {
        const p = m.get(r.product_id);
        r.product_name = p?.name;
        r.product_image = (Array.isArray(p?.images) && p.images[0]) || p?.image_url || null;
      });
    }
    setItems(rows);

    const pend: PendingReview[] = [];
    const { data: doneOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "done");

    const orderIds = (doneOrders ?? []).map((o) => o.id);
    if (orderIds.length) {
      const { data: lineItems } = await supabase
        .from("order_items")
        .select("order_id, product_id, product_name")
        .in("order_id", orderIds);

      (lineItems ?? []).forEach((li) => {
        if (li.product_id && !reviewedProductIds.has(li.product_id)) {
          pend.push({
            order_id: li.order_id,
            product_id: li.product_id,
            product_name: li.product_name,
          });
        }
      });
    }
    setPending(pend);
  };

  useEffect(() => {
    load();
  }, [user]);

  const submitReview = async (p: PendingReview) => {
    if (!user) return;
    const d = draft[p.product_id] ?? { rating: 5, comment: "" };
    setBusy(p.product_id);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      product_id: p.product_id,
      order_id: p.order_id,
      rating: d.rating,
      comment: d.comment.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("บันทึกรีวิวแล้ว");
    load();
  };

  if (loading) return <AccountPageSkeleton variant="cards" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AccountPageShell title="รีวิวของฉัน" icon={<Star className="size-6 text-yellow-500" />}>
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm">รอเขียนรีวิว</h2>
          {pending.map((p) => {
            const d = draft[p.product_id] ?? { rating: 5, comment: "" };
            return (
              <div
                key={`${p.order_id}-${p.product_id}`}
                className="bg-card border border-border rounded-2xl p-4 space-y-3"
              >
                <div className="font-semibold text-sm">{p.product_name}</div>
                <RatingStars
                  value={d.rating}
                  onChange={(v) => setDraft({ ...draft, [p.product_id]: { ...d, rating: v } })}
                  interactive
                />
                <textarea
                  value={d.comment}
                  onChange={(e) =>
                    setDraft({ ...draft, [p.product_id]: { ...d, comment: e.target.value } })
                  }
                  placeholder="ความคิดเห็น (ไม่บังคับ)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                />
                <button
                  onClick={() => submitReview(p)}
                  disabled={busy === p.product_id}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm min-h-[44px] disabled:opacity-50"
                >
                  {busy === p.product_id ? "กำลังบันทึก..." : "ส่งรีวิว"}
                </button>
              </div>
            );
          })}
        </section>
      )}

      {items.length === 0 && pending.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          คุณยังไม่ได้เขียนรีวิว — รีวิวสินค้าที่สั่งเสร็จได้เมื่อออเดอร์สถานะสำเร็จ
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
              {r.product_image ? (
                <img
                  src={r.product_image}
                  alt=""
                  className="size-14 rounded-xl object-cover shrink-0 bg-muted"
                />
              ) : (
                <div className="size-14 rounded-xl bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{r.product_name ?? "สินค้า"}</div>
                  <RatingStars value={r.rating} />
                </div>
                {r.comment && <div className="text-sm text-muted-foreground mt-2">{r.comment}</div>}
                <div className="text-[10px] text-muted-foreground mt-2">
                  {new Date(r.created_at).toLocaleString("th-TH")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountPageShell>
  );
}
