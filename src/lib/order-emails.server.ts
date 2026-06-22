import { getEmailTo, sendEmailSafe } from "@/lib/email.server";
import { fetchFullOrder, getUserEmail } from "@/lib/email/order-data";
import {
  buildAdminNewOrderEmail,
  buildAdminSlipEmail,
  buildQuotationEmail,
  buildReceiptEmail,
  buildSlipReceivedEmail,
  buildSlipRejectedEmail,
  buildStatusEmail,
} from "@/lib/email/templates/order";

function orderNum(orderNumber: string | null, id: string): string {
  return orderNumber ?? id.slice(0, 8);
}

export async function notifyOrderCreated(orderId: string): Promise<void> {
  const data = await fetchFullOrder(orderId);
  if (!data) return;

  const { order } = data;
  const num = orderNum(order.order_number, order.id);
  const customerName = order.customer_name;
  const customerEmail = await getUserEmail(order.user_id);

  if (customerEmail) {
    sendEmailSafe({
      to: customerEmail,
      subject: `[WP ALL] ยืนยันคำสั่งซื้อ ${num}`,
      html: buildQuotationEmail(data, customerName),
    });
  }

  sendEmailSafe({
    to: getEmailTo(),
    subject: `[WP ALL Admin] ออเดอร์ใหม่ ${num}`,
    html: buildAdminNewOrderEmail(data),
  });
}

export async function notifyPaymentConfirmed(orderId: string): Promise<void> {
  const data = await fetchFullOrder(orderId);
  if (!data) return;

  const customerEmail = await getUserEmail(data.order.user_id);
  if (!customerEmail) return;

  const num = orderNum(data.order.order_number, data.order.id);
  sendEmailSafe({
    to: customerEmail,
    subject: `[WP ALL] ชำระเงินสำเร็จ ${num}`,
    html: buildReceiptEmail(data, data.order.customer_name),
  });
}

export async function notifyOrderStatusChange(orderId: string, status: string): Promise<void> {
  const data = await fetchFullOrder(orderId);
  if (!data) return;

  const html = buildStatusEmail(data, status, data.order.customer_name);
  if (!html) return;

  const customerEmail = await getUserEmail(data.order.user_id);
  if (!customerEmail) return;

  const num = orderNum(data.order.order_number, data.order.id);
  const copy: Record<string, string> = {
    producing: "เริ่มผลิตแล้ว",
    shipped: "จัดส่งแล้ว",
    done: "เสร็จสมบูรณ์",
    cancelled: "ยกเลิกออเดอร์",
  };

  sendEmailSafe({
    to: customerEmail,
    subject: `[WP ALL] ${copy[status] ?? status} — ${num}`,
    html,
  });
}

export async function notifyPaymentSlipSubmitted(orderId: string): Promise<void> {
  const data = await fetchFullOrder(orderId);
  if (!data) return;

  const num = orderNum(data.order.order_number, data.order.id);
  const customerEmail = await getUserEmail(data.order.user_id);

  if (customerEmail) {
    sendEmailSafe({
      to: customerEmail,
      subject: `[WP ALL] รับสลิปชำระเงินแล้ว ${num}`,
      html: buildSlipReceivedEmail(data, data.order.customer_name),
    });
  }

  sendEmailSafe({
    to: getEmailTo(),
    subject: `[WP ALL Admin] สลิปใหม่รอตรวจ ${num}`,
    html: buildAdminSlipEmail(data),
  });
}

export async function notifyPaymentSlipRejected(orderId: string, reason: string): Promise<void> {
  const data = await fetchFullOrder(orderId);
  if (!data) return;

  const customerEmail = await getUserEmail(data.order.user_id);
  if (!customerEmail) return;

  const num = orderNum(data.order.order_number, data.order.id);
  sendEmailSafe({
    to: customerEmail,
    subject: `[WP ALL] ไม่สามารถยืนยันสลิปได้ ${num}`,
    html: buildSlipRejectedEmail(data, reason, data.order.customer_name),
  });
}
