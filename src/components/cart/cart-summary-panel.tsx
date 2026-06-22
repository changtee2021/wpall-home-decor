import { Link } from "@tanstack/react-router";
import { fmtTHB } from "@/lib/pricing";
import { TIER_INFO, type Tier } from "@/lib/tier";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function CartSummaryPanel({
  subtotal,
  tierDisc,
  netBeforeVat,
  vat,
  grand,
  tier,
  tierPct,
  itemCount,
  user,
  onCheckout,
  className = "",
}: {
  subtotal: number;
  tierDisc: number;
  netBeforeVat: number;
  vat: number;
  grand: number;
  tier?: Tier;
  tierPct: number;
  itemCount: number;
  user: unknown;
  onCheckout: () => void;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-5 h-fit sticky top-4 space-y-3 ${className}`}
    >
      <div className="font-semibold">สรุปคำสั่งซื้อ</div>
      {tier && (
        <div className="text-xs bg-muted/60 rounded-lg p-2">
          <div className="text-muted-foreground">สถานะสมาชิก</div>
          <div className="font-semibold">
            {TIER_INFO[tier].label} — ส่วนลด {(tierPct * 100).toFixed(0)}%
          </div>
        </div>
      )}
      <Line label="ยอดรวม" value={fmtTHB(subtotal)} />
      {tierDisc > 0 && <Line label="ส่วนลด Tier" value={`− ${fmtTHB(tierDisc)}`} />}
      <Line label="ก่อน VAT" value={fmtTHB(netBeforeVat)} />
      <Line label="VAT 7%" value={fmtTHB(vat)} />
      <div className="border-t border-border pt-3 flex justify-between items-baseline">
        <span className="text-sm font-semibold">รวมทั้งสิ้น</span>
        <span className="text-2xl font-bold text-primary">{fmtTHB(grand)}</span>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        disabled={itemCount === 0}
        className="w-full mt-3 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
      >
        {user ? `ไปชำระเงิน (${itemCount})` : "เข้าสู่ระบบเพื่อชำระเงิน"}
      </button>
      {!user && (
        <p className="text-[11px] text-muted-foreground text-center">
          ยังไม่มีบัญชี?{" "}
          <Link to="/signup" className="text-primary font-semibold">
            สมัครสมาชิก
          </Link>
        </p>
      )}
    </div>
  );
}
