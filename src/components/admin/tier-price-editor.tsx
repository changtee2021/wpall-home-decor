import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIER_INFO, type Tier } from "@/lib/tier";
import { TIERS } from "@/lib/tier-pricing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Row {
  tier: Tier;
  price_type: "fixed" | "discount_pct";
  value: number;
  id?: string;
}

export function TierPriceEditor({
  productId,
  categoryId,
  basePrice,
}: {
  productId?: string;
  categoryId?: string;
  basePrice?: number;
}) {
  const target: { product_id: string | null; category_id: string | null } | null = productId
    ? { product_id: productId, category_id: null }
    : categoryId
      ? { product_id: null, category_id: categoryId }
      : null;
  const [rows, setRows] = useState<Record<Tier, Row>>(
    Object.fromEntries(
      TIERS.map((t) => [t, { tier: t, price_type: "discount_pct", value: 0 }]),
    ) as Record<Tier, Row>,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    (async () => {
      const col = productId ? "product_id" : "category_id";
      const val = productId ?? categoryId!;
      const { data } = await supabase.from("product_tier_prices").select("*").eq(col, val);
      setRows((prev) => {
        const next = { ...prev };
        (data ?? []).forEach((d) => {
          next[d.tier as Tier] = {
            id: d.id,
            tier: d.tier as Tier,
            price_type: d.price_type as "fixed" | "discount_pct",
            value: Number(d.value),
          };
        });
        return next;
      });
    })();
  }, [productId, categoryId]);

  const setRow = (t: Tier, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [t]: { ...p[t], ...patch } }));

  const save = async () => {
    if (!target) {
      toast.error("ต้องบันทึกสินค้า/หมวดก่อนตั้งราคา");
      return;
    }
    setBusy(true);
    try {
      for (const t of TIERS) {
        const r = rows[t];
        if (r.value === 0 && !r.id) continue;
        const payload = { ...target, tier: t, price_type: r.price_type, value: r.value };
        if (r.id) {
          await supabase.from("product_tier_prices").update(payload).eq("id", r.id);
        } else {
          await supabase.from("product_tier_prices").insert(payload);
        }
      }
      toast.success("บันทึกราคาตามระดับเรียบร้อย");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const preview = (r: Row) => {
    if (!basePrice) return null;
    const final =
      r.price_type === "fixed" ? r.value : Math.round(basePrice * (1 - r.value / 100) * 100) / 100;
    return final;
  };

  if (!target) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        บันทึกสินค้าก่อนเพื่อเปิดใช้งานราคาตามระดับลูกค้า
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        ค่า 0 = ไม่ใช้งาน (ใช้ราคาขายปกติ). ตั้งราคาเป็นจำนวนเงิน (fixed) หรือ % ส่วนลดจากราคาขาย
      </div>
      <div className="space-y-2">
        {TIERS.map((t) => {
          const r = rows[t];
          const p = preview(r);
          return (
            <div
              key={t}
              className="grid sm:grid-cols-[100px_140px_1fr_120px] gap-2 items-center bg-card border border-border rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: TIER_INFO[t].color }} />
                <Label className="font-semibold capitalize">{TIER_INFO[t].label}</Label>
              </div>
              <Select
                value={r.price_type}
                onValueChange={(v) => setRow(t, { price_type: v as Row["price_type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">ราคา fixed</SelectItem>
                  <SelectItem value="discount_pct">% ส่วนลด</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={r.value}
                onChange={(e) => setRow(t, { value: +e.target.value })}
              />
              <div className="text-sm text-right text-muted-foreground">
                {p !== null ? <>= ฿{p.toLocaleString()}</> : null}
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
        {busy && <Loader2 className="size-4 animate-spin mr-2" />}
        บันทึกราคาตามระดับ
      </Button>
    </div>
  );
}
