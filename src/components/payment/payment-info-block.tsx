import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { listBankAccounts, resolvePromptPayId, type PaymentInfo } from "@/lib/payment-fees";
import { buildPromptPayPayload, promptPayQrImageUrl } from "@/lib/promptpay";
import { fmtTHB } from "@/lib/pricing";

interface PaymentInfoBlockProps {
  info: PaymentInfo;
  /** Dynamic QR amount — omit for static biller-only QR */
  amount?: number;
  reference?: string;
  showQr?: boolean;
  showBanks?: boolean;
  showNotice?: boolean;
  compact?: boolean;
}

export function PaymentInfoBlock({
  info,
  amount,
  reference,
  showQr = true,
  showBanks = true,
  showNotice = true,
  compact = false,
}: PaymentInfoBlockProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const accounts = listBankAccounts(info);
  const promptpayId = resolvePromptPayId(info);

  const qrUrl = useMemo(() => {
    if (!showQr || !promptpayId) return null;
    try {
      const payload = buildPromptPayPayload(
        promptpayId,
        amount != null && amount > 0 ? amount : undefined,
      );
      return promptPayQrImageUrl(payload, compact ? 200 : 240);
    } catch {
      return null;
    }
  }, [showQr, promptpayId, amount, compact]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className={`space-y-4 ${compact ? "text-sm" : ""}`}>
      {info.name && (
        <div className="text-sm">
          <span className="text-muted-foreground">ชื่อบัญชี: </span>
          <span className="font-semibold">{info.name}</span>
        </div>
      )}

      {showQr && (
        <div className="rounded-xl border border-border bg-white p-4 text-center space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Thai QR Payment · PromptPay
          </div>
          {amount != null && amount > 0 && (
            <div className="text-2xl font-bold text-foreground">{fmtTHB(amount)}</div>
          )}
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="PromptPay QR"
              className="mx-auto rounded-lg border border-border"
              width={compact ? 200 : 240}
              height={compact ? 200 : 240}
            />
          ) : (
            <div className="text-sm text-destructive py-6">ไม่สามารถสร้าง QR ได้</div>
          )}
          {promptpayId && (
            <div className="text-xs text-muted-foreground">
              Biller ID:{" "}
              <button
                type="button"
                onClick={() => copy(promptpayId, "biller")}
                className="font-semibold text-primary inline-flex items-center gap-1"
              >
                {promptpayId}
                {copied === "biller" ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            </div>
          )}
          {reference && (
            <div className="text-xs text-muted-foreground">
              อ้างอิง:{" "}
              <button
                type="button"
                onClick={() => copy(reference, "ref")}
                className="font-semibold text-primary inline-flex items-center gap-1"
              >
                {reference}
                {copied === "ref" ? <Check className="size-3" /> : <Copy className="size-3" />}
              </button>
            </div>
          )}
        </div>
      )}

      {showBanks && accounts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            โอนธนาคาร
          </div>
          {accounts.map((acc) => (
            <div
              key={`${acc.bank}-${acc.account}`}
              className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm space-y-1"
            >
              <div className="font-semibold">{acc.bank}</div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {acc.type ? `บัญชี${acc.type}` : "เลขบัญชี"}
                </span>
                <button
                  type="button"
                  onClick={() => copy(acc.account.replace(/-/g, ""), acc.account)}
                  className="font-bold inline-flex items-center gap-1 hover:text-primary"
                >
                  {acc.account}
                  {copied === acc.account ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNotice && (
        <div className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
          <p>โปรดระวังมิจฉาชีพหลอกโอนเงิน — โอนเข้าชื่อบัญชีบริษัทนี้เท่านั้น</p>
          <p className="text-destructive/90">
            บริษัทไม่มีนโยบายให้โอนเข้าบัญชีส่วนบุคคลหรือจ่ายผ่านเซลล์โดยตรง
          </p>
          <p>หากโอนสำเร็จ กรุณาแจ้งหลักฐานการโอนเงินผ่านช่องทางการสั่งซื้อด้วยทุกครั้ง</p>
        </div>
      )}
    </div>
  );
}
