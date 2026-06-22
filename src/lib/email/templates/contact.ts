import { escapeHtml } from "@/lib/email.server";
import { COMPANY_EMAIL } from "@/lib/company";
import { emailLayout } from "@/lib/email/brand-layout";

export function buildContactAutoReplyEmail(name: string): string {
  const body = `
    <p>สวัสดีคุณ${escapeHtml(name)},</p>
    <p>ขอบคุณที่ติดต่อ <strong>WP ALL</strong> เราได้รับข้อความของคุณแล้ว</p>
    <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;font-size:13px;">
      ทีมงานจะติดต่อกลับภายใน <strong>1 วันทำการ</strong> (จ–ส 9:00–18:00)<br/>
      หากเร่งด่วน โทรหรืออีเมล ${COMPANY_EMAIL}
    </p>
  `;
  return emailLayout({
    title: "ได้รับข้อความแล้ว",
    subtitle: "Thank you for contacting us",
    bodyHtml: body,
  });
}
