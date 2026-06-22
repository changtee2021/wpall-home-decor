/** PromptPay EMVCo QR payload (browser-safe, no Node Buffer) */

const ID_PAYLOAD_FORMAT = "00";
const ID_POI_METHOD = "01";
const ID_MERCHANT_INFORMATION_BOT = "29";
const ID_TRANSACTION_CURRENCY = "53";
const ID_TRANSACTION_AMOUNT = "54";
const ID_COUNTRY_CODE = "58";
const ID_CRC = "63";

const PAYLOAD_FORMAT_EMV_QRCPS_MERCHANT_PRESENTED_MODE = "01";
const POI_METHOD_STATIC = "11";
const POI_METHOD_DYNAMIC = "12";
const MERCHANT_INFORMATION_TEMPLATE_ID_GUID = "00";
const BOT_ID_MERCHANT_PHONE_NUMBER = "01";
const BOT_ID_MERCHANT_TAX_ID = "02";
const BOT_ID_MERCHANT_EWALLET_ID = "03";
const GUID_PROMPTPAY = "A000000677010111";
const TRANSACTION_CURRENCY_THB = "764";
const COUNTRY_CODE_TH = "TH";

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function serialize(parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join("");
}

function sanitizeTarget(id: string): string {
  return id.replace(/\D/g, "");
}

function formatTarget(id: string): string {
  const numbers = sanitizeTarget(id);
  if (numbers.length >= 13) return numbers;
  return `0000000000000${numbers.replace(/^0/, "66")}`.slice(-13);
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatCrc(crcValue: number): string {
  return `0000${crcValue.toString(16).toUpperCase()}`.slice(-4);
}

/** CRC-16/XMODEM (poly 0x1021, init 0xFFFF) — matches promptpay-qr */
function crc16xmodem(str: string, init = 0xffff): number {
  let crc = init;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** Build PromptPay EMVCo payload — omit amount for static biller QR */
export function buildPromptPayPayload(promptpayId: string, amount?: number): string {
  const target = sanitizeTarget(promptpayId);
  if (!target) throw new Error("Invalid PromptPay ID");
  if (amount != null && amount <= 0) throw new Error("Amount must be positive");

  const targetType =
    target.length >= 15
      ? BOT_ID_MERCHANT_EWALLET_ID
      : target.length >= 13
        ? BOT_ID_MERCHANT_TAX_ID
        : BOT_ID_MERCHANT_PHONE_NUMBER;

  const data: (string | false)[] = [
    tlv(ID_PAYLOAD_FORMAT, PAYLOAD_FORMAT_EMV_QRCPS_MERCHANT_PRESENTED_MODE),
    tlv(ID_POI_METHOD, amount ? POI_METHOD_DYNAMIC : POI_METHOD_STATIC),
    tlv(
      ID_MERCHANT_INFORMATION_BOT,
      serialize([
        tlv(MERCHANT_INFORMATION_TEMPLATE_ID_GUID, GUID_PROMPTPAY),
        tlv(targetType, formatTarget(target)),
      ]),
    ),
    tlv(ID_COUNTRY_CODE, COUNTRY_CODE_TH),
    tlv(ID_TRANSACTION_CURRENCY, TRANSACTION_CURRENCY_THB),
    amount != null && tlv(ID_TRANSACTION_AMOUNT, formatAmount(amount)),
  ];

  const dataToCrc = `${serialize(data)}${ID_CRC}04`;
  data.push(tlv(ID_CRC, formatCrc(crc16xmodem(dataToCrc, 0xffff))));
  return serialize(data);
}

/** QR image via public API (no canvas dependency) */
export function promptPayQrImageUrl(payload: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
