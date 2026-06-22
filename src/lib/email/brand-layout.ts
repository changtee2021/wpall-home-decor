import { escapeHtml } from "@/lib/email.server";
import {
  COMPANY_EMAIL,
  COMPANY_NAME_EN,
  COMPANY_NAME_TH,
  COMPANY_TAX_ID,
  COMPANY_WEBSITE,
} from "@/lib/company";

export function emailLayout(opts: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const { title, subtitle, bodyHtml, ctaLabel, ctaUrl } = opts;
  const ctaBlock =
    ctaLabel && ctaUrl && ctaUrl.startsWith("http")
      ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#1a5c45;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;">
            ${escapeHtml(ctaLabel)}
          </a>
        </td>
      </tr>
    </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,60,45,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a5c45 0%,#2d8a66 50%,#f59e0b 100%);padding:28px 24px;text-align:center;">
            <div style="display:inline-block;background:#fff;border-radius:12px;padding:8px 12px;margin-bottom:12px;">
              <span style="font-size:20px;font-weight:800;color:#1a5c45;">WP</span><span style="font-size:20px;font-weight:800;color:#f59e0b;">ALL</span>
            </div>
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${escapeHtml(title)}</h1>
            ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${escapeHtml(subtitle)}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;font-size:14px;color:#334155;line-height:1.65;">
            ${bodyHtml}
            ${ctaBlock}
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;line-height:1.6;">
            <div style="font-weight:600;color:#334155;">${escapeHtml(COMPANY_NAME_TH)}</div>
            <div>${escapeHtml(COMPANY_NAME_EN)} · เลขประจำตัวผู้เสียภาษี ${COMPANY_TAX_ID}</div>
            <div style="margin-top:8px;">
              <a href="mailto:${COMPANY_EMAIL}" style="color:#1a5c45;text-decoration:none;">${COMPANY_EMAIL}</a>
              · <a href="${COMPANY_WEBSITE}" style="color:#1a5c45;text-decoration:none;">wpallin1.com</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailTable(headers: string[], rows: string[][]): string {
  const head = headers
    .map(
      (h) =>
        `<th style="padding:8px 10px;text-align:left;background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#64748b;">${escapeHtml(h)}</th>`,
    )
    .join("");
  const body = rows
    .map(
      (cells) =>
        `<tr>${cells.map((c) => `<td style="padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px;vertical-align:top;">${c}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${head ? `<thead><tr>${head}</tr></thead>` : ""}<tbody>${body}</tbody></table>`;
}

export function emailSummaryRow(label: string, value: string, bold = false): string {
  return `<tr>
    <td style="padding:4px 0;color:#64748b;font-size:13px;">${escapeHtml(label)}</td>
    <td style="padding:4px 0;text-align:right;font-size:13px;${bold ? "font-weight:700;font-size:16px;color:#1a5c45;" : ""}">${value}</td>
  </tr>`;
}

export function emailSummaryTable(rows: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">${rows}</table>`;
}

export function appPublicUrlServer(): string {
  return (
    process.env.VITE_APP_PUBLIC_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim() ||
    "https://wpall-home-decor.vercel.app"
  ).replace(/\/$/, "");
}
