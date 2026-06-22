import type { FullOrderEmail } from "@/lib/email/order-data";

const NOW = new Date().toISOString();
const SAMPLE_ORDER_ID = "11111111-1111-4111-8111-111111111111";

export function sampleFullOrder(status = "pending_payment"): FullOrderEmail {
  return {
    order: {
      id: SAMPLE_ORDER_ID,
      order_number: "WP-2026-00123",
      user_id: "22222222-2222-4222-8222-222222222222",
      status,
      subtotal: 12500,
      discount: 500,
      vat_amount: 840,
      base_total: 12000,
      payment_fee: 0,
      grand_total: 12840,
      customer_name: "คุณทดสอบ",
      customer_phone: "081-234-5678",
      payment_method: status === "pending_payment" ? "transfer" : "wallet",
      note: "ติดตั้งชั้น 2 โทรก่อนเข้า",
      created_at: NOW,
    },
    items: [
      {
        product_name: "ม่านจีบ Premium — ผ้า Blackout",
        qty: 2,
        unit_price: 4500,
        line_total: 9000,
        config: { widthCm: 280, heightCm: 260, fullness: 2, curtainType: "pleated" },
      },
      {
        product_name: "รางม่านสแตนเลส",
        qty: 2,
        unit_price: 1750,
        line_total: 3500,
        config: {},
      },
    ],
  };
}

export const SAMPLE_CUSTOMER_NAME = "คุณทดสอบ";
export const SAMPLE_TOPUP_AMOUNT = 1000;
export const SAMPLE_WALLET_BALANCE = 2500;
