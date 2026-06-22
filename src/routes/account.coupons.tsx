import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { CouponCard, type CouponView } from "@/components/storefront/coupon-card";
import { useServerFn } from "@tanstack/react-start";
import { claimCoupon } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/coupons")({
  head: () => ({ meta: [{ title: "คูปองของฉัน · WP ALL" }] }),
  component: CouponsPage,
});

function CouponsPage() {
  const { user, loading } = useAuth();
  const [all, setAll] = useState<CouponView[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "usable" | "used">("all");
  const [code, setCode] = useState("");
  const claim = useServerFn(claimCoupon);

  const load = async () => {
    if (!user) return;
    const { data: cs } = await supabase.from("coupons").select("*").eq("is_active", true);
    setAll((cs ?? []) as CouponView[]);
    const { data: uc } = await supabase
      .from("user_coupons")
      .select("coupon_id, used_at")
      .eq("user_id", user.id);
    setMine(new Set((uc ?? []).map((x) => x.coupon_id)));
    setUsed(new Set((uc ?? []).filter((x) => x.used_at).map((x) => x.coupon_id)));
  };
  useEffect(() => {
    load();
  }, [user]);

  if (loading) return <AccountPageSkeleton variant="cards" />;
  if (!user) return <Navigate to="/login" replace />;

  const now = Date.now();
  const filtered = all.filter((c) => {
    const expired = c.expires_at && new Date(c.expires_at).getTime() < now;
    if (filter === "used") return used.has(c.id);
    if (filter === "usable") return mine.has(c.id) && !used.has(c.id) && !expired;
    return true;
  });

  const handleClaim = async (c: CouponView) => {
    try {
      await claim({ data: { code: c.code } });
      toast.success(`เก็บคูปอง ${c.title} แล้ว`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เก็บคูปองไม่สำเร็จ");
    }
  };

  const handleRedeemCode = async () => {
    if (!code.trim()) return;
    try {
      const res = await claim({ data: { code: code.trim() } });
      toast.success(`เก็บคูปอง ${res.title} แล้ว`);
      setCode("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ไม่พบคูปอง");
    }
  };

  return (
    <AccountPageShell title="คูปองของฉัน" icon={<Ticket className="size-6 text-amber-500" />}>
      <div className="bg-card border border-border rounded-2xl p-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="กรอกโค้ดคูปอง"
          className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm min-h-[44px]"
        />
        <button
          onClick={handleRedeemCode}
          className="bg-primary text-primary-foreground rounded-lg px-4 font-semibold text-sm min-h-[44px]"
        >
          แลก
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "usable", "used"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border min-h-[36px] ${
              filter === f
                ? "bg-foreground text-background border-foreground"
                : "border-border bg-card"
            }`}
          >
            {f === "all" ? "ทั้งหมด" : f === "usable" ? "ใช้ได้" : "ใช้แล้ว"}
          </button>
        ))}
      </div>

      <section>
        <div className="font-semibold mb-2">คูปองที่มี</div>
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
              ไม่มีคูปองในหมวดนี้
            </div>
          ) : (
            filtered.map((c) => (
              <CouponCard
                key={c.id}
                c={{ ...c, claimed: mine.has(c.id), used: used.has(c.id) }}
                onClaim={() => handleClaim(c)}
              />
            ))
          )}
        </div>
      </section>
    </AccountPageShell>
  );
}
