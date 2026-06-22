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

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeWallet(row: Record<string, unknown>): Wallet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    balance: toNumber(row.balance),
    total_topup: toNumber(row.total_topup),
    total_spent: toNumber(row.total_spent),
  };
}

function normalizeTx(row: Record<string, unknown>): WalletTx {
  const type = row.type;
  const safeType =
    type === "topup" || type === "payment" || type === "refund" || type === "adjust"
      ? type
      : "adjust";
  return {
    id: String(row.id),
    type: safeType,
    amount: toNumber(row.amount),
    balance_after: toNumber(row.balance_after),
    note: row.note == null ? null : String(row.note),
    created_at: String(row.created_at),
  };
}

function normalizeTopup(row: Record<string, unknown>): TopupRequest {
  const status = row.status;
  const safeStatus =
    status === "pending" || status === "approved" || status === "rejected" || status === "cancelled"
      ? status
      : "pending";
  const method = row.method;
  const safeMethod =
    method === "bank_transfer" || method === "promptpay" || method === "credit_card"
      ? method
      : "bank_transfer";
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    amount: toNumber(row.amount),
    method: safeMethod,
    slip_url: row.slip_url == null ? null : String(row.slip_url),
    reference_note: row.reference_note == null ? null : String(row.reference_note),
    status: safeStatus,
    rejected_reason: row.rejected_reason == null ? null : String(row.rejected_reason),
    approved_at: row.approved_at == null ? null : String(row.approved_at),
    created_at: String(row.created_at),
  };
}

export async function getMyWallet(userId: string): Promise<Wallet | null> {
  const { data } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (data) return normalizeWallet(data as Record<string, unknown>);

  const { data: created, error } = await supabase
    .from("wallets")
    .insert({ user_id: userId })
    .select("*")
    .maybeSingle();
  if (created) return normalizeWallet(created as Record<string, unknown>);
  if (error) {
    const { data: retry } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return retry ? normalizeWallet(retry as Record<string, unknown>) : null;
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
  return (data ?? []).map((row) => normalizeTx(row as Record<string, unknown>));
}

export async function getMyTopups(userId: string): Promise<TopupRequest[]> {
  const { data } = await supabase
    .from("topup_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => normalizeTopup(row as Record<string, unknown>));
}

export const TOPUP_PRESETS = [100, 500, 1000, 2000, 5000, 10000];
