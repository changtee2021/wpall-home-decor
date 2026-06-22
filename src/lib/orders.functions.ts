import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireShopAdmin } from "@/lib/auth-server";
import { forwardOrderToBackoffice } from "@/lib/order-forward.server";
import { enforceUserRateLimit } from "@/lib/rate-limit.server";

const ItemSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string().min(1).max(200),
  config: z.record(z.string(), z.any()),
  qty: z.number().int().min(1).max(999),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
});

const PaymentMethodSchema = z.enum([
  "promptpay_direct",
  "wallet",
  "transfer",
  "cod",
  "c2c2p_card",
  "c2c2p_wallet",
  "c2c2p_installment",
]);

const CreateOrderSchema = z.object({
  items: z.array(ItemSchema).min(1).max(50),
  subtotal: z.number().min(0),
  discount: z.number().min(0),
  vatAmount: z.number().min(0),
  baseTotal: z.number().min(0),
  paymentFee: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
  shippingFee: z.number().min(0).default(0),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(50).optional(),
  customerAddress: z.string().max(500).optional(),
  shippingAddressId: z.string().uuid().optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  userCouponId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
  referralCode: z.string().min(3).max(20).optional(),
});

const ORDER_STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "forwarded",
  "producing",
  "shipped",
  "done",
  "cancelled",
] as const;

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await enforceUserRateLimit(userId, "checkout", 20);

    let affiliateId: string | null = null;
    let referralCode: string | null = null;
    if (data.referralCode?.trim()) {
      const { data: refData } = await supabase.rpc("lookup_referral_code", {
        _code: data.referralCode.trim(),
      });
      const ref = refData as { affiliate_id?: string; referral_code?: string } | null;
      if (ref?.affiliate_id) {
        const { data: affRow } = await supabase
          .from("affiliates")
          .select("id,user_id")
          .eq("id", ref.affiliate_id)
          .maybeSingle();
        if (affRow && affRow.user_id !== userId) {
          affiliateId = affRow.id;
          referralCode = ref.referral_code ?? data.referralCode.trim().toUpperCase();
        }
      }
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "pending_payment",
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_address: data.customerAddress,
        shipping_address_id: data.shippingAddressId ?? null,
        shipping_fee: data.shippingFee,
        subtotal: data.subtotal,
        discount: data.discount,
        vat_amount: data.vatAmount,
        base_total: data.baseTotal,
        payment_fee: data.paymentFee,
        grand_total: data.grandTotal,
        payment_method: data.paymentMethod ?? null,
        note: data.note,
        affiliate_id: affiliateId,
        referral_code: referralCode,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const items = data.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.productName,
      config: i.config,
      qty: i.qty,
      unit_price: i.unitPrice,
      line_total: i.lineTotal,
    }));
    const { error: e2 } = await supabase.from("order_items").insert(items);
    if (e2) throw new Error(e2.message);

    if (data.userCouponId) {
      const { error: cErr } = await supabase.rpc("redeem_coupon_for_order", {
        _user_coupon_id: data.userCouponId,
        _order_id: order.id,
      });
      if (cErr) throw new Error(cErr.message);
    }

    const { error: stockErr } = await supabase.rpc("reserve_order_stock", {
      _order_id: order.id,
    });
    if (stockErr) throw new Error(stockErr.message);

    void import("@/lib/order-emails.server")
      .then(({ notifyOrderCreated }) => notifyOrderCreated(order.id))
      .catch((err) => console.error("[createOrder] email failed", err));

    return { id: order.id, order_number: order.order_number };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.status === "cancelled") {
      const { error } = await supabase.rpc("customer_cancel_order", {
        _order_id: data.orderId,
      });
      if (error) throw new Error(error.message);

      void import("@/lib/order-emails.server")
        .then(({ notifyOrderStatusChange }) => notifyOrderStatusChange(data.orderId, data.status))
        .catch((err) => console.error("[updateOrderStatus] email failed", err));

      return { ok: true };
    }

    await requireShopAdmin(supabase, userId);

    const { error } = await supabase
      .from("orders")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    void import("@/lib/order-emails.server")
      .then(({ notifyOrderStatusChange }) => notifyOrderStatusChange(data.orderId, data.status))
      .catch((err) => console.error("[updateOrderStatus] email failed", err));

    return { ok: true };
  });

export const confirmOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);

    const { error } = await supabase.rpc("confirm_order_payment", {
      _order_id: data.orderId,
    });
    if (error) throw new Error(error.message);

    void import("@/lib/order-emails.server")
      .then(({ notifyPaymentConfirmed }) => notifyPaymentConfirmed(data.orderId))
      .catch((err) => console.error("[confirmOrderPayment] email failed", err));

    void forwardOrderToBackoffice(data.orderId).catch((err) =>
      console.error("[confirmOrderPayment] forward failed", err),
    );

    return { ok: true };
  });

export const retryBackofficeForward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);

    await supabase
      .from("orders")
      .update({
        backoffice_forwarded_at: null,
        backoffice_forward_error: null,
        status: "paid",
      })
      .eq("id", data.orderId);

    return forwardOrderToBackoffice(data.orderId);
  });

export const refundOrderToWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { data: res, error } = await supabase.rpc("refund_order_to_wallet", {
      _order_id: data.orderId,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; balance: number };
  });

export const setTierOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        tier: z.enum(["bronze", "silver", "gold", "platinum", "vip"]).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);

    const { error } = await supabase
      .from("profiles")
      .update({
        tier_override: data.tier,
        tier: data.tier ?? "bronze",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
