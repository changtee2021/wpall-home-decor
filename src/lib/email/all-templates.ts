import { escapeHtml } from "@/lib/email.server";
import { emailLayout } from "@/lib/email/brand-layout";
import { buildContactAutoReplyEmail } from "@/lib/email/templates/contact";
import {
  buildAdminNewOrderEmail,
  buildAdminSlipEmail,
  buildQuotationEmail,
  buildReceiptEmail,
  buildSlipReceivedEmail,
  buildSlipRejectedEmail,
  buildStatusEmail,
} from "@/lib/email/templates/order";
import {
  buildTopupApprovedEmail,
  buildTopupRejectedEmail,
  buildTopupSubmittedAdminEmail,
  buildTopupSubmittedCustomerEmail,
} from "@/lib/email/templates/wallet";
import {
  SAMPLE_CUSTOMER_NAME,
  SAMPLE_TOPUP_AMOUNT,
  SAMPLE_WALLET_BALANCE,
  sampleFullOrder,
} from "@/lib/email/sample-data";
import confirmSignupRaw from "../../../docs/supabase/email-templates/confirm-signup.html?raw";
import resetPasswordRaw from "../../../docs/supabase/email-templates/reset-password.html?raw";

export type EmailPreviewEntry = {
  id: string;
  group: "auth" | "order" | "wallet" | "contact";
  groupLabel: string;
  label: string;
  subject: string;
  html: string;
};

function authPreviewHtml(raw: string): string {
  const demoUrl = "https://wpall-home-decor.vercel.app/verify-email?token=demo-preview";
  return raw
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, demoUrl)
    .replace(/\{\{\s*\.SiteURL\s*\}\}/g, "https://wpall-home-decor.vercel.app")
    .replace(/\{\{\s*\.Email\s*\}\}/g, "demo@example.com");
}

function buildContactAdminEmail(): string {
  const body = `
    <p>มีข้อความจากหน้าติดต่อ</p>
    <p style="font-size:13px;background:#f8fafc;border-radius:8px;padding:12px;">
      <strong>ชื่อ:</strong> ${escapeHtml(SAMPLE_CUSTOMER_NAME)}<br/>
      <strong>อีเมล:</strong> demo@example.com<br/>
      <strong>โทร:</strong> 081-234-5678<br/>
      <strong>ข้อความ:</strong><br/>
      ${escapeHtml("สนใจม่าน Blackout ห้องนอน ขอใบเสนอราคา").replace(/\n/g, "<br>")}
    </p>
  `;
  return emailLayout({
    title: "ข้อความติดต่อใหม่",
    subtitle: "Contact form",
    bodyHtml: body,
  });
}

