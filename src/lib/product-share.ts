import { appPublicUrl } from "@/lib/app-public-url";
import { productPublicPath } from "@/lib/product-route";

export interface ProductShareTarget {
  id: string;
  slug?: string | null;
  name: string;
}

export function productShareUrl(product: ProductShareTarget): string {
  const path = productPublicPath(product);
  const base =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : appPublicUrl();
  return `${base}${path}`;
}

export function productShareText(product: ProductShareTarget): string {
  return `${product.name} · WP ALL`;
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function lineShareUrl(url: string): string {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
}

export function twitterShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function openShareWindow(shareUrl: string): void {
  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=520");
}

export async function copyProductLink(url: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }
  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

export async function nativeShareProduct(
  product: ProductShareTarget,
  url: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  await navigator.share({
    title: product.name,
    text: productShareText(product),
    url,
  });
  return true;
}
