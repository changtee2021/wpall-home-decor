import { Link } from "@tanstack/react-router";
import { Wallet as WalletIcon, Plus, History } from "lucide-react";
import { fmtTHB } from "@/lib/pricing";

interface Props {
  balance: number;
  totalTopup?: number;
  compact?: boolean;
}

export function WalletCard({ balance, totalTopup, compact }: Props) {
  return (
    <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden bg-gradient-to-br from-primary via-primary to-orange-600 shadow-lg">
      <div className="absolute -right-8 -bottom-8 size-44 rounded-full bg-white/10" />
      <div className="absolute right-12 -top-6 size-24 rounded-full bg-white/10" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
          <WalletIcon className="size-4" /> WP Wallet
        </div>
        <div className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">{fmtTHB(balance)}</div>
        <div className="text-xs opacity-90 mt-1">ยอดเงินคงเหลือ</div>

        {!compact && (
          <>
            {typeof totalTopup === "number" && (
              <div className="mt-3 text-[11px] opacity-80">เติมเงินสะสม {fmtTHB(totalTopup)}</div>
            )}
            <div className="flex gap-2 mt-5">
              <Link
                to="/account/wallet/topup"
                className="inline-flex items-center gap-1.5 bg-white text-primary font-bold text-sm rounded-full px-4 py-2.5"
              >
                <Plus className="size-4" /> เติมเงิน
              </Link>
              <Link
                to="/account/wallet"
                className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-white font-semibold text-sm rounded-full px-4 py-2.5"
              >
                <History className="size-4" /> ประวัติ
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
