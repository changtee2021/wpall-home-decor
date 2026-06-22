import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { TOPUP_PRESETS } from "@/lib/wallet";
import { fetchPaymentInfo } from "@/lib/payment-settings";
import { DEFAULT_PAYMENT_INFO, type PaymentInfo } from "@/lib/payment-fees";
import { PaymentInfoBlock } from "@/components/payment/payment-info-block";
import { Upload, Wallet as WalletIcon, Building2, QrCode, CreditCard } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { submitTopupRequest } from "@/lib/wallet.functions";
import { toast } from "sonner";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/wallet/topup")({
  head: () => ({ meta: [{ title: "เติมเงินกระเป๋า · WP ALL" }] }),
  component: TopupPage,
});

const METHODS = [
  { value: "bank_transfer", label: "โอนธนาคาร", icon: Building2 },
  { value: "promptpay", label: "PromptPay", icon: QrCode },
  { value: "credit_card", label: "บัตรเครดิต", icon: CreditCard },
] as const;

function TopupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const submitTopup = useServerFn(submitTopupRequest);
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<"bank_transfer" | "promptpay" | "credit_card">(
    "bank_transfer",
  );
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(DEFAULT_PAYMENT_INFO);

  useEffect(() => {
    fetchPaymentInfo()
      .then(setPaymentInfo)
      .catch(() => {});
  }, []);

  if (loading) return <AccountPageSkeleton variant="form" />;
  if (!user) return <Navigate to="/login" replace />;

  const submit = async () => {
    if (amount < 50) return toast.error("จำนวนขั้นต่ำ 50 บาท");
    if (method !== "credit_card" && !slipFile) return toast.error("กรุณาอัปโหลดสลิปการโอน");
    setBusy(true);
    try {
      let slip_url: string | null = null;
      if (slipFile) {
        const ext = slipFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("topup-slips").upload(path, slipFile);
        if (upErr) throw upErr;
        slip_url = path;
      }
      await submitTopup({
        data: {
          amount,
          method,
          slipUrl: slip_url,
          referenceNote: note || null,
        },
      });
      toast.success("ส่งคำขอเติมเงินเรียบร้อย รอแอดมินตรวจสอบ");
      navigate({ to: "/account/wallet" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPageShell
      title="เติมเงินกระเป๋า"
      description="เลือกจำนวน อัปโหลดสลิป รอแอดมินอนุมัติ"
      backTo="/account/wallet"
      backLabel="กระเป๋าเงิน"
      icon={<WalletIcon className="size-6 text-primary" />}
    >
      <div className="max-w-lg mx-auto w-full space-y-5">
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold">จำนวนเงิน (บาท)</div>
          <div className="grid grid-cols-3 gap-2">
            {TOPUP_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                  amount === v
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {v.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={50}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-lg font-bold text-center"
            placeholder="หรือระบุจำนวนเอง"
          />
        </section>

        {/* Method */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold">ช่องทางชำระ</div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                  method === m.value
                    ? "bg-primary/5 border-primary text-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <m.icon className="size-5" />
                {m.label}
              </button>
            ))}
          </div>

          {(method === "bank_transfer" || method === "promptpay") && (
            <PaymentInfoBlock
              info={paymentInfo}
              amount={amount}
              showQr={method === "promptpay"}
              showBanks={method === "bank_transfer"}
              compact
            />
          )}
          {method === "credit_card" && (
            <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground">
              * โหมดทดสอบ — ระบบบัตรเครดิตจริงจะเชื่อมต่อในขั้นถัดไป
            </div>
          )}
        </section>

        {/* Slip upload */}
        {method !== "credit_card" && (
          <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="text-sm font-semibold">แนบสลิปการโอน *</div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSlipFile(f);
                    setSlipPreview(URL.createObjectURL(f));
                  }
                }}
              />
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
                {slipPreview ? (
                  <img src={slipPreview} alt="สลิป" className="max-h-64 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="size-8 mx-auto text-muted-foreground" />
                    <div className="mt-2 text-sm font-semibold">คลิกเพื่ออัปโหลดสลิป</div>
                    <div className="text-xs text-muted-foreground mt-1">JPG, PNG (ไม่เกิน 5MB)</div>
                  </>
                )}
              </div>
            </label>
            <textarea
              placeholder="หมายเหตุ (ถ้ามี) เช่น เวลาที่โอน"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
            />
          </section>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-sm disabled:opacity-50 min-h-[44px]"
        >
          {busy ? "กำลังส่ง..." : `ยืนยันเติมเงิน ${amount.toLocaleString()} บาท`}
        </button>
      </div>
    </AccountPageShell>
  );
}
