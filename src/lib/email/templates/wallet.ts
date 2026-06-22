import { escapeHtml } from "@/lib/email.server";
import { emailLayout, appPublicUrlServer } from "@/lib/email/brand-layout";
import { formatMoney } from "@/lib/email/order-data";

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "โอนธนาคาร",
  promptpay: "PromptPay",
  credit_card: "บัตรเครดิต",
};

export function buildTopupSubmittedCustomerEmail(opts: {
  amount: number;
  method: string;
  customerName?: string | null;
}): string {
  const greeting = opts.customerName
    ? `สวัสดีคุณ${escapeHtml(opts.customerName)},`
    : "สวัสดีค่ะ/ครับ,";
  const body = `
    <p>${greeting}</p>
    <p>เราได้รับ<strong>คำขอเติมเงิน WP Wallet</strong>ของคุณแล้ว</p>
    <p style="background:#f8fafc;border-radius:8px;padding:12px;font-size:13px;">
      <strong>จำนวน:</strong> ฿${formatMoney(opts.amount)}<br/>
      <strong>ช่องทาง:</strong> ${escapeHtml(METHOD_LABELS[opts.method] ?? opts.method)}<br/>
      <strong>สถานะ:</strong> รอแอดมินตรวจสอบ (1–2 วันทำการ)
    </p>
  `;
  return emailLayout({
    title: "รับคำขอเติมเงินแล้ว",
    subtitle: "WP Wallet",
    bodyHtml: body,
    ctaLabel: "ดูกระเป๋าเงิน",
    ctaUrl: `${appPublicUrlServer()}/account/wallet`,
  });
}

export function buildTopupSubmittedAdminEmail(opts: {
  amount: number;
  method: string;
  customerName?: string | null;
  customerEmail?: string | null;
}): string {
  const body = `
    <p>มีคำขอเติมเงิน Wallet ใหม่</p>
    <p style="font-size:13px;">
      <strong>ลูกค้า:</strong> ${escapeHtml(opts.customerName ?? opts.customerEmail ?? "—")}<br/>
      <strong>จำนวน:</strong> ฿${formatMoney(opts.amount)}<br/>
      <strong>ช่องทาง:</strong> ${escapeHtml(METHOD_LABELS[opts.method] ?? opts.method)}
    </p>
  `;
  return emailLayout({
    title: "คำขอเติมเงิน Wallet",
    subtitle: `฿${formatMoney(opts.amount)}`,
    bodyHtml: body,
    ctaLabel: "ตรวจสอบในแอดมิน",
    ctaUrl: `${appPublicUrlServer()}/admin/topups`,
  });
}

export function buildTopupApprovedEmail(opts: {
  amount: number;
  balance: number;
  customerName?: string | null;
}): string {
  const greeting = opts.customerName
    ? `สวัสดีคุณ${escapeHtml(opts.customerName)},`
    : "สวัสดีค่ะ/ครับ,";
  const body = `
    <p>${greeting}</p>
    <p><strong>เติมเงิน WP Wallet สำเร็จแล้ว</strong></p>
    <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:13px;">
      <strong>ยอดที่เติม:</strong> ฿${formatMoney(opts.amount)}<br/>
      <strong>ยอดคงเหลือ:</strong> ฿${formatMoney(opts.balance)}
    </p>
  `;
  return emailLayout({
    title: "เติมเงินสำเร็จ",
    subtitle: "WP Wallet",
    bodyHtml: body,
    ctaLabel: "ใช้ Wallet ชำระออเดอร์",
    ctaUrl: `${appPublicUrlServer()}/products`,
  });
}

export function buildTopupRejectedEmail(opts: {
  amount: number;
  reason: string;
  customerName?: string | null;
}): string {
  const greeting = opts.customerName
    ? `สวัสดีคุณ${escapeHtml(opts.customerName)},`
    : "สวัสดีค่ะ/ครับ,";
  const body = `
    <p>${greeting}</p>
    <p>ขออภัย — <strong>ไม่สามารถอนุมัติคำขอเติมเงิน</strong> ฿${formatMoney(opts.amount)} ได้</p>
    <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;color:#991b1b;font-size:13px;">
      <strong>เหตุผล:</strong> ${escapeHtml(opts.reason || "สลิปไม่ชัดหรือยอดไม่ตรง")}
    </p>
    <p style="font-size:13px;">กรุณาส่งคำขอใหม่หรือติดต่อ info@wpallin1.com</p>
  `;
  return emailLayout({
    title: "ไม่สามารถเติมเงินได้",
    subtitle: "WP Wallet",
    bodyHtml: body,
    ctaLabel: "เติมเงินใหม่",
    ctaUrl: `${appPublicUrlServer()}/account/wallet/topup`,
  });
}
