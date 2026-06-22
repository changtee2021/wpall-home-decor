import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompareList } from "@/hooks/use-compare-list";
import {
  buildCompareRows,
  getLowestPriceIndices,
  getLowestRefIndices,
  getStockBadge,
  type CompareProduct,
} from "@/lib/compare";
import type { PDAttrGroup } from "@/components/product/product-detail";
import { productRouteParam } from "@/lib/product-route";
import { cn } from "@/lib/utils";

interface CompareTableProps {
  products: CompareProduct[];
  groupsByProduct: Map<string, PDAttrGroup[]>;
  refPrices: number[];
  onRemove: (id: string) => void;
  onAddToCart: (product: CompareProduct, groups: PDAttrGroup[]) => void;
  addingId: string | null;
}

export function CompareTable({
  products,
  groupsByProduct,
  refPrices,
  onRemove,
  onAddToCart,
  addingId,
}: CompareTableProps) {
  const rows = buildCompareRows(products, groupsByProduct, refPrices);
  const lowestSale = getLowestPriceIndices(products);
  const lowestRef = getLowestRefIndices(refPrices);

  return (
    <>
      {/* Desktop matrix */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-40 min-w-[10rem]">
                รายการ
              </th>
              {products.map((p) => (
                <th key={p.id} className="px-4 py-3 text-left align-top min-w-[11rem]">
                  <ProductHeader
                    product={p}
                    onRemove={() => onRemove(p.id)}
                    onAddToCart={() => onAddToCart(p, groupsByProduct.get(p.id) ?? [])}
                    adding={addingId === p.id}
                    compact={false}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <td className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  {row.label}
                </td>
                {row.values.map((val, i) => {
                  const highlight =
                    row.highlightLowest &&
                    ((row.key === "sale_price" && lowestSale.has(i)) ||
                      (row.key === "ref_price" && lowestRef.has(i)));
                  return (
                    <td
                      key={i}
                      className={cn(
                        "px-4 py-2.5 text-xs",
                        highlight && "bg-success/10 font-medium",
                      )}
                    >
                      {val ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden">
        <CompareMobile
          products={products}
          rows={rows}
          groupsByProduct={groupsByProduct}
          lowestSale={lowestSale}
          lowestRef={lowestRef}
          onRemove={onRemove}
          onAddToCart={onAddToCart}
          addingId={addingId}
        />
      </div>
    </>
  );
}

function CompareMobile({
  products,
  rows,
  groupsByProduct,
  lowestSale,
  lowestRef,
  onRemove,
  onAddToCart,
  addingId,
}: {
  products: CompareProduct[];
  rows: ReturnType<typeof buildCompareRows>;
  groupsByProduct: Map<string, PDAttrGroup[]>;
  lowestSale: Set<number>;
  lowestRef: Set<number>;
  onRemove: (id: string) => void;
  onAddToCart: (product: CompareProduct, groups: PDAttrGroup[]) => void;
  addingId: string | null;
}) {
  const [tab, setTab] = useState("0");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full flex overflow-x-auto justify-start h-auto gap-1 bg-muted/50 p-1">
        {products.map((p, i) => (
          <TabsTrigger
            key={p.id}
            value={String(i)}
            className="text-xs shrink-0 max-w-[8rem] truncate"
          >
            สินค้า {i + 1}
          </TabsTrigger>
        ))}
      </TabsList>
      {products.map((p, pi) => (
        <TabsContent key={p.id} value={String(pi)} className="mt-4 space-y-4">
          <ProductHeader
            product={p}
            onRemove={() => onRemove(p.id)}
            onAddToCart={() => onAddToCart(p, groupsByProduct.get(p.id) ?? [])}
            adding={addingId === p.id}
            compact
          />
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) => {
                  const val = row.values[pi];
                  const highlight =
                    row.highlightLowest &&
                    ((row.key === "sale_price" && lowestSale.has(pi)) ||
                      (row.key === "ref_price" && lowestRef.has(pi)));
                  return (
                    <tr key={row.key} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 bg-muted/40 text-xs text-muted-foreground w-2/5">
                        {row.label}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-xs",
                          highlight && "bg-success/10 font-medium",
                        )}
                      >
                        {val ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ProductHeader({
  product,
  onRemove,
  onAddToCart,
  adding,
  compact,
}: {
  product: CompareProduct;
  onRemove: () => void;
  onAddToCart: () => void;
  adding: boolean;
  compact: boolean;
}) {
  const stock = getStockBadge(product.stock, product.unit);

  return (
    <div className={cn("space-y-2", compact && "pb-2")}>
      <Link to="/products/$id" params={{ id: productRouteParam(product) }} className="block group">
        <div
          className={cn(
            "rounded-lg border border-border bg-muted overflow-hidden mb-2",
            compact ? "aspect-square max-w-[120px]" : "aspect-square w-full max-w-[140px]",
          )}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/40">
              🪟
            </div>
          )}
        </div>
        <div className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-primary">
          {product.name}
        </div>
        {product.category && (
          <div className="text-[10px] text-muted-foreground mt-0.5">{product.category}</div>
        )}
        {product.badge && (
          <span className="inline-block mt-1 text-[10px] font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
            {product.badge}
          </span>
        )}
      </Link>
      <span
        className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded border", stock.cls)}
      >
        {stock.label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          className="min-h-[44px] text-xs gap-1"
          onClick={onAddToCart}
          disabled={adding}
        >
          <ShoppingCart className="size-3.5" />
          ใส่ตะกร้า
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] text-xs gap-1"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          ลบ
        </Button>
      </div>
    </div>
  );
}

export function CompareToggleButton({
  item,
  className = "",
}: {
  item: import("@/lib/compare").CompareItem;
  className?: string;
}) {
  const { isSelected, toggle, isFull } = useCompareList();
  const selected = isSelected(item.id);
  const disabled = isFull && !selected;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("min-h-[44px] gap-2", className)}
      onClick={() => toggle(item)}
      disabled={disabled}
    >
      {selected ? (
        <>
          <Check className="size-4 text-success" />
          อยู่ในรายการเปรียบเทียบ
        </>
      ) : (
        <>เพิ่มในรายการเปรียบเทียบ</>
      )}
    </Button>
  );
}
