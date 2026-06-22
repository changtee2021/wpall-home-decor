/** Unified cart line item used across storefront, server, and DB */
export interface ShopCartItem {
  id: string;
  productId: string | null;
  productName: string;
  config: Record<string, unknown>;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string | null;
}

export interface ShopCart {
  id: string;
  items: ShopCartItem[];
}

/** Build config snapshot for order line from product detail selections */
export function buildCartConfig(input: {
  widthCm: number;
  heightCm: number;
  qty: number;
  attributes?: Array<{ group: string; value: string; optionId?: string }>;
  fabricId?: string;
  fabricCode?: string;
  curtainType?: string;
  fullness?: number;
}): Record<string, unknown> {
  return {
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    width_cm: input.widthCm,
    height_cm: input.heightCm,
    quantity: input.qty,
    fabricId: input.fabricId ?? "",
    fabricCode: input.fabricCode ?? "",
    color_code: input.fabricCode ?? "",
    curtainType: input.curtainType ?? "s_fold",
    fullness: input.fullness ?? 2.5,
    trackId: "",
    accessoryIds: [] as string[],
    attributes: input.attributes ?? [],
  };
}
