import {
  ShoppingCart,
  FileText,
  Check,
  MapPin,
  Package,
  Scale,
  ShieldCheck,
  Truck,
  Users,
  ChevronRight,
  Store,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fmtTHB } from "@/lib/pricing";
import type { PDAttrGroup, PDProduct } from "@/components/product/product-detail";

interface StockBadge {
  label: string;
  cls: string;
}

interface OrderPanelCleanProps {
  product: PDProduct;
  groups: PDAttrGroup[];
  selected: Record<string, string>;
  onSelectOption: (groupId: string, optionId: string) => void;
  width: number;
  height: number;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  qty: number;
  onQtyChange: (v: number) => void;
  total: number;
  finalUnit: number;
  areaM2: number;
  totalWeight: number;
  totalBoxes: number;
  isPerMeter?: boolean;
  hasTierPrice: boolean;
  tierBadgeLabel: string;
  tierBadgeColor: string;
  overridePct: number;
  stockBadge: StockBadge;
  showTierBadge: boolean;
  showSalesMode: boolean;
  salesMode: boolean;
  onSalesModeChange: (v: boolean) => void;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  override: number;
  onOverrideChange: (v: number) => void;
  onAdd: () => void;
  onQuote: () => void;
  adding?: boolean;
  hideMobileCta?: boolean;
}

