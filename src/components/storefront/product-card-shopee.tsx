import { Link } from "@tanstack/react-router";
import { fmtTHB, fmtSoldK } from "@/lib/pricing";
import { productRouteParam } from "@/lib/product-route";
import { compareItemFromShopee } from "@/lib/compare";
import { CompareCheckbox } from "./compare-checkbox";
import { FavoriteButton } from "./favorite-button";
import { ProductShareButton } from "./product-share-button";
import { RatingStars } from "./rating-stars";

export interface ShopeeProduct {
  id: string;
  slug?: string | null;
  name: string;
  image_url?: string | null;
  sale_price: number;
  base_price?: number | null;
  badge?: string | null;
  rating?: number;
  sold?: number;
}

export function ProductCardShopee({ p, customBadge }: { p: ShopeeProduct; customBadge?: string }) {
  const hasDiscount = p.base_price && p.base_price > p.sale_price;
  const off = hasDiscount ? Math.round((1 - p.sale_price / (p.base_price as number)) * 100) : 0;
  const badgeLabel = customBadge ?? p.badge;
  return (
    <Link
      to="/products/$id"
      params={{ id: productRouteParam(p) }}
      className="block bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow group"
    >
      <div className="aspect-square bg-muted relative">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/40">
            🪟
          </div>
        )}
        <CompareCheckbox item={compareItemFromShopee(p)} />
        {badgeLabel && (
          <span className="absolute top-1.5 left-1.5 ml-11 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded max-w-[calc(100%-5rem)] truncate">
            {badgeLabel}
          </span>
        )}
        <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center">
          <ProductShareButton product={p} />
          <FavoriteButton productId={p.id} />
        </div>
      </div>
      <div className="p-2.5 space-y-1">
        <div className="text-xs line-clamp-2 min-h-[2rem] leading-snug">{p.name}</div>
        {off > 0 && (
          <span className="inline-block bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{off}%
          </span>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-secondary font-bold text-sm">{fmtTHB(p.sale_price)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-muted-foreground line-through">
              {fmtTHB(p.base_price as number)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {p.rating != null && <RatingStars value={p.rating} size={10} />}
          {p.sold != null && p.sold > 0 && <span>sold {fmtSoldK(p.sold)}</span>}
        </div>
      </div>
    </Link>
  );
}
