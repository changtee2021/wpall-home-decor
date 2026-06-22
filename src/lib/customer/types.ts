import type { Tier } from "@/lib/tier";

export interface CustomerProfile {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  tier: Tier;
  total_spent: number;
  order_count: number;
  avatar_url?: string | null;
}

export interface CustomerAddress {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  district: string | null;
  province: string;
  postal_code: string;
  is_default: boolean;
}
