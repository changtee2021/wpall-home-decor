import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tier";

export interface CustomerProfileRow {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  tier: Tier;
  total_spent: number;
  order_count: number;
}

const PROFILE_SELECT = "full_name,phone,email,tier,total_spent,order_count";

function fallbackProfile(user: User): CustomerProfileRow {
  return {
    full_name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "สมาชิก WP ALL",
    phone: user.phone ?? null,
    email: user.email ?? null,
    tier: "bronze",
    total_spent: 0,
    order_count: 0,
  };
}

/** Load profile for account hub — creates a row if the auth trigger missed it. */
export async function ensureCustomerProfile(user: User): Promise<CustomerProfileRow> {
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as CustomerProfileRow;

  const seed = fallbackProfile(user);
  const { data: inserted } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: seed.email,
      full_name: seed.full_name,
      phone: seed.phone,
    })
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (inserted) return inserted as CustomerProfileRow;

  const { data: retry } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  return (retry as CustomerProfileRow | null) ?? seed;
}
