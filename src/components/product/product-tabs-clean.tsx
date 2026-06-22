import { Check, Package, ShieldCheck, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtTHB } from "@/lib/pricing";
import { tierDiscount } from "@/lib/tier";
import type { Tier } from "@/lib/tier";
import type { PDProduct } from "@/components/product/product-detail";
import { ProductCardShopee, type ShopeeProduct } from "@/components/storefront/product-card-shopee";

interface ProductTabsCleanProps {
  product: PDProduct;
  attrs: Record<string, unknown>;
  weightPerUnit: number;
  perBox: number;
  tier: Tier;
  tierBadgeLabel: string;
  activeTab: string;
  onTabChange: (v: string) => void;
  related: ShopeeProduct[];
}

export function ProductTabsClean({
  product,
  attrs,
  weightPerUnit,
  perBox,
  tier,
  tierBadgeLabel,
  activeTab,
  onTabChange,
  related,
}: ProductTabsCleanProps) {
  return (
    <>
      <div className="border-t border-border pt-8 mt-4">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none border-b border-border w-full justify-start">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm"
            >
              รายละเอียดสินค้า
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm"
            >
              ข้อมูลจำเพาะ
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm"
            >
              การจัดส่งและประกัน
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="description"
            className="pt-6 prose prose-sm max-w-none text-sm leading-relaxed text-[#374151]"
          >
            <p>{product.description || "—"}</p>
            {Array.isArray((attrs as { features?: string[] }).features) && (
              <ul className="mt-3 space-y-1 list-none pl-0">
                {((attrs as { features: string[] }).features ?? []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="size-3.5 text-success mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="specs" className="pt-6">
            <div className="rounded-xl border border-border overflow-hidden max-w-2xl bg-white">
              <table className="w-full text-sm">
                <tbody className="[&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">
                  <SpecRow label="รหัสสินค้า (SKU)" value={product.sku ?? "—"} />
                  <SpecRow label="หน่วยนับ" value={product.unit} />
                  <SpecRow label="น้ำหนักต่อหน่วย" value={`${weightPerUnit.toFixed(2)} kg`} />
                  <SpecRow label="จำนวนต่อกล่อง" value={`${perBox} ${product.unit}`} />
                  <SpecRow label="ราคาขายต่อหน่วย" value={fmtTHB(product.sale_price)} />
                  {Object.entries(attrs)
                    .filter(([k]) => !["weight_kg", "weight", "per_box", "features"].includes(k))
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <SpecRow key={k} label={k} value={String(v)} />
                    ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="pt-6 space-y-3 text-sm text-[#374151]">
            <div className="flex items-start gap-2">
              <Truck className="size-4 text-primary mt-0.5 shrink-0" /> จัดส่งทั่วประเทศ —
              กรุงเทพ/ปริมณฑล 2-3 วันทำการ, ต่างจังหวัด 3-5 วันทำการ
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="size-4 text-primary mt-0.5 shrink-0" /> รับประกันงานเย็บ 1 ปี
              · รับประกันมอเตอร์ 2 ปี
            </div>
            <div className="flex items-start gap-2">
              <Package className="size-4 text-primary mt-0.5 shrink-0" /> ลูกค้าระดับ{" "}
              {tierBadgeLabel} — ส่วนลดอัตโนมัติ {(tierDiscount(tier) * 100).toFixed(0)}% /
              ฟรีค่าส่งเมื่อสั่งซื้อตามเงื่อนไข
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {related.length > 0 && (
        <div className="border-t border-border pt-8 mt-8">
          <h2 className="text-lg font-bold mb-4 text-foreground">สินค้าในหมวดเดียวกัน</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {related.map((p) => (
              <ProductCardShopee key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="px-4 py-2.5 bg-muted/40 text-muted-foreground text-xs w-1/3">{label}</td>
      <td className="px-4 py-2.5 text-xs bg-white">{value}</td>
    </tr>
  );
}
