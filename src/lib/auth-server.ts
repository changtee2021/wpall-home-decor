import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

type ShopClient = SupabaseClient<Database, "wpall_home_decor">;

export async function isShopAdmin(supabase: ShopClient, userId: string): Promise<boolean> {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (roles ?? []).some((r) => r.role === "admin");
}

export async function requireShopAdmin(supabase: ShopClient, userId: string): Promise<void> {
  if (!(await isShopAdmin(supabase, userId))) {
    throw new Error("Forbidden");
  }
}

/** Validates x-internal-secret for sensitive server-only endpoints */
export function requireInternalSecret(): void {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET not configured");
  }
  const request = getRequest();
  const header = request?.headers?.get("x-internal-secret");
  if (header !== secret) {
    throw new Error("Forbidden");
  }
}
