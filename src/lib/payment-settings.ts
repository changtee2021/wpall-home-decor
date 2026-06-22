import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PAYMENT_FEE_RATES,
  DEFAULT_PAYMENT_INFO,
  parsePaymentFeeRates,
  parsePaymentInfo,
  type PaymentFeeRates,
  type PaymentInfo,
} from "@/lib/payment-fees";

export async function fetchPaymentInfo(): Promise<PaymentInfo> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "payment_info")
    .maybeSingle();
  if (data?.value) return parsePaymentInfo(data.value);
  return { ...DEFAULT_PAYMENT_INFO };
}

export async function fetchPaymentFeeRates(): Promise<PaymentFeeRates> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "payment_fee_rates")
    .maybeSingle();
  if (data?.value) return parsePaymentFeeRates(data.value);
  return { ...DEFAULT_PAYMENT_FEE_RATES };
}

export async function savePaymentInfo(info: PaymentInfo): Promise<void> {
  const accounts = info.accounts?.length ? info.accounts : undefined;
  const normalized: PaymentInfo = {
    ...info,
    accounts,
    bank: accounts?.[0]?.bank ?? info.bank,
    account: accounts?.[0]?.account ?? info.account,
    promptpay: info.biller_id ?? info.promptpay,
    biller_id: info.biller_id ?? info.promptpay,
  };
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "payment_info",
      brand_name: "Payment Info",
      value: normalized,
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

export async function savePaymentFeeRates(rates: PaymentFeeRates): Promise<void> {
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: "payment_fee_rates",
      brand_name: "Payment Fee Rates",
      value: rates,
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}
