/** Thai-first locale defaults for wpall-home-decor UI and formatting. */
export const APP_LOCALE = "th-TH";
export const APP_LANG = "th";

const GENERIC_ERROR_TH = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หรือติดต่อทีมงานหากปัญหายังคงอยู่";

/** True when message is likely raw English from an API (not user Thai input). */
export function isLikelyEnglishSystemMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (/[\u0E00-\u0E7F]/.test(trimmed)) return false;
  return /^[ -~]+$/.test(trimmed);
}

/** Reverse UTF-8-as-Latin1 mojibake (à¸...) from legacy DB seed. */
export function fixUtf8Mojibake(text: string | null | undefined): string {
  const value = text ?? "";
  if (!value || (!value.includes("à") && !/[\u0E00-\u0E7F]/.test(value))) return value;
  if (/[\u0E00-\u0E7F]/.test(value) && !value.includes("à")) return value;
  try {
    const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return /[\u0E00-\u0E7F]/.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}

/** Prefer decoded DB text; safe for already-correct Thai. */
export function displayThaiText(text: string | null | undefined): string {
  return fixUtf8Mojibake(text);
}

/** Show Thai generic copy instead of leaking English API errors to shoppers. */
export function localizeUserFacingError(message: string | undefined | null): string {
  const trimmed = message?.trim();
  if (!trimmed || trimmed === "HTTPError" || trimmed.length > 180) {
    return GENERIC_ERROR_TH;
  }
  if (isLikelyEnglishSystemMessage(trimmed)) {
    return GENERIC_ERROR_TH;
  }
  return trimmed;
}

export function formatAppDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(APP_LOCALE, options);
}

export function formatAppDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(APP_LOCALE, options);
}
