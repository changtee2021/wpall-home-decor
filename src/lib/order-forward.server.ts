import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendOrderIntakeWebhook } from "@/lib/intake-webhook.server";

function cfgNum(config: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = config[k];
    if (typeof v === "number" && v > 0) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (n > 0) return n;
    }
  }
  return 0;
}

function cfgStr(config: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = config[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Push each order line to wp-backoffice order-intake when order is paid */
export async function forwardOrderToBackoffice(orderId: string): Promise<{
  ok: boolean;
  refs: string[];
  error?: string;
}> {
  const { data: order, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (oErr || !order) return { ok: false, refs: [], error: oErr?.message ?? "Order not found" };
  if (order.status !== "paid" && order.status !== "forwarded") {
    return { ok: false, refs: [], error: "Order not paid" };
  }
  if (order.backoffice_forwarded_at) {
    return { ok: true, refs: (order.backoffice_refs as string[]) ?? [] };
  }

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (!items?.length) return { ok: false, refs: [], error: "No order items" };

  const refs: string[] = [];
  let hadError = false;
  let lastError = "";

  for (const item of items) {
    const config = (item.config ?? {}) as Record<string, unknown>;
    const width = cfgNum(config, "widthCm", "width_cm") || 200;
    const height = cfgNum(config, "heightCm", "height_cm") || 240;
    const color = cfgStr(config, "fabricCode", "color_code", "colorCode");

    const ok = await sendOrderIntakeWebhook({
      source_order_id: `${order.id}:${item.id}`,
      customer_name: order.customer_name ?? "",
      customer_code: order.user_id.slice(0, 8),
      product_type: item.product_name,
      width_cm: width,
      height_cm: height,
      color_code: color,
      quantity: item.qty,
      company_id: "WP",
      ordered_at: order.created_at,
    });
    if (ok) {
      refs.push(`${order.id}:${item.id}`);
    } else {
      hadError = true;
      lastError = "Webhook failed for one or more lines";
    }
  }

  const patch: Record<string, unknown> = {
    backoffice_refs: refs,
    updated_at: new Date().toISOString(),
  };
  if (hadError) {
    patch.backoffice_forward_error = lastError;
  } else {
    patch.backoffice_forwarded_at = new Date().toISOString();
    patch.backoffice_forward_error = null;
    patch.status = "forwarded";
  }

  await supabaseAdmin.from("orders").update(patch).eq("id", orderId);

  return { ok: !hadError, refs, error: hadError ? lastError : undefined };
}