export function OrderPanelClean({
  product,
  groups,
  selected,
  onSelectOption,
  width,
  height,
  onWidthChange,
  onHeightChange,
  qty,
  onQtyChange,
  total,
  finalUnit,
  areaM2,
  totalWeight,
  totalBoxes,
  isPerMeter = false,
  hasTierPrice,
  tierBadgeLabel,
  tierBadgeColor,
  overridePct,
  stockBadge,
  showTierBadge,
  showSalesMode,
  salesMode,
  onSalesModeChange,
  customerName,
  onCustomerNameChange,
  override,
  onOverrideChange,
  onAdd,
  onQuote,
  adding,
  hideMobileCta,
}: OrderPanelCleanProps) {
  return (
    <div className="lg:sticky lg:top-20 space-y-5">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-primary font-medium">
          {product.category}
        </div>
        <h1 className="text-2xl sm:text-[28px] font-bold mt-1 leading-tight text-foreground">
          {product.name}
        </h1>
        <div className="mt-2 text-2xl font-bold text-foreground tracking-tight">
          {fmtTHB(product.sale_price)}
          <span className="text-sm font-normal text-muted-foreground ml-1">/ {product.unit}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {product.sku && (
            <span className="text-[11px] text-muted-foreground font-mono">SKU: {product.sku}</span>
          )}
          <Badge variant="outline" className={stockBadge.cls}>
            {stockBadge.label}
          </Badge>
          {showTierBadge && (
            <Badge variant="outline" style={{ borderColor: tierBadgeColor, color: tierBadgeColor }}>
              ระดับ {tierBadgeLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Sales mode */}
      {showSalesMode && (
        <div className="rounded-xl border border-dashed border-secondary/40 bg-secondary/5 p-3 space-y-2">
          <label className="flex items-center justify-between gap-2 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-secondary" /> โหมดเซลส์ (สั่งให้ลูกค้า)
            </span>
            <Switch checked={salesMode} onCheckedChange={onSalesModeChange} />
          </label>
          {salesMode && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="ชื่อลูกค้า"
                className="h-9 text-xs bg-white"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={override}
                  onChange={(e) => onOverrideChange(Number(e.target.value))}
                  placeholder="ส่วนลด %"
                  className="h-9 text-xs bg-white"
                  max={50}
                  min={0}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attribute swatches */}
      {groups.map((g) => (
        <div key={g.id}>
          <div className="text-xs font-semibold mb-2 flex justify-between">
            <span>{g.name}</span>
            <span className="text-muted-foreground font-normal">
              {g.options.find((o) => o.id === selected[g.id])?.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => {
              const isOn = selected[g.id] === o.id;
              if (g.display_type === "color_swatch" || o.swatch_color || o.image_url) {
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onSelectOption(g.id, o.id)}
                    className={`size-14 rounded-lg overflow-hidden border-2 transition-all ${
                      isOn ? "border-primary scale-[1.02]" : "border-border hover:border-primary/40"
                    }`}
                    title={`${o.label}${o.price_delta ? ` (+${fmtTHB(Number(o.price_delta))})` : ""}`}
                    aria-label={o.label}
                  >
                    {o.image_url ? (
                      <img src={o.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span
                        className="block w-full h-full"
                        style={{ background: o.swatch_color ?? "#e5e7eb" }}
                      />
                    )}
                  </button>
                );
              }
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onSelectOption(g.id, o.id)}
                  className={`px-3 h-9 rounded-lg text-xs border transition-colors ${
                    isOn
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "bg-white border-border hover:border-primary/40"
                  }`}
                >
                  {o.label}
                  {Number(o.price_delta) > 0 && (
                    <span className="ml-1 opacity-75">+{fmtTHB(Number(o.price_delta))}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Dimensions */}
      <div>
        <div className="text-xs font-semibold mb-2">
          {isPerMeter ? "ความยาว (เซนติเมตร)" : "ขนาด (เซนติเมตร)"}
        </div>
        {isPerMeter ? (
          <label className="block">
            <span className="text-[11px] text-muted-foreground">ความยาวราง</span>
            <div className="mt-1 flex items-center bg-muted border border-border rounded-lg overflow-hidden">
              <Input
                type="number"
                value={width}
                onChange={(e) => onWidthChange(Math.max(30, Number(e.target.value)))}
                className="border-0 focus-visible:ring-0 h-10 bg-transparent"
              />
              <span className="px-3 text-xs text-muted-foreground">cm</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ≈ {(width / 100).toFixed(2)} ม. × {fmtTHB(product.sale_price)}/ม.
            </p>
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-muted-foreground">กว้าง</span>
              <div className="mt-1 flex items-center bg-muted border border-border rounded-lg overflow-hidden">
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => onWidthChange(Math.max(30, Number(e.target.value)))}
                  className="border-0 focus-visible:ring-0 h-10 bg-transparent"
                />
                <span className="px-3 text-xs text-muted-foreground">cm</span>
              </div>
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground">สูง</span>
              <div className="mt-1 flex items-center bg-muted border border-border rounded-lg overflow-hidden">
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => onHeightChange(Math.max(30, Number(e.target.value)))}
                  className="border-0 focus-visible:ring-0 h-10 bg-transparent"
                />
                <span className="px-3 text-xs text-muted-foreground">cm</span>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Service box — IKEA style */}
      <div className="rounded-xl border border-border bg-muted/60 p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-primary shrink-0" />
            <span className="font-medium">จัดส่ง</span>
            <span className="size-2 rounded-full bg-success shrink-0" />
            <span className="text-xs text-muted-foreground">{stockBadge.label}</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <div className="border-t border-border/80 pt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary shrink-0" />
            <span className="font-medium">บริการวัด-ติดตั้ง</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </div>

      {/* Live price box */}
      <div className="rounded-xl border border-primary/20 bg-white p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">ราคารวม</span>
          <span className="text-2xl sm:text-[32px] font-bold tracking-tight text-foreground">
            {fmtTHB(total)}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2">
          <span>
            {fmtTHB(finalUnit)} × {qty} {product.unit}
          </span>
          {hasTierPrice && <span className="text-success">• ราคา{tierBadgeLabel}</span>}
          {overridePct > 0 && <span className="text-secondary">• ส่วนลด {overridePct}%</span>}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat icon={Scale} label="น้ำหนัก" value={`${totalWeight.toFixed(1)} kg`} />
          <MiniStat icon={Package} label="กล่อง" value={`${totalBoxes}`} />
          <MiniStat icon={MapPin} label="พื้นที่" value={`${areaM2.toFixed(2)} ตร.ม.`} />
        </div>
      </div>

      {/* Qty + CTAs — desktop only (mobile uses sticky bar) */}
      {!hideMobileCta && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">จำนวน</span>
            <QtyPicker qty={qty} onQtyChange={onQtyChange} />
          </div>
          <Button
            onClick={onAdd}
            disabled={adding}
            size="lg"
            className="w-full h-[52px] rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-base shadow-none"
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingCart className="size-4" />
            )}
            เพิ่มลงตะกร้า
          </Button>
          <Button
            onClick={onQuote}
            size="lg"
            variant="outline"
            className="w-full h-12 rounded-full border-2 border-primary text-primary hover:bg-primary/5 font-semibold"
          >
            <FileText className="size-4" /> ออกใบเสนอราคา
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
        <span className="flex items-center gap-1">
          <Truck className="size-3" /> ส่งฟรี ≥ 5,000.-
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3" /> รับประกัน 1 ปี
        </span>
        <span className="flex items-center gap-1">
          <Check className="size-3" /> ตัวจริงโรงงาน
        </span>
      </div>
    </div>
  );
}

function QtyPicker({ qty, onQtyChange }: { qty: number; onQtyChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-full border border-border bg-muted overflow-hidden">
      <button
        type="button"
        onClick={() => onQtyChange(Math.max(1, qty - 1))}
        className="px-4 py-2 hover:bg-accent text-sm"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-semibold">{qty}</span>
      <button
        type="button"
        onClick={() => onQtyChange(qty + 1)}
        className="px-4 py-2 hover:bg-accent text-sm"
      >
        +
      </button>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-2">
      <Icon className="size-3.5 mx-auto text-muted-foreground" />
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}

export function MobileStickyCta({
  total,
  qty,
  onQtyChange,
  onAdd,
  adding,
}: {
  total: number;
  qty: number;
  onQtyChange: (v: number) => void;
  onAdd: () => void;
  adding?: boolean;
}) {
  return (
    <div className="fixed bottom-[4.5rem] left-0 right-0 z-40 lg:hidden border-t border-border bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="shrink-0">
          <div className="text-lg font-bold text-foreground">{fmtTHB(total)}</div>
          <QtyPicker qty={qty} onQtyChange={onQtyChange} />
        </div>
        <Button
          onClick={onAdd}
          disabled={adding}
          className="flex-1 h-11 rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold shadow-none"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : "เพิ่มลงตะกร้า"}
        </Button>
      </div>
    </div>
  );
}
