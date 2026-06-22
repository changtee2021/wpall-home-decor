import { supabase } from "@/integrations/supabase/client";
import type { ProductKind } from "./product-kinds";

export interface Category {
  id: string;
  kind: ProductKind;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  affiliate_commission_pct: number | null;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id,kind,name,slug,parent_id,sort_order,is_active,affiliate_commission_pct")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export function buildTree(cats: Category[]) {
  const roots = cats.filter((c) => !c.parent_id);
  const children = (id: string) => cats.filter((c) => c.parent_id === id);
  return { roots, children };
}

export async function fetchActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id,kind,name,slug,parent_id,sort_order,is_active,affiliate_commission_pct")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export function findCategoryBySlug(categories: Category[], slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/** Category id + all descendants (for filtering products assigned to subcategories). */
export function collectSubtreeIds(categories: Category[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function categoryProductsSearch(slug: string) {
  return { cat: slug };
}

export function matchesCategoryFilter(
  product: { category_id: string | null; kind: string },
  categories: Category[],
  slug: string | undefined,
  kind: string | undefined,
): boolean {
  if (!slug && !kind) return true;

  if (slug) {
    const cat = findCategoryBySlug(categories, slug);
    if (!cat) return false;
    const ids = collectSubtreeIds(categories, cat.id);
    if (product.category_id && ids.has(product.category_id)) return true;
    // Unassigned products still show under their kind's root category.
    if (!product.category_id && !cat.parent_id && cat.kind === product.kind) return true;
    return false;
  }

  return product.kind === kind;
}
