import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getEmailTo, sendEmailSafe } from "@/lib/email.server";
import { getUserEmail } from "@/lib/email/order-data";

const STATUS_LABELS: Record<string, string> = {
  submitted: "รับเรื่องแล้ว",
  reviewing: "กำลังตรวจสอบ",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
  processing: "ดำเนินการ",
  completed: "เสร็จสิ้น",
};

export async function notifyClaimStatusChange(claimId: string, status: string): Promise<void> {
  const { data: claim } = await supabaseAdmin
    .from("product_claims")
    .select("id, claim_number, user_id, product_name, status")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim) return;

  const label = STATUS_LABELS[status] ?? status;
  const title = `อัปเดตเคลม ${claim.claim_number}`;
  const body = `สินค้า ${claim.product_name} — สถานะ: ${label}`;

  await supabaseAdmin.from("notifications").insert({
    user_id: claim.user_id,
    title,
    body,
    category: "claim",
    link: `/account/claims/${claim.id}`,
  });

  const email = await getUserEmail(claim.user_id);
  if (email) {
    sendEmailSafe({
      to: email,
      subject: `[WP ALL] ${title}`,
      html: `<p>${body}</p><p><a href="https://wpall-home-decor.vercel.app/account/claims/${claim.id}">ดูรายละเอียดเคลม</a></p>`,
    });
  }

  sendEmailSafe({
    to: getEmailTo(),
    subject: `[WP ALL Admin] เคลม ${claim.claim_number} → ${label}`,
    html: `<p>${body}</p>`,
  });
}
