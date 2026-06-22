/** Route param for /products/$id — prefers stable slug URLs over UUID. */
export function productRouteParam(product: { id: string; slug?: string | null }): string {
  const slug = product.slug?.trim();
  return slug || product.id;
}

export function productPublicPath(product: { id: string; slug?: string | null }): string {
  return `/products/${encodeURIComponent(productRouteParam(product))}`;
}
