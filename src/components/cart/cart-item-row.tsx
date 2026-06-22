import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtTHB } from "@/lib/pricing";
import { productRouteParam } from "@/lib/product-route";
import type { ShopCartItem } from "@/lib/cart.types";

interface ProductMeta {
  image_url: string | null;
  slug: string | null;
}

export function CartItemRow({
  item,
  product,
  selected,
  onSelect,
  onRemove,
  onUpdateQty,
}: {
  item: ShopCartItem;
  product?: ProductMeta;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  const cfg = item.config;
  const w = cfg.widthCm ?? cfg.width_cm;
  const h = cfg.heightCm ?? cfg.height_cm;
  const productLink =
    item.productId && product
      ? {
          to: "/products/$id" as const,
          params: { id: productRouteParam({ id: item.productId, slug: product.slug }) },
        }
      : null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex gap-3">
      <div className="flex items-start pt-1">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(v === true)}
          aria-label={`เลือก ${item.productName}`}
          className="size-5"
        />
      </div>

      {productLink ? (
        <Link
          {...productLink}
          className="size-20 sm:size-24 rounded-lg shrink-0 bg-muted overflow-hidden"
        >
          {product?.image_url ? (
            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              {item.productName.slice(0, 2)}
            </div>
          )}
        </Link>
      ) : (
        <div className="size-20 sm:size-24 rounded-lg shrink-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
          {product?.image_url ? (
            <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            item.productName.slice(0, 2)
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {productLink ? (
              <Link
                {...productLink}
                className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-primary"
              >
                {item.productName}
              </Link>
            ) : (
              <div className="font-semibold text-sm sm:text-base line-clamp-2">
                {item.productName}
              </div>
            )}
            {w && h && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {String(w)}×{String(h)} cm
              </div>
            )}
            {item.note && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.note}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="ลบสินค้า"
            className="text-muted-foreground hover:text-destructive p-2 -m-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="size-9 rounded-lg border border-border text-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => {
                if (item.qty <= 1) return;
                onUpdateQty(item.qty - 1);
              }}
            >
              −
            </button>
            <span className="text-sm w-8 text-center tabular-nums">{item.qty}</span>
            <button
              type="button"
              className="size-9 rounded-lg border border-border text-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => onUpdateQty(item.qty + 1)}
            >
              +
            </button>
          </div>
          <div className="text-primary font-bold text-sm sm:text-base">
            {fmtTHB(item.lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
