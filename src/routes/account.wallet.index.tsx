import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { WalletPageSkeleton } from "@/components/loading";
import { WalletCard } from "@/components/wallet/wallet-card";
import { TransactionList } from "@/components/wallet/transaction-list";
import {
  getMyWallet,
  getMyTransactions,
  getMyTopups,
  type Wallet,
  type WalletTx,
  type TopupRequest,
} from "@/lib/wallet";
import { Clock, CheckCircle2, XCircle, Wallet as WalletIcon } from "lucide-react";
import { fmtTHB } from "@/lib/pricing";

export const Route = createFileRoute("/account/wallet/")({
  head: () => ({ meta: [{ title: "กระเป๋าเงินของฉัน · WP ALL" }] }),
  component: WalletPage,
});

const STATUS_META = {
  pending: { label: "รอตรวจสอบ", icon: Clock, color: "text-amber-600 bg-amber-50" },
  approved: { label: "เติมเงินสำเร็จ", icon: CheckCircle2, color: "text-success bg-success/10" },
  rejected: { label: "ถูกปฏิเสธ", icon: XCircle, color: "text-destructive bg-destructive/10" },
  cancelled: { label: "ยกเลิกแล้ว", icon: XCircle, color: "text-muted-foreground bg-muted" },
} as const;

const DEFAULT_STATUS = STATUS_META.pending;

function WalletPage() {
  const { user, loading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [tab, setTab] = useState<"tx" | "topup">("tx");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) return;
    try {
      const [w, txList, topupList] = await Promise.all([
        getMyWallet(user.id),
        getMyTransactions(user.id),
        getMyTopups(user.id),
      ]);
      setWallet(w);
      setTxs(txList);
      setTopups(topupList);
      setFetchError(null);
    } catch {
      setFetchError("โหลดข้อมูลกระเป๋าเงินไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [user]);

  if (loading) return <WalletPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AccountPageShell
      title="กระเป๋าเงินของฉัน"
      icon={<WalletIcon className="size-6 text-emerald-600" />}
    >
      {fetchError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      ) : null}

      <WalletCard balance={wallet?.balance ?? 0} totalTopup={wallet?.total_topup ?? 0} />

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("tx")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px min-h-[44px] ${
            tab === "tx"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          ธุรกรรม ({txs.length})
        </button>
        <button
          onClick={() => setTab("topup")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px min-h-[44px] ${
            tab === "topup"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          คำขอเติมเงิน ({topups.length})
        </button>
      </div>

      {tab === "tx" ? (
        <TransactionList items={txs} />
      ) : topups.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          ยังไม่มีคำขอเติมเงิน{" "}
          <Link to="/account/wallet/topup" className="text-primary font-semibold ml-1">
            เติมเงินทันที →
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {topups.map((t) => {
            const m = STATUS_META[t.status] ?? DEFAULT_STATUS;
            const Icon = m.icon;
            return (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center ${m.color}`}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {fmtTHB(Number(t.amount) || 0)} ·{" "}
                    {t.method === "bank_transfer"
                      ? "โอนธนาคาร"
                      : t.method === "promptpay"
                        ? "PromptPay"
                        : "บัตรเครดิต"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("th-TH")}
                    {t.rejected_reason && ` · เหตุผล: ${t.rejected_reason}`}
                  </div>
                </div>
                <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.color}`}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountPageShell>
  );
}
