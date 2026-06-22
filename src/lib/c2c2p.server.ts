import crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getMerchantId(): string {
  return process.env.C2C2P_MERCHANT_ID?.trim() ?? "";
}

function getSecretKey(): string {
  return process.env.C2C2P_SECRET_KEY?.trim() ?? "";
}

export function isC2C2PConfigured(): boolean {
  return Boolean(getMerchantId() && getSecretKey());
}

const TOKEN_PATH = "/payment/4.3/paymentToken";
const INQUIRY_PATH = "/payment/4.3/paymentInquiry";
const C2C2P_SANDBOX = "https://sandbox-pgw.2c2p.com";
const C2C2P_PROD = "https://pgw.2c2p.com";

function apiOrigin(): string {
  return process.env.C2C2P_ENV === "production" ? C2C2P_PROD : C2C2P_SANDBOX;
}

function appBase(): string {
  return (
    process.env.VITE_APP_PUBLIC_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim() ||
    "https://wpall-home-decor.vercel.app"
  ).replace(/\/$/, "");
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

/** 2C2P Redirect API — sign request payload with merchant secret (HS256 JWT) */
function signJwtHS256(payload: Record<string, unknown>, secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwtHS256(token: string, secret: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const [header, body, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  if (sig !== expected) throw new Error("Invalid JWT signature");
  return JSON.parse(base64UrlDecode(body)) as Record<string, unknown>;
}

async function c2c2pPost(
  path: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const secret = getSecretKey();
  const jwt = signJwtHS256(payload, secret);
  const res = await fetch(`${apiOrigin()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ payload: jwt }),
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text.slice(0, 200) || "2C2P API error");
  }

  if (typeof json.payload === "string") {
    return verifyJwtHS256(json.payload, secret);
  }
  return json;
}

function parseC2C2PBody(body: unknown): Record<string, unknown> {
  const secret = getSecretKey();
  if (!secret) return {};

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (trimmed.includes(".") && !trimmed.startsWith("{")) {
      try {
        return verifyJwtHS256(trimmed, secret);
      } catch {
        /* fall through */
      }
    }
    try {
      return parseC2C2PBody(JSON.parse(trimmed));
    } catch {
      return {};
    }
  }

  if (typeof body === "object" && body !== null) {
    const o = body as Record<string, unknown>;
    if (typeof o.payload === "string") {
      try {
        return verifyJwtHS256(o.payload, secret);
      } catch {
        return o;
      }
    }
    return o;
  }

  return {};
}

function paymentChannel(method: string): string[] {
  if (method === "c2c2p_wallet") return ["EWALLET"];
  if (method === "c2c2p_installment") return ["IPP"];
  return ["CC"];
}

function isPaidRespCode(code: string): boolean {
  return code === "0000" || code === "success" || code === "paid";
}

async function markOrderPaid(orderId: string, txnId: string | null): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return false;
  if (order.status === "paid" || order.status === "forwarded") return true;

  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      gateway_transaction_id: txnId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  if (error) {
    console.error("[c2c2p] mark paid failed", error.message);
    return false;
  }

  void import("@/lib/order-emails.server")
    .then(({ notifyPaymentConfirmed }) => notifyPaymentConfirmed(orderId))
    .catch((err) => console.error("[c2c2p] email failed", err));

  return true;
}

async function markOrderPaidByInvoice(invoiceNo: string, txnId: string | null): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("order_number", invoiceNo)
    .maybeSingle();

  if (!order) return false;
  return markOrderPaid(order.id, txnId);
}

export async function createC2C2PPaymentSession(
  orderId: string,
  method: "c2c2p_card" | "c2c2p_wallet" | "c2c2p_installment",
): Promise<{ redirectUrl: string; invoiceNo: string }> {
  if (!isC2C2PConfigured()) {
    throw new Error("2C2P ยังไม่ได้ตั้งค่า (C2C2P_MERCHANT_ID / C2C2P_SECRET_KEY)");
  }

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, grand_total, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) throw new Error(error?.message ?? "Order not found");
  if (order.status !== "pending_payment") throw new Error("Order is not pending payment");

  const invoiceNo = order.order_number;
  const json = await c2c2pPost(TOKEN_PATH, {
    merchantID: getMerchantId(),
    invoiceNo,
    description: `WP ALL Order ${invoiceNo}`,
    amount: Number(Number(order.grand_total).toFixed(2)),
    currencyCode: "THB",
    paymentChannel: paymentChannel(method),
    frontendReturnUrl: `${appBase()}/orders?c2c2p=return&orderId=${orderId}`,
    backendReturnUrl: `${appBase()}/api/public/c2c2p-webhook`,
  });

  const respCode = String(json.respCode ?? "");
  const webPaymentUrl = String(json.webPaymentUrl ?? "");

  if (respCode !== "0000" || !webPaymentUrl) {
    throw new Error(String(json.respDesc ?? "2C2P payment token failed"));
  }

  await supabaseAdmin
    .from("orders")
    .update({
      gateway_ref: invoiceNo,
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return { redirectUrl: webPaymentUrl, invoiceNo };
}

/** Payment Inquiry — used after browser return and as webhook backup */
export async function syncC2C2POrderPayment(
  orderId: string,
  userId: string,
): Promise<{ paid: boolean; pending: boolean; message?: string }> {
  if (!isC2C2PConfigured()) {
    return { paid: false, pending: true, message: "2C2P not configured" };
  }

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, user_id, status, payment_method")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.user_id !== userId) {
    return { paid: false, pending: false, message: "Forbidden" };
  }

  if (order.status === "paid" || order.status === "forwarded") {
    return { paid: true, pending: false };
  }

  if (!String(order.payment_method ?? "").startsWith("c2c2p_")) {
    return { paid: false, pending: false, message: "Not a 2C2P order" };
  }

  const json = await c2c2pPost(INQUIRY_PATH, {
    merchantID: getMerchantId(),
    invoiceNo: order.order_number,
  });

  const respCode = String(json.respCode ?? "");
  const txnId = String(json.tranRef ?? json.transactionId ?? "") || null;

  if (isPaidRespCode(respCode)) {
    await markOrderPaid(orderId, txnId);
    return { paid: true, pending: false };
  }

  return {
    paid: false,
    pending: true,
    message: String(json.respDesc ?? "รอการยืนยันจาก 2C2P"),
  };
}

export async function handleC2C2PWebhook(body: unknown): Promise<boolean> {
  if (!isC2C2PConfigured()) return false;

  const data = parseC2C2PBody(body);
  const invoiceNo = String(data.invoiceNo ?? data.orderNo ?? "");
  const respCode = String(data.respCode ?? data.status ?? "");
  const txnId = String(data.tranRef ?? data.transactionId ?? "") || null;

  if (!invoiceNo || !isPaidRespCode(respCode)) {
    return false;
  }

  return markOrderPaidByInvoice(invoiceNo, txnId);
}
