import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireShopAdmin } from "@/lib/auth-server";

export const applyForAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("apply_for_affiliate");
    if (error) throw new Error(error.message);
    return data as { ok: boolean; id: string; referral_code: string; status: string };
  });

export const adminReviewAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        affiliateId: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { data: res, error } = await supabase.rpc("admin_review_affiliate", {
      _affiliate_id: data.affiliateId,
      _approve: data.approve,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const adminSuspendAffiliate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ affiliateId: z.string().uuid(), suspend: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { error } = await supabase.rpc("admin_suspend_affiliate", {
      _affiliate_id: data.affiliateId,
      _suspend: data.suspend,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertAffiliateBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bankCode: z.string().min(2).max(10),
        bankName: z.string().min(2).max(100),
        accountNumber: z.string().min(8).max(20),
        accountName: z.string().min(2).max(120),
        isDefault: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("upsert_affiliate_bank_account", {
      _bank_code: data.bankCode,
      _bank_name: data.bankName,
      _account_number: data.accountNumber.replace(/\D/g, ""),
      _account_name: data.accountName.trim(),
      _is_default: data.isDefault,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const createAffiliatePayoutBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { data: res, error } = await supabase.rpc("create_affiliate_payout_batch", {
      _year: data.year,
      _month: data.month,
    });
    if (error) throw new Error(error.message);
    return res as {
      ok: boolean;
      payout_id: string;
      total: number;
      affiliate_count: number;
      commission_count: number;
    };
  });

export const markAffiliatePayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        payoutId: z.string().uuid(),
        transferRef: z.string().max(200).optional(),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { error } = await supabase.rpc("mark_affiliate_payout_paid", {
      _payout_id: data.payoutId,
      _transfer_ref: data.transferRef ?? null,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAffiliatePayoutLinePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        lineId: z.string().uuid(),
        transferRef: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireShopAdmin(supabase, userId);
    const { error } = await supabase.rpc("mark_affiliate_payout_line_paid", {
      _line_id: data.lineId,
      _transfer_ref: data.transferRef ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(3).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("lookup_referral_code", {
      _code: data.code.trim(),
    });
    if (error) throw new Error(error.message);
    return res as { ok?: boolean; affiliate_id?: string; referral_code?: string } | null;
  });
