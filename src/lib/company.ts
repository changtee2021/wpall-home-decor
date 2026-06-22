/** WP Trading Intergroup — canonical company contact for wpall-home-decor */

export const COMPANY_EMAIL = "info@wpallin1.com";
export const COMPANY_EMAIL_FROM = `WP ALL <${COMPANY_EMAIL}>`;

export const COMPANY_NAME_TH = "บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด";
export const COMPANY_NAME_EN = "WP Trading Intergroup Co., Ltd.";
export const COMPANY_TAX_ID = "010556405549615";
export const COMPANY_WEBSITE = "https://wpallin1.com";

/** Legacy emails replaced by COMPANY_EMAIL */
const LEGACY_EMAILS = new Set(["hello@wpall.co.th", "hello@wpall.com", "noreply@wpall.co.th"]);

/** Resolve display/send email — always falls back to company inbox. */
export function companyEmail(fromSettings?: string | null): string {
  const trimmed = fromSettings?.trim();
  if (!trimmed) return COMPANY_EMAIL;
  if (LEGACY_EMAILS.has(trimmed.toLowerCase())) return COMPANY_EMAIL;
  return trimmed;
}
