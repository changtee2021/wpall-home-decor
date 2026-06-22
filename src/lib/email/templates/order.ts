import { escapeHtml } from "@/lib/email.server";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment-fees";
import { curtainTypeLabels } from "@/lib/pricing";
import {
  appPublicUrlServer,
  emailLayout,
  emailSummaryRow,
  emailSummaryTable,
  emailTable,
} from "@/lib/email/brand-layout";
import {
  formatMoney,
  formatThaiDate,
  quotationValidUntil,
  VAT_RATE,
  type FullOrderEmail,
} from "@/lib/email/order-data";

function itemConfigNote(config: Record<string, unknown>): string {
  const cfg = config as {
    widthCm?: number;
    heightCm?: number;
    fullness?: number;
    curtainType?: string;
  };
  if (!cfg.widthCm) return "";
  const type = cfg.curtainType ? (curtainTypeLabels[cfg.curtainType] ?? cfg.curtainType) : "";
  return `<div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(type)} · ${cfg.widthCm}×${cfg.heightCm} cm · ×${cfg.fullness ?? 1}</div>`;
}

function buildItemsTable(items: FullOrderEmail["items"]): string {
  if (items.length === 0) return "";
  const rows = items.map((it) => [
    `<strong>${escapeHtml(it.product_name)}</strong>${itemConfigNote(it.config)}`,
    String(it.qty),
    `฿${formatMoney(it.unit_price)}`,
    `<strong>฿${formatMoney(it.line_total)}</strong>`,
  ]);
  return emailTable(["รายการ", "จำนวน", "ราคา/หน่วย", "รวม"], rows);
}

function buildTotals(order: FullOrderEmail["order"]): string {
  const beforeVat = order.subtotal - order.discount;
  let rows = emailSummaryRow("ยอดรวมสินค้า", `฿${formatMoney(order.subtotal)}`);
  if (order.discount > 0) {
    rows += emailSummaryRow("ส่วนลด", `− ฿${formatMoney(order.discount)}`);
  }
  rows += emailSummaryRow("ก่อน VAT", `฿${formatMoney(beforeVat)}`);
  rows += emailSummaryRow(
    `VAT ${(VAT_RATE * 100).toFixed(0)}%`,
    `฿${formatMoney(order.vat_amount)}`,
  );
  if (Number(order.payment_fee) > 0) {
    rows += emailSummaryRow("ค่าธรรมเนียมชำระ", `฿${formatMoney(order.payment_fee)}`);
  }
  rows += emailSummaryRow("รวมทั้งสิ้น", `฿${formatMoney(order.grand_total)}`, true);
  return emailSummaryTable(rows);
}

function paymentMethodLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

function orderLinks(orderId: string) {
  const base = appPublicUrlServer();
  return {
    quotation: `${base}/quotation/${orderId}`,
    pay: `${base}/orders/${orderId}/pay`,
    orders: `${base}/orders`,
    admin: `${base}/admin/orders/${orderId}`,
  };
}

export function buildQuotationEmail(data: FullOrderEmail, customerName?: string | null): string {
  const { order, items } = data;
  const num = order.order_number ?? order.id.slice(0, 8);
  const links = orderLinks(order.id);
  const greeting = customerName ? `สวัสดีคุณ${escapeHtml(customerName)},` : "สวัสดีค่ะ/ครับ,";

  const body = `
    <p>${greeting}</p>
    <p>ขอบคุณที่สั่งซื้อกับ <strong>WP ALL</strong> แนบใบเสนอราคาสรุปด้านล่าง</p>
    <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:13px;">
      <strong>เลขที่:</strong> ${escapeHtml(num)}<br/>
      <strong>วันที่:</strong> ${formatThaiDate(order.created_at)}<br/>
      <strong>ยืนราคาถึง:</strong> ${quotationValidUntil(order.created_at)}<br/>
      <span style="color:#64748b;">เงื่อนไข: มัดจำ 50%, ส่วนที่เหลือก่อนติดตั้ง</span>
    </p>
    ${buildItemsTable(items)}
    ${buildTotals(order)}
    ${order.note ? `<p style="font-size:12px;color:#64748b;"><strong>หมายเหตุ:</strong> ${escapeHtml(order.note)}</p>` : ""}
    <p style="font-size:13px;color:#64748b;">ดูเอกสารเต็มหรือพิมพ์ PDF ได้จากลิงก์ด้านล่าง</p>
  `;

  return emailLayout({
    title: "ใบเสนอราคา",
    subtitle: `Quotation · ${num}`,
    bodyHtml: body,
    ctaLabel: "ชำระเงิน / ดูเอกสาร",
    ctaUrl: links.quotation,
  });
}

