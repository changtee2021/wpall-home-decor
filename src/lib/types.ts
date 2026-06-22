export type CurtainType = "s_fold" | "pinch_pleat" | "eyelet" | "roman";
export type TrackType = "show" | "concealed" | "motorized";
export type CustomerTier = "retail" | "wholesale" | "vip";
export type Role = "customer" | "sales";

export interface Fabric {
  id: string;
  code: string;
  name: string;
  color: string;
  pricePerMeter: number; // THB
  costPerMeter: number;
  rollWidthCm: number;
  swatch: string; // hex/css color for preview
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  pricePerMeter: number;
  costPerMeter: number;
}

export interface Accessory {
  id: string;
  name: string;
  price: number;
  cost: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  curtainType: CurtainType;
  defaultFabricId: string;
  defaultTrackId: string;
  basePrice: number; // display starting price
  laborPerPanel: number;
  image: string; // gradient css or url
  bgClass: string;
  badge?: string;
}

export interface CurtainConfig {
  widthCm: number;
  heightCm: number;
  curtainType: CurtainType;
  fullness: number;
  fabricId: string;
  trackId: string;
  accessoryIds: string[];
  quantity: number;
}

export interface PriceBreakdown {
  fabricMeters: number;
  fabricCost: number;
  trackMeters: number;
  trackCost: number;
  accessoriesCost: number;
  labor: number;
  subtotal: number;
  costSubtotal: number; // for GP
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  config: CurtainConfig;
  price: PriceBreakdown;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  tier: CustomerTier;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  createdBySaleId: string | null;
  items: CartItem[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  status: "quotation" | "confirmed" | "in_production" | "delivered" | "paid";
  createdAt: string;
  taxInvoice?: {
    company: string;
    taxId: string;
    address: string;
  };
}
