import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CLAIM_STATUSES = [
  "submitted",
  "reviewing",
  "approved",
  "rejected",
  "processing",
  "completed",
] as const;

const ISSUE_TYPES = ["defect", "wrong_item", "missing", "warranty", "other"] as const;

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("ไม่มีสิทธิ์แอดมิน");
}

export type ClaimRow = {
  id: string;
  claim_number: string;
  user_id: string;
  order_id: string | null;
  product_name: string;
  issue_type: string;
  description: string;
  status: string;
  customer_phone: string | null;
  image_paths: string[];
  admin_note: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

function mapClaim(row: Record<string, unknown>): ClaimRow {
  return {
    id: row.id as string,
    claim_number: row.claim_number as string,
    user_id: row.user_id as string,
    order_id: (row.order_id as string | null) ?? null,
    product_name: row.product_name as string,
    issue_type: row.issue_type as string,
    description: row.description as string,
    status: row.status as string,
    customer_phone: (row.customer_phone as string | null) ?? null,
    image_paths: Array.isArray(row.image_paths) ? (row.image_paths as string[]) : [],
    admin_note: (row.admin_note as string | null) ?? null,
    resolution: (row.resolution as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    resolved_at: (row.resolved_at as string | null) ?? null,
  };
}

export const listMyClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("product_claims")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapClaim);
  });

export const listClaimsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["all", ...CLAIM_STATUSES]).default("all") }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("product_claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapClaim);
  });

export const getClaim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ claimId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: claim, error } = await context.supabase
      .from("product_claims")
      .select("*")
      .eq("id", data.claimId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!claim) throw new Error("ไม่พบรายการเคลม");

    const { data: comments } = await context.supabase
      .from("claim_comments")
      .select("id, user_id, body, is_admin, created_at")
      .eq("claim_id", data.claimId)
      .order("created_at", { ascending: true });

    return { claim: mapClaim(claim), comments: comments ?? [] };
  });

export const createClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid().nullable().optional(),
        productName: z.string().min(1).max(200),
        issueType: z.enum(ISSUE_TYPES),
        description: z.string().min(10).max(2000),
        customerPhone: z.string().max(20).optional(),
        imagePaths: z.array(z.string().max(500)).max(5).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: claim, error } = await context.supabase
      .from("product_claims")
      .insert({
        user_id: context.userId,
        order_id: data.orderId ?? null,
        product_name: data.productName,
        issue_type: data.issueType,
        description: data.description,
        customer_phone: data.customerPhone ?? null,
        image_paths: data.imagePaths ?? [],
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapClaim(claim);
  });

export const updateClaimStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        claimId: z.string().uuid(),
        status: z.enum(CLAIM_STATUSES),
        adminNote: z.string().max(2000).nullable().optional(),
        resolution: z.string().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.adminNote !== undefined) patch.admin_note = data.adminNote;
    if (data.resolution !== undefined) patch.resolution = data.resolution;
    if (data.status === "completed" || data.status === "rejected") {
      patch.resolved_at = new Date().toISOString();
    }

    const { data: claim, error } = await supabaseAdmin
      .from("product_claims")
      .update(patch)
      .eq("id", data.claimId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    void import("@/lib/claim-notifications.server")
      .then(({ notifyClaimStatusChange }) => notifyClaimStatusChange(data.claimId, data.status))
      .catch((err) => console.error("[updateClaimStatus] notify failed", err));

    return mapClaim(claim);
  });

export const addClaimComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ claimId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const { data: row, error } = await context.supabase
      .from("claim_comments")
      .insert({
        claim_id: data.claimId,
        user_id: context.userId,
        body: data.body,
        is_admin: isAdmin,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const attachClaimImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ claimId: z.string().uuid(), paths: z.array(z.string()).min(1).max(5) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: existing, error: fetchErr } = await context.supabase
      .from("product_claims")
      .select("image_paths, user_id, status")
      .eq("id", data.claimId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing || existing.user_id !== context.userId) throw new Error("ไม่พบรายการเคลม");
    if (existing.status !== "submitted") throw new Error("แก้ไขรูปได้เฉพาะสถานะ submitted");

    const merged = [...new Set([...(existing.image_paths as string[]), ...data.paths])].slice(0, 5);
    const { error } = await context.supabase
      .from("product_claims")
      .update({ image_paths: merged, updated_at: new Date().toISOString() })
      .eq("id", data.claimId);
    if (error) throw new Error(error.message);
    return merged;
  });

export { CLAIM_STATUSES, ISSUE_TYPES };