export function buildReceiptEmail(data: FullOrderEmail, customerName?: string | null): string {
  const { order, items } = data;
  const num = order.order_number ?? order.id.slice(0, 8);
  const links = orderLinks(order.id);
  const greeting = customerName ? `สวัสดีคุณ${escapeHtml(customerName)},` : "สวัสดีค่ะ/ครับ,";
  const isPaid = ["paid", "producing", "shipped", "done", "forwarded"].includes(order.status);

  const body = `
    <p>${greeting}</p>
    <p>การชำระเงินของคุณ<strong>สำเร็จแล้ว</strong> ขอบคุณที่ไว้วางใจ WP ALL</p>
    <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:13px;">
      <strong>${isPaid ? "ใบเสร็จ / ใบกำกับภาษี" : "ใบเสนอราคา"}:</strong> ${escapeHtml(num)}<br/>
      <strong>ยอดชำระ:</strong> ฿${formatMoney(order.grand_total)}<br/>
      <strong>วิธีชำระ:</strong> ${escapeHtml(paymentMethodLabel(order.payment_method))}<br/>
      <strong>วันที่:</strong> ${formatThaiDate(order.created_at)}
    </p>
    ${buildItemsTable(items)}
    ${buildTotals(order)}
    <p style="font-size:13px;color:#64748b;">ดาวน์โหลดหรือพิมพ์เอกสารได้จากลิงก์ด้านล่าง</p>
  `;

  return emailLayout({
    title: "ชำระเงินสำเร็จ",
    subtitle: `Receipt · ${num}`,
    bodyHtml: body,
    ctaLabel: "ดูใบเสร็จ / ใบกำกับภาษี",
    ctaUrl: links.quotation,
  });
}

export function buildAdminNewOrderEmail(data: FullOrderEmail): string {
  const { order } = data;
  const num = order.order_number ?? order.id.slice(0, 8);
  const links = orderLinks(order.id);

  const body = `
    <p>มีคำสั่งซื้อใหม่จาก <strong>${escapeHtml(order.customer_name ?? "ลูกค้า")}</strong></p>
    <p style="font-size:13px;">
      <strong>เลขที่:</strong> ${escapeHtml(num)}<br/>
      <strong>ยอดรวม:</strong> ฿${formatMoney(order.grand_total)}<br/>
      <strong>ช่องทางชำระ:</strong> ${escapeHtml(paymentMethodLabel(order.payment_method))}<br/>
      <strong>โทร:</strong> ${escapeHtml(order.customer_phone ?? "—")}
    </p>
  `;

  return emailLayout({
    title: "ออเดอร์ใหม่",
    subtitle: num,
    bodyHtml: body,
    ctaLabel: "เปิดในแอดมิน",
    ctaUrl: links.admin,
  });
}

const STATUS_COPY: Record<
  string,
  { title: string; subtitle: string; detail: string; cta?: string }
> = {
  producing: {
    title: "เริ่มผลิตแล้ว",
    subtitle: "กำลังผลิต",
    detail: "ออเดอร์ของคุณเข้าสู่ขั้นตอนการผลิตแล้ว ทีมงานจะแจ้งเมื่อพร้อมจัดส่ง",
  },
  shipped: {
    title: "จัดส่งแล้ว",
    subtitle: "Shipping",
    detail: "ออเดอร์ของคุณอยู่ระหว่างจัดส่งถึงที่อยู่ที่ระบุไว้",
  },
  done: {
    title: "เสร็จสมบูรณ์",
    subtitle: "Completed",
    detail: "ออเดอร์เสร็จสมบูรณ์แล้ว ขอบคุณที่ใช้บริการ WP ALL — หวังว่าจะได้รับใช้บริการอีกครั้ง",
    cta: "สั่งซื้ออีกครั้ง",
  },
  cancelled: {
    title: "ยกเลิกออเดอร์",
    subtitle: "Cancelled",
    detail: "ออเดอร์ของคุณถูกยกเลิก หากมีการคืนเงินเข้า WP Wallet จะแสดงในหน้ากระเป๋าเงิน",
    cta: "ดูกระเป๋าเงิน",
  },
};

