import crypto from "node:crypto";
import { fetchWithTimeout, integrationsEnabled } from "@/lib/integrations.server";

function getIntakeUrl(): string {
  return process.env.ORDER_INTAKE_URL?.trim() ?? "";
}

export interface OrderIntakePayload {
  source_order_id: string;
  customer_name: string;
  customer_code: string;
  product_type: string;
  width_cm: number;
  height_cm: number;
  color_code: string;
  quantity: number;
  company_id: "WP" | "WSC";
  ordered_at?: string;
}

export async function sendOrderIntakeWebhook(payload: OrderIntakePayload): Promise<boolean> {
  if (!integrationsEnabled()) {
    console.error("[intake-webhook] INTEGRATIONS_ENABLED=false; skipping push");
    return false;
  }
  const url = getIntakeUrl();
  const secret = process.env.ORDER_INTAKE_SECRET;
  if (!secret) {
    console.error("[intake-webhook] ORDER_INTAKE_SECRET not set; skipping push");
    return false;
  }
  if (!url) {
    console.error("[intake-webhook] ORDER_INTAKE_URL not set; skipping push");
    return false;
  }

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intake-signature": signature,
      },
      body: rawBody,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[intake-webhook] non-2xx: ${res.status} ${text.slice(0, 500)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[intake-webhook] fetch failed", err);
    return false;
  }
}
