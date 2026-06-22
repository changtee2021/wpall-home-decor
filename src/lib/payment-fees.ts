/** Checkout payment methods and channel fee pass-through */

export const PAYMENT_METHODS = [
  "promptpay_direct",
  "wallet",
  "transfer",
  "cod",
  "c2c2p_card",
  "c2c2p_wallet",
  "c2c2p_installment",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentFeeRates {
  promptpay_direct: number;
  wallet: number;
  transfer: number;
  cod_flat: number;
  c2c2p_card: number;
  c2c2p_wallet: number;
  c2c2p_installment: number;
}

export const DEFAULT_PAYMENT_FEE_RATES: PaymentFeeRates = {
  promptpay_direct: 0,
  wallet: 0,
  transfer: 0,
  cod_flat: 0,
  c2c2p_card: 0.0365,
  c2c2p_wallet: 0.015,
  c2c2p_installment: 0.05,
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  promptpay_direct: "PromptPay QR",
  wallet: "WP Wallet",
  transfer: "โอนธนาคาร",
  cod: "เก็บเงินปลายทาง",
  c2c2p_card: "บัตรเครดิต (2C2P)",
  c2c2p_wallet: "E-Wallet (2C2P)",
  c2c2p_installment: "ผ่อนชำระ (2C2P)",
};

export function parsePaymentFeeRates(raw: unknown): PaymentFeeRates {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PAYMENT_FEE_RATES };
  const o = raw as Record<string, unknown>;
  return {
    promptpay_direct: num(o.promptpay_direct, DEFAULT_PAYMENT_FEE_RATES.promptpay_direct),
    wallet: num(o.wallet, DEFAULT_PAYMENT_FEE_RATES.wallet),
    transfer: num(o.transfer, DEFAULT_PAYMENT_FEE_RATES.transfer),
    cod_flat: num(o.cod_flat, DEFAULT_PAYMENT_FEE_RATES.cod_flat),
    c2c2p_card: num(o.c2c2p_card, DEFAULT_PAYMENT_FEE_RATES.c2c2p_card),
    c2c2p_wallet: num(o.c2c2p_wallet, DEFAULT_PAYMENT_FEE_RATES.c2c2p_wallet),
    c2c2p_installment: num(o.c2c2p_installment, DEFAULT_PAYMENT_FEE_RATES.c2c2p_installment),
  };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Round up to 2 decimal places (satang) */
export function roundFee(amount: number): number {
  return Math.ceil(amount * 100) / 100;
}

/** Calculate payment channel surcharge from base total (after VAT, before fee) */
export function calcPaymentFee(
  baseTotal: number,
  method: PaymentMethod,
  rates: PaymentFeeRates = DEFAULT_PAYMENT_FEE_RATES,
): number {
  if (baseTotal <= 0) return 0;
  switch (method) {
    case "cod":
      return roundFee(rates.cod_flat);
    case "promptpay_direct":
    case "wallet":
    case "transfer":
      return roundFee(baseTotal * rates[method]);
    case "c2c2p_card":
      return roundFee(baseTotal * rates.c2c2p_card);
    case "c2c2p_wallet":
      return roundFee(baseTotal * rates.c2c2p_wallet);
    case "c2c2p_installment":
      return roundFee(baseTotal * rates.c2c2p_installment);
    default:
      return 0;
  }
}

export function feeRateLabel(method: PaymentMethod, rates: PaymentFeeRates): string | null {
  if (method === "cod") {
    return rates.cod_flat > 0 ? `ค่าบริการ ${rates.cod_flat} บาท` : null;
  }
  const pctMap: Partial<Record<PaymentMethod, number>> = {
    promptpay_direct: rates.promptpay_direct,
    wallet: rates.wallet,
    transfer: rates.transfer,
    c2c2p_card: rates.c2c2p_card,
    c2c2p_wallet: rates.c2c2p_wallet,
    c2c2p_installment: rates.c2c2p_installment,
  };
  const pct = pctMap[method];
  if (pct == null || pct <= 0) return null;
  return `${(pct * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export interface PaymentBankAccount {
  bank: string;
  account: string;
  type?: string;
}

export interface PaymentInfo {
  name?: string;
  tax_id?: string;
  biller_id?: string;
  promptpay?: string;
  accounts?: PaymentBankAccount[];
  /** @deprecated use accounts[] — kept for backward compatibility */
  bank?: string;
  /** @deprecated use accounts[] */
  account?: string;
}

export const DEFAULT_PAYMENT_INFO: PaymentInfo = {
  name: "บริษัท ดับบลิวพี เทรดดิ้ง อินเตอร์กรุ๊ป จำกัด",
  tax_id: "010556405549615",
  biller_id: "010556405549615",
  promptpay: "010556405549615",
  accounts: [
    { bank: "ธนาคารกสิกรไทย", account: "167-1-35178-5", type: "ออมทรัพย์" },
    { bank: "ธนาคารไทยพาณิชย์", account: "171-4-18448-5", type: "ออมทรัพย์" },
  ],
  bank: "ธนาคารกสิกรไทย",
  account: "167-1-35178-5",
};

export function resolvePromptPayId(info: PaymentInfo): string {
  return (info.biller_id ?? info.promptpay ?? info.tax_id ?? "").replace(/\D/g, "");
}

export function listBankAccounts(info: PaymentInfo): PaymentBankAccount[] {
  if (info.accounts?.length) return info.accounts;
  if (info.bank && info.account) return [{ bank: info.bank, account: info.account }];
  return [];
}

export function parsePaymentInfo(raw: unknown): PaymentInfo {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PAYMENT_INFO };
  const o = raw as Record<string, unknown>;
  const accountsRaw = o.accounts;
  let accounts: PaymentBankAccount[] | undefined;
  if (Array.isArray(accountsRaw)) {
    accounts = accountsRaw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const a = row as Record<string, unknown>;
        const bank = str(a.bank);
        const account = str(a.account);
        if (!bank || !account) return null;
        return { bank, account, type: str(a.type) };
      })
      .filter(Boolean) as PaymentBankAccount[];
  }
  return {
    name: str(o.name) ?? str(o.account_name) ?? DEFAULT_PAYMENT_INFO.name,
    tax_id: str(o.tax_id) ?? DEFAULT_PAYMENT_INFO.tax_id,
    biller_id: str(o.biller_id) ?? str(o.promptpay) ?? DEFAULT_PAYMENT_INFO.biller_id,
    promptpay: str(o.promptpay) ?? str(o.biller_id) ?? DEFAULT_PAYMENT_INFO.promptpay,
    accounts: accounts?.length ? accounts : DEFAULT_PAYMENT_INFO.accounts,
    bank: str(o.bank) ?? DEFAULT_PAYMENT_INFO.bank,
    account: str(o.account) ?? str(o.account_no) ?? DEFAULT_PAYMENT_INFO.account,
  };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
