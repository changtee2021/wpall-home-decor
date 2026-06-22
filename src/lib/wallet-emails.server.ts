import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getEmailTo, sendEmailSafe } from "@/lib/email.server";
import { getUserEmail } from "@/lib/email/order-data";
import {
  buildTopupApprovedEmail,
  buildTopupRejectedEmail,
  buildTopupSubmittedAdminEmail,
  buildTopupSubmittedCustomerEmail,
} from "@/lib/email/templates/wallet";

type TopupRow = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
};

async function fetchTopup(topupId: string): Promise<TopupRow | null> {
  const { data, error } = await supabaseAdmin
    .from("topup_requests")
    .select("id, user_id, amount, method, status")
    .eq("id", topupId)
    .maybeSingle();
  if (error || !data) return null;
  return data as TopupRow;
}

async function getCustomerName(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name ?? null;
}

async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.balance ?? 0);
}

export async function notifyTopupSubmitted(topupId: string): Promise<void> {
  const topup = await fetchTopup(topupId);
  if (!topup) return;

  const [customerEmail, customerName] = await Promise.all([
    getUserEmail(topup.user_id),
    getCustomerName(topup.user_id),
  ]);

  if (customerEmail) {
    sendEmailSafe({
      to: customerEmail,
      subject: `[WP ALL] รับคำขอเติมเงิน Wallet แล้ว`,
      html: buildTopupSubmittedCustomerEmail({
        amount: topup.amount,
        method: topup.method,
        customerName,
      }),
    });
  }

  sendEmailSafe({
    to: getEmailTo(),
    subject: `[WP ALL Admin] คำขอเติมเงิน Wallet ฿${topup.amount.toLocaleString("th-TH")}`,
    html: buildTopupSubmittedAdminEmail({
      amount: topup.amount,
      method: topup.method,
      customerName,
      customerEmail,
    }),
  });
}

export async function notifyTopupApproved(topupId: string): Promise<void> {
  const topup = await fetchTopup(topupId);
  if (!topup) return;

  const [customerEmail, customerName, balance] = await Promise.all([
    getUserEmail(topup.user_id),
    getCustomerName(topup.user_id),
    getWalletBalance(topup.user_id),
  ]);
  if (!customerEmail) return;

  sendEmailSafe({
    to: customerEmail,
    subject: `[WP ALL] เติมเงิน Wallet สำเร็จ ฿${topup.amount.toLocaleString("th-TH")}`,
    html: buildTopupApprovedEmail({
      amount: topup.amount,
      balance,
      customerName,
    }),
  });
}

export async function notifyTopupRejected(topupId: string, reason: string): Promise<void> {
  const topup = await fetchTopup(topupId);
  if (!topup) return;

  const [customerEmail, customerName] = await Promise.all([
    getUserEmail(topup.user_id),
    getCustomerName(topup.user_id),
  ]);
  if (!customerEmail) return;

  sendEmailSafe({
    to: customerEmail,
    subject: `[WP ALL] ไม่สามารถเติมเงิน Wallet ได้`,
    html: buildTopupRejectedEmail({
      amount: topup.amount,
      reason,
      customerName,
    }),
  });
}
