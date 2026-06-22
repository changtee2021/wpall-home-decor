import { supabase } from "@/integrations/supabase/client";

export type CustomizeStatus = "ready" | "incomplete" | "none";

export interface CustomizeProductRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  category: string | null;
  image_url: string | null;
  images: string[];
  sale_price: number;
  base_price: number;
  badge: string | null;
  is_active: boolean;
  hotspotCount: number;
  status: CustomizeStatus;
  issues: string[];
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  category: string | null;
  image_url: string | null;
  images: string[] | null;
  sale_price: number | null;
  base_price: number | null;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
};

type HotspotRow = {
  product_id: string;
  attribute_group_id: string;
};

type OptionRow = {
  group_id: string;
  is_active: boolean;
};

function hasProductImage(p: ProductRow): boolean {
  if (p.image_url?.trim()) return true;
  return Array.isArray(p.images) && p.images.some((x) => typeof x === "string" && x.trim());
}

export function evaluateCustomizeStatus(
  product: ProductRow,
  hotspots: HotspotRow[],
  activeOptionsByGroup: Map<string, number>,
): Pick<CustomizeProductRow, "hotspotCount" | "status" | "issues"> {
  const productHotspots = hotspots.filter((h) => h.product_id === product.id);
  const hotspotCount = productHotspots.length;
  const issues: string[] = [];

  if (hotspotCount === 0) {
    return { hotspotCount: 0, status: "none", issues: ["ยังไม่มี hotspot"] };
  }

  if (!product.is_active) issues.push("ปิดการขาย");
  if (!hasProductImage(product)) issues.push("ยังไม่มีรูปภาพ");

  for (const h of productHotspots) {
    const optCount = activeOptionsByGroup.get(h.attribute_group_id) ?? 0;
    if (optCount === 0) issues.push("กลุ่มตัวเลือกไม่มีรายการ");
  }

  const uniqueIssues = Array.from(new Set(issues));
  const status: CustomizeStatus = uniqueIssues.length === 0 ? "ready" : "incomplete";

  return { hotspotCount, status, issues: uniqueIssues };
}

export async function fetchCustomizeCatalog(opts?: {
  activeOnly?: boolean;
}): Promise<CustomizeProductRow[]> {
  const activeOnly = opts?.activeOnly ?? false;

  const productQuery = supabase
    .from("products")
    .select(
      "id,slug,name,kind,category,image_url,images,sale_price,base_price,badge,is_active,sort_order",
    )
    .order("sort_order");

  if (activeOnly) productQuery.eq("is_active", true);

  const [{ data: products, error: prodErr }, { data: hotspots }, { data: options }] =
    await Promise.all([
      productQuery,
      supabase.from("product_hotspots").select("product_id,attribute_group_id"),
      supabase.from("attribute_options").select("group_id,is_active"),
    ]);

  if (prodErr) throw new Error(prodErr.message);

  const activeOptionsByGroup = new Map<string, number>();
  for (const o of (options ?? []) as OptionRow[]) {
    if (!o.is_active) continue;
    activeOptionsByGroup.set(o.group_id, (activeOptionsByGroup.get(o.group_id) ?? 0) + 1);
  }

  const hotspotList = (hotspots ?? []) as HotspotRow[];

  return ((products ?? []) as ProductRow[]).map((p) => {
    const evalResult = evaluateCustomizeStatus(p, hotspotList, activeOptionsByGroup);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      kind: p.kind,
      category: p.category,
      image_url: p.image_url,
      images: Array.isArray(p.images) ? p.images : [],
      sale_price: Number(p.sale_price ?? p.base_price ?? 0),
      base_price: Number(p.base_price ?? 0),
      badge: p.badge,
      is_active: p.is_active,
      ...evalResult,
    };
  });
}

export function statusLabel(status: CustomizeStatus): string {
  switch (status) {
    case "ready":
      return "พร้อมแสดง";
    case "incomplete":
      return "ตั้งไม่ครบ";
    default:
      return "ยังไม่ตั้ง";
  }
}
