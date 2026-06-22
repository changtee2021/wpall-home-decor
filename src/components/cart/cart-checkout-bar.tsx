import { fmtTHB } from "@/lib/pricing";
import { useCompareListOptional } from "@/hooks/use-compare-list";

export function CartCheckoutBar({
  grand,
  itemCount,
  user,
  onCheckout,
}: {
  grand: number;
  itemCount: number;
  user: unknown;
  onCheckout: () => void;
}) {
  const compare = useCompareListOptional();
  const compareOffset = compare && compare.count > 0 ? "7rem" : "3.5rem";

  return (
    <div
      className="fixed z-20 left-0 right-0 border-t border-border bg-card/95 backdrop-blur shadow-lg lg:hidden"
      style={{ bottom: `calc(${compareOffset} + env(safe-area-inset-bottom, 0px))` }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-screen-2xl mx-auto">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">รวมทั้งสิ้น</div>
          <div className="text-xl font-bold text-primary truncate">{fmtTHB(grand)}</div>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={itemCount === 0}
          className="shrink-0 bg-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold text-sm hover:opacity-90 disabled:opacity-50 min-h-[44px]"
        >
          {user ? `ชำระเงิน (${itemCount})` : "เข้าสู่ระบบ"}
        </button>
      </div>
    </div>
  );
}
