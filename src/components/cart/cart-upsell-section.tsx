import { PromoCardGrid } from "@/components/storefront/promo-card-grid";
import { CouponStrip } from "@/components/storefront/coupon-strip";
import { TIER_INFO } from "@/lib/tier";
import { fmtTHB } from "@/lib/pricing";
import type { Tier } from "@/lib/tier";

export function CartUpsellSection({
  subtotal,
  tier,
  tierPct,
}: {
  subtotal: number;
  tier?: Tier;
  tierPct: number;
}) {
  return (
    <section className="space-y-5 rounded-2xl bg-muted/30 border border-border/60 p-4 sm:p-5">
      {tier && tierPct > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 px-4 py-3">
          <div className="text-sm font-semibold">
            สมาชิก {TIER_INFO[tier].label} — ลด {(tierPct * 100).toFixed(0)}% อัตโนมัติเมื่อชำระเงิน
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            ประหยัดได้ประมาณ {fmtTHB(subtotal * tierPct)} จากยอดปัจจุบัน
          </div>
        </div>
      )}

      <CouponStrip subtotal={subtotal} compact />

      <div className="lg:hidden">
        <PromoCardGrid layout="scroll" />
      </div>
      <div className="hidden lg:block">
        <PromoCardGrid layout="grid" />
      </div>
    </section>
  );
}
