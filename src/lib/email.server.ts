// Server-only transactional email via Resend API

import { COMPANY_EMAIL, COMPANY_EMAIL_FROM } from "@/lib/company";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

const DEFAULT_FROM = COMPANY_EMAIL_FROM;
const DEFAULT_TO = COMPANY_EMAIL;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { escapeHtml };

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

export function getEmailTo(): string {
  return process.env.EMAIL_TO?.trim() || DEFAULT_TO;
}

/** Returns true when sent successfully; false if not configured or failed. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.error("[email] RESEND_API_KEY not set; skipping send");
    return false;
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const recipients = to.map((e) => e.trim()).filter((e) => e.length > 0);
  if (recipients.length === 0) return false;

  const payload: Record<string, unknown> = {
    from: getEmailFrom(),
    to: recipients,
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) payload.reply_to = input.replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
    const text = await res.text().catch(() => "");
    console.error(`[email] Resend API failed: ${res.status} ${text.slice(0, 300)}`);
    return false;
  } catch (err) {
    console.error("[email] Resend fetch failed", err);
    return false;
  }
}

/** Fire-and-forget wrapper — never throws. */
export function sendEmailSafe(input: SendEmailInput): void {
  void sendEmail(input).catch((err) => console.error("[email] unexpected error", err));
}
