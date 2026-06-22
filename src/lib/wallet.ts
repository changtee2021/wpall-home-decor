import { supabase } from "@/integrations/supabase/client";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_topup: number;
  total_spent: number;
}

export interface WalletTx {
  id: string;
  type: "topup" | "payment" | "refund" | "adjust";
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

export interface TopupRequest {
  id: string;
  user_id: string;
  amount: number;
  method: "bank_transfer" | "promptpay" | "credit_card";
  slip_url: string | null;
  reference_note: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejected_reason: string | null;
  approved_at: string | null;
  created_at: string;
}

export async function getMyWallet(userId: string): Promise<Wallet | null> {
  const { data } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as Wallet;

  const { data: created, error } = await supabase
    .from("wallets")
    .insert({ user_id: userId })
    .select("*")
    .maybeSingle();
  if (created) return created as Wallet;
  if (error) {
    const { data: retry } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (retry as Wallet | null) ?? null;
  }
  return null;
}

export async function getMyTransactions(userId: string, limit = 50): Promise<WalletTx[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as WalletTx[];
}

export async function getMyTopups(userId: string): Promise<TopupRequest[]> {
  const { data } = await supabase
    .from("topup_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as TopupRequest[];
}

export const TOPUP_PRESETS = [100, 500, 1000, 2000, 5000, 10000];