export function buildStatusEmail(
  data: FullOrderEmail,
  status: string,
  customerName?: string | null,
): string | null {
  const copy = STATUS_COPY[status];
  if (!copy) return null;

  const { order } = data;
  const num = order.order_number ?? order.id.slice(0, 8);
  const links = orderLinks(order.id);
  const greeting = customerName ? `สวัสดีคุณ${escapeHtml(customerName)},` : "สวัสดีค่ะ/ครับ,";

  let ctaUrl = links.orders;
  if (status === "done") ctaUrl = `${appPublicUrlServer()}/products`;
  if (status === "cancelled") ctaUrl = `${appPublicUrlServer()}/account/wallet`;

  const body = `
    <p>${greeting}</p>
    <p>${escapeHtml(copy.detail)}</p>
    <p style="font-size:13px;background:#f8fafc;border-radius:8px;padding:12px;">
      <strong>เลขที่:</strong> ${escapeHtml(num)}<br/>
      <strong>ยอดรวม:</strong> ฿${formatMoney(order.grand_total)}
    </p>
  `;

  return emailLayout({
    title: copy.title,
    subtitle: `${copy.subtitle} · ${num}`,
    bodyHtml: body,
    ctaLabel: copy.cta ?? "ดูออเดอร์ของฉัน",
    ctaUrl: ctaUrl,
  });
}

export function buildSlipReceivedEmail(data: FullOrderEmail, customerName?: string | null): string {
  const num = data.order.order_number ?? data.order.id.slice(0, 8);
  const greeting = customerName ? `สวัสดีคุณ${escapeHtml(customerName)},` : "สวัสดีค่ะ/ครับ,";

  const body = `
    <p>${greeting}</p>
    <p>เรา<strong>ได้รับสลิปชำระเงิน</strong>ของคุณแล้ว ทีมงานจะตรวจสอบภายใน 1–2 วันทำการ</p>
    <p style="font-size:13px;background:#f8fafc;border-radius:8px;padding:12px;">
      <strong>เลขที่ออเดอร์:</strong> ${escapeHtml(num)}<br/>
      <strong>ยอดชำระ:</strong> ฿${formatMoney(data.order.grand_total)}
    </p>
    <p style="font-size:12px;color:#64748b;">เมื่อยืนยันแล้วจะได้รับอีเมลใบเสร็จ/ใบกำกับภาษีอัตโนมัติ</p>
  `;

  return emailLayout({
    title: "รับสลิปชำระเงินแล้ว",
    subtitle: num,
    bodyHtml: body,
    ctaLabel: "ดูสถานะออเดอร์",
    ctaUrl: orderLinks(data.order.id).orders,
  });
}

export function buildSlipRejectedEmail(
  data: FullOrderEmail,
  reason: string,
  customerName?: string | null,
): string {
  const num = data.order.order_number ?? data.order.id.slice(0, 8);
  const greeting = customerName ? `สวัสดีคุณ${escapeHtml(customerName)},` : "สวัสดีค่ะ/ครับ,";

  const body = `
    <p>${greeting}</p>
    <p>ขออภัย — <strong>ไม่สามารถยืนยันสลิปชำระเงิน</strong>สำหรับออเดอร์นี้ได้</p>
    <p style="font-size:13px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;color:#991b1b;">
      <strong>เหตุผล:</strong> ${escapeHtml(reason || "สลิปไม่ชัดหรือยอดไม่ตรง")}
    </p>
    <p style="font-size:13px;">กรุณาอัปโหลดสลิปใหม่หรือติดต่อเราที่ info@wpallin1.com</p>
  `;

  return emailLayout({
    title: "ไม่สามารถยืนยันสลิปได้",
    subtitle: num,
    bodyHtml: body,
    ctaLabel: "อัปโหลดสลิปใหม่",
    ctaUrl: orderLinks(data.order.id).pay,
  });
}

export function buildAdminSlipEmail(data: FullOrderEmail): string {
  const num = data.order.order_number ?? data.order.id.slice(0, 8);
  const body = `
    <p>มีสลิปชำระเงินใหม่รอตรวจสอบ</p>
    <p style="font-size:13px;">
      <strong>ออเดอร์:</strong> ${escapeHtml(num)}<br/>
      <strong>ลูกค้า:</strong> ${escapeHtml(data.order.customer_name ?? "—")}<br/>
      <strong>ยอด:</strong> ฿${formatMoney(data.order.grand_total)}
    </p>
  `;
  return emailLayout({
    title: "สลิปใหม่รอตรวจ",
    subtitle: num,
    bodyHtml: body,
    ctaLabel: "ตรวจสลิป",
    ctaUrl: `${appPublicUrlServer()}/admin/payments`,
  });
}
