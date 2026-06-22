import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function requireAdmin(
  supabase: SupabaseClient<Database, "wpall_home_decor">,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export const submitTopupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        amount: z.number().min(50),
        method: z.enum(["bank_transfer", "promptpay", "credit_card"]),
        slipUrl: z.string().min(1).nullable().optional(),
        referenceNote: z.string().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("topup_requests")
      .insert({
        user_id: userId,
        amount: data.amount,
        method: data.method,
        slip_url: data.slipUrl ?? null,
        reference_note: data.referenceNote ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    void import("@/lib/wallet-emails.server")
      .then(({ notifyTopupSubmitted }) => notifyTopupSubmitted(row.id))
      .catch((err) => console.error("[submitTopupRequest] email failed", err));

    return { ok: true, id: row.id };
  });

export const approveTopupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ topupId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { error } = await supabase
      .from("topup_requests")
      .update({ status: "approved", approved_by: userId })
      .eq("id", data.topupId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    void import("@/lib/wallet-emails.server")
      .then(({ notifyTopupApproved }) => notifyTopupApproved(data.topupId))
      .catch((err) => console.error("[approveTopupRequest] email failed", err));

    return { ok: true };
  });

export const rejectTopupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ topupId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    const { error } = await supabase
      .from("topup_requests")
      .update({
        status: "rejected",
        rejected_reason: data.reason ?? "",
        approved_by: userId,
      })
      .eq("id", data.topupId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    void import("@/lib/wallet-emails.server")
      .then(({ notifyTopupRejected }) =>
        notifyTopupRejected(data.topupId, data.reason ?? "สลิปไม่ชัดหรือยอดไม่ตรง"),
      )
      .catch((err) => console.error("[rejectTopupRequest] email failed", err));

    return { ok: true };
  });
