import { supabase } from "@/integrations/supabase/client";

export type AffiliateStatus = "pending" | "active" | "suspended" | "rejected";
export type CommissionStatus = "accrued" | "clawed_back" | "in_payout" | "paid";
export type PayoutStatus = "draft" | "processing" | "paid" | "cancelled";

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  status: AffiliateStatus;
  accepted_terms_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  total_orders: number;
  total_commission_accrued: number;
  total_commission_paid: number;
  created_at: string;
}

export interface AffiliateBankAccount {
  id: string;
  affiliate_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  order_id: string;
  product_name: string;
  line_amount: number;
  commission_pct: number;
  commission_amount: number;
  status: CommissionStatus;
  accrued_at: string;
  paid_at: string | null;
}

export interface AffiliatePayout {
  id: string;
  period_year: number;
  period_month: number;
  status: PayoutStatus;
  total_amount: number;
  commission_count: number;
  affiliate_count: number;
  company_transfer_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

export const THAI_BANKS = [
  { code: "002", name: "ธนาคารกรุงเทพ (BBL)" },
  { code: "004", name: "ธนาคารกสิกรไทย (KBANK)" },
  { code: "006", name: "ธนาคารกรุงไทย (KTB)" },
  { code: "011", name: "ธนาคารทหารไทยธนชาต (TTB)" },
  { code: "014", name: "ธนาคารไทยพาณิชย์ (SCB)" },
  { code: "025", name: "ธนาคารกรุงศรีอยุธยา (BAY)" },
  { code: "030", name: "ธนาคารออมสิน (GSB)" },
  { code: "034", name: "ธนาคารเพื่อการเกษตร (ธ.ก.ส.)" },
  { code: "069", name: "ธนาคารเกียรตินาคินภัทร (KKP)" },
  { code: "073", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)" },
] as const;

export const AFFILIATE_STATUS_LABELS: Record<AffiliateStatus, string> = {
  pending: "รออนุมัติ",
  active: "ใช้งานได้",
  suspended: "ระงับชั่วคราว",
  rejected: "ไม่ผ่าน",
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  accrued: "รอจ่าย (เดือนถัดไป)",
  clawed_back: "ยกเลิก/คืนเงิน",
  in_payout: "อยู่ในรอบจ่าย",
  paid: "โอนแล้ว",
};

export async function getMyAffiliate(userId: string): Promise<Affiliate | null> {
  const { data } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as Affiliate | null;
}

export async function getMyAffiliateCommissions(
  affiliateId: string,
): Promise<AffiliateCommission[]> {
  const { data } = await supabase
    .from("affiliate_commissions")
    .select(
      "id,affiliate_id,order_id,product_name,line_amount,commission_pct,commission_amount,status,accrued_at,paid_at",
    )
    .eq("affiliate_id", affiliateId)
    .order("accrued_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AffiliateCommission[];
}

export async function getMyBankAccounts(affiliateId: string): Promise<AffiliateBankAccount[]> {
  const { data } = await supabase
    .from("affiliate_bank_accounts")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as AffiliateBankAccount[];
}