export function getAllEmailPreviews(): EmailPreviewEntry[] {
  const orderPending = sampleFullOrder("pending_payment");
  const orderPaid = sampleFullOrder("paid");
  const num = orderPending.order.order_number!;

  const statusEntries = (["producing", "shipped", "done", "cancelled"] as const).map((status) => {
    const data = sampleFullOrder(status);
    const titles: Record<string, string> = {
      producing: "เริ่มผลิตแล้ว",
      shipped: "จัดส่งแล้ว",
      done: "เสร็จสมบูรณ์",
      cancelled: "ยกเลิกออเดอร์",
    };
    return {
      id: `order-status-${status}`,
      group: "order" as const,
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: `สถานะ: ${titles[status]}`,
      subject: `[WP ALL] ${titles[status]} — ${num}`,
      html: buildStatusEmail(data, status, SAMPLE_CUSTOMER_NAME)!,
    };
  });

  return [
    {
      id: "auth-confirm-signup",
      group: "auth",
      groupLabel: "Auth (Supabase)",
      label: "ยืนยันอีเมลสมัคร",
      subject: "[WP ALL] ยืนยันอีเมลของคุณ",
      html: authPreviewHtml(confirmSignupRaw),
    },
    {
      id: "auth-reset-password",
      group: "auth",
      groupLabel: "Auth (Supabase)",
      label: "รีเซ็ตรหัสผ่าน",
      subject: "[WP ALL] ตั้งรหัสผ่านใหม่",
      html: authPreviewHtml(resetPasswordRaw),
    },
    {
      id: "order-quotation",
      group: "order",
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: "ใบเสนอราคา (สั่งซื้อใหม่)",
      subject: `[WP ALL] ยืนยันคำสั่งซื้อ ${num}`,
      html: buildQuotationEmail(orderPending, SAMPLE_CUSTOMER_NAME),
    },
    {
      id: "order-admin-new",
      group: "order",
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: "แจ้งแอดมิน — ออเดอร์ใหม่",
      subject: `[WP ALL Admin] ออเดอร์ใหม่ ${num}`,
      html: buildAdminNewOrderEmail(orderPending),
    },
    {
      id: "order-receipt",
      group: "order",
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: "ใบเสร็จ / ชำระเงินสำเร็จ",
      subject: `[WP ALL] ชำระเงินสำเร็จ ${num}`,
      html: buildReceiptEmail(orderPaid, SAMPLE_CUSTOMER_NAME),
    },
    {
      id: "order-slip-received",
      group: "order",
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: "รับสลิปชำระเงิน (ลูกค้า)",
      subject: `[WP ALL] รับสลิปชำระเงิน ${num}`,
      html: buildSlipReceivedEmail(orderPending, SAMPLE_CUSTOMER_NAME),
    },
    {
      id: "order-slip-rejected",
      group: "order",
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: "ปฏิเสธสลิป (ลูกค้า)",
      subject: `[WP ALL] ไม่สามารถยืนยันสลิป ${num}`,
      html: buildSlipRejectedEmail(orderPending, "ยอดไม่ตรง / สลิปไม่ชัด", SAMPLE_CUSTOMER_NAME),
    },
    {
      id: "order-admin-slip",
      group: "order",
      groupLabel: "ออเดอร์ / ชำระเงิน",
      label: "แจ้งแอดมิน — สลิปใหม่",
      subject: `[WP ALL Admin] สลิปใหม่ ${num}`,
      html: buildAdminSlipEmail(orderPending),
    },
    ...statusEntries,
    {
      id: "wallet-topup-submitted",
      group: "wallet",
      groupLabel: "WP Wallet",
      label: "คำขอเติมเงิน (ลูกค้า)",
      subject: "[WP ALL] รับคำขอเติมเงิน Wallet",
      html: buildTopupSubmittedCustomerEmail({
        amount: SAMPLE_TOPUP_AMOUNT,
        method: "bank_transfer",
        customerName: SAMPLE_CUSTOMER_NAME,
      }),
    },
    {
      id: "wallet-topup-admin",
      group: "wallet",
      groupLabel: "WP Wallet",
      label: "คำขอเติมเงิน (แอดมิน)",
      subject: `[WP ALL Admin] คำขอเติมเงิน ฿${SAMPLE_TOPUP_AMOUNT.toLocaleString("th-TH")}`,
      html: buildTopupSubmittedAdminEmail({
        amount: SAMPLE_TOPUP_AMOUNT,
        method: "bank_transfer",
        customerName: SAMPLE_CUSTOMER_NAME,
        customerEmail: "demo@example.com",
      }),
    },
    {
      id: "wallet-topup-approved",
      group: "wallet",
      groupLabel: "WP Wallet",
      label: "เติมเงินสำเร็จ",
      subject: "[WP ALL] เติมเงิน Wallet สำเร็จ",
      html: buildTopupApprovedEmail({
        amount: SAMPLE_TOPUP_AMOUNT,
        balance: SAMPLE_WALLET_BALANCE,
        customerName: SAMPLE_CUSTOMER_NAME,
      }),
    },
    {
      id: "wallet-topup-rejected",
      group: "wallet",
      groupLabel: "WP Wallet",
      label: "ปฏิเสธเติมเงิน",
      subject: "[WP ALL] ไม่สามารถเติมเงิน Wallet ได้",
      html: buildTopupRejectedEmail({
        amount: SAMPLE_TOPUP_AMOUNT,
        reason: "สลิปไม่ชัดหรือยอดไม่ตรง",
        customerName: SAMPLE_CUSTOMER_NAME,
      }),
    },
    {
      id: "contact-admin",
      group: "contact",
      groupLabel: "ติดต่อเรา",
      label: "แจ้งแอดมิน — ฟอร์มติดต่อ",
      subject: `[WP ALL] ติดต่อจาก ${SAMPLE_CUSTOMER_NAME}`,
      html: buildContactAdminEmail(),
    },
    {
      id: "contact-auto-reply",
      group: "contact",
      groupLabel: "ติดต่อเรา",
      label: "ตอบกลับอัตโนมัติ (ลูกค้า)",
      subject: "[WP ALL] ได้รับข้อความแล้ว",
      html: buildContactAutoReplyEmail(SAMPLE_CUSTOMER_NAME),
    },
  ];
}

export function getEmailPreviewById(id: string): EmailPreviewEntry | undefined {
  return getAllEmailPreviews().find((e) => e.id === id);
}
