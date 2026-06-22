import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireShopAdmin } from "@/lib/auth-server";
import { createC2C2PPaymentSession, syncC2C2POrderPayment } from "@/lib/c2c2p.server";
import { enforceUserRateLimit } from "@/lib/rate-limit.server";

export const payOrderWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await enforceUserRateLimit(context.userId, "checkout", 20);
    const { data: res, error } = await supabase.rpc("pay_with_wallet", { _order_id: data.orderId });
    if (error) throw new Error(error.message);

    void import("@/lib/order-emails.server")
      .then(({ notifyPaymentConfirmed }) => notifyPaymentConfirmed(data.orderId))
      .catch((err) => console.error("[payOrderWithWallet] email failed", err));

    return res as { ok: boolean; balance: number; tx_id: string };
  });

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        amount: z.number().refine((n) => n !== 0, "amount must be non-zero"),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { data: res, error } = await supabase.rpc("admin_adjust_wallet", {
      _user_id: data.userId,
      _amount: data.amount,
      _note: data.note ?? "",
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; balance: number };
  });

export const claimCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("claim_coupon", { _code: data.code });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; coupon_id: string; title: string };
  });

export const applyCouponToOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userCouponId: z.string().uuid(), orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("redeem_coupon_for_order", {
      _user_coupon_id: data.userCouponId,
      _order_id: data.orderId,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; discount: number; coupon_id: string };
  });

export const rejectPaymentSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slipId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const reason = data.reason ?? "สลิปไม่ชัดหรือยอดไม่ตรง";

    const { data: slip, error: fetchErr } = await supabase
      .from("payment_slips")
      .select("order_id")
      .eq("id", data.slipId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!slip?.order_id) throw new Error("Slip not found");

    const { error } = await supabase.rpc("reject_payment_slip", {
      _slip_id: data.slipId,
      _reason: reason,
    });
    if (error) throw new Error(error.message);

    void import("@/lib/order-emails.server")
      .then(({ notifyPaymentSlipRejected }) => notifyPaymentSlipRejected(slip.order_id, reason))
      .catch((err) => console.error("[rejectPaymentSlip] email failed", err));

    return { ok: true };
  });

export const submitPaymentSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ orderId: z.string().uuid(), slipPath: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await enforceUserRateLimit(userId, "checkout", 20);
    const { error } = await supabase.from("payment_slips").insert({
      order_id: data.orderId,
      user_id: userId,
      slip_url: data.slipPath,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    void import("@/lib/order-emails.server")
      .then(({ notifyPaymentSlipSubmitted }) => notifyPaymentSlipSubmitted(data.orderId))
      .catch((err) => console.error("[submitPaymentSlip] email failed", err));

    return { ok: true };
  });

export const initiateC2C2PPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        method: z.enum(["c2c2p_card", "c2c2p_wallet", "c2c2p_installment"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await enforceUserRateLimit(userId, "checkout", 20);
    const { data: order } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== userId) throw new Error("Forbidden");

    return createC2C2PPaymentSession(data.orderId, data.method);
  });

export const confirmC2C2PPaymentReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    return syncC2C2POrderPayment(data.orderId, context.userId);
  });
