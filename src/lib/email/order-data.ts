import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { VAT_RATE } from "@/lib/pricing";

export type OrderEmailRow = {
  id: string;
  order_number: string | null;
  user_id: string;
  status: string;
  subtotal: number;
  discount: number;
  vat_amount: number;
  base_total: number | null;
  payment_fee: number;
  grand_total: number;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  note: string | null;
  created_at: string;
};

export type OrderItemEmailRow = {
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  config: Record<string, unknown>;
};

export type FullOrderEmail = {
  order: OrderEmailRow;
  items: OrderItemEmailRow[];
};

export async function fetchFullOrder(orderId: string): Promise<FullOrderEmail | null> {
  const [{ data: order, error }, { data: items }] = await Promise.all([
    supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabaseAdmin
      .from("order_items")
      .select("product_name,qty,unit_price,line_total,config")
      .eq("order_id", orderId),
  ]);
  if (error || !order) return null;
  return {
    order: order as OrderEmailRow,
    items: (items ?? []) as OrderItemEmailRow[],
  };
}

export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.email) return profile.email;

    const { data: authData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !authData.user?.email) return null;
    return authData.user.email;
  } catch {
    return null;
  }
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function quotationValidUntil(createdAt: string): string {
  return formatThaiDate(new Date(new Date(createdAt).getTime() + 30 * 86400000).toISOString());
}

export { VAT_RATE };
