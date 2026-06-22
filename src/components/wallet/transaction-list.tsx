import { ArrowDownLeft, ArrowUpRight, RefreshCw, Settings2 } from "lucide-react";
import { fmtTHB } from "@/lib/pricing";
import type { WalletTx } from "@/lib/wallet";

const TYPE_META = {
  topup: { label: "เติมเงิน", icon: ArrowDownLeft, color: "text-success", sign: "+" },
  payment: { label: "ชำระค่าสินค้า", icon: ArrowUpRight, color: "text-destructive", sign: "-" },
  refund: { label: "คืนเงิน", icon: RefreshCw, color: "text-success", sign: "+" },
  adjust: { label: "ปรับยอดโดยแอดมิน", icon: Settings2, color: "text-muted-foreground", sign: "" },
} as const;

export function TransactionList({ items }: { items: WalletTx[] }) {
  if (items.length === 0)
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
        ยังไม่มีรายการธุรกรรม
      </div>
    );

  return (
    <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
      {items.map((tx) => {
        const m = TYPE_META[tx.type];
        const Icon = m.icon;
        return (
          <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
            <div
              className={`size-10 rounded-xl flex items-center justify-center bg-muted ${m.color}`}
            >
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{m.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {tx.note ?? "—"} · {new Date(tx.created_at).toLocaleString("th-TH")}
              </div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${m.color}`}>
                {m.sign}
                {fmtTHB(Math.abs(tx.amount))}
              </div>
              <div className="text-[10px] text-muted-foreground">
                คงเหลือ {fmtTHB(tx.balance_after)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
