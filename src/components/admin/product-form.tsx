import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "./image-uploader";
import { ProductFilesSection } from "./file-uploader";
import { AuditLogList } from "./audit-log-list";
import { CategorySelect } from "./category-select";
import { TierPriceEditor } from "./tier-price-editor";
import { KINDS, KIND_ATTRIBUTES, type ProductKind } from "@/lib/product-kinds";
import { toast } from "sonner";
import { Loader2, Trash2, Save } from "lucide-react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

export interface ProductFormValues {
  id?: string;
  kind: ProductKind;
  name: string;
  slug: string;
  sku: string;
  category: string;
  category_id: string | null;
  description: string;
  unit: string;
  sale_price: number;
  cost_price: number;
  base_price: number;
  stock: number;
  is_active: boolean;
  badge: string;
  sort_order: number;
  tags: string[];
  images: string[];
  attributes: Record<string, string | number>;
  affiliate_commission_pct: string;
}

const empty: ProductFormValues = {
  kind: "curtain",
  name: "",
  slug: "",
  sku: "",
  category: "",
  category_id: null,
  description: "",
  unit: "ชุด",
  sale_price: 0,
  cost_price: 0,
  base_price: 0,
  stock: 0,
  is_active: true,
  badge: "",
  sort_order: 0,
  tags: [],
  images: [],
  attributes: {},
  affiliate_commission_pct: "",
};

export function ProductForm({
  initial,
}: {
  initial?: Partial<ProductFormValues> & { id?: string };
}) {
  const navigate = useNavigate();
  const [v, setV] = useState<ProductFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = !!initial?.id;

  useEffect(() => {
    if (!editing && v.name && !v.slug) setV((p) => ({ ...p, slug: slugify(v.name) }));
  }, [v.name, editing, v.slug]);

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const setAttr = (k: string, val: string | number) =>
    setV((p) => ({ ...p, attributes: { ...p.attributes, [k]: val } }));

  const onKindChange = (kind: ProductKind) => {
    const u = KINDS.find((x) => x.value === kind)?.defaultUnit ?? v.unit;
    setV((p) => ({ ...p, kind, unit: u, attributes: {}, category_id: null }));
  };

  const save = async () => {
    if (!v.name.trim()) {
      toast.error("กรุณาใส่ชื่อสินค้า");
      return;
    }
    if (!v.category.trim() && !v.category_id) {
      toast.error("กรุณาเลือกหมวดสินค้า");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: v.kind,
        name: v.name.trim(),
        slug: v.slug || slugify(v.name),
        sku: v.sku.trim() || null,
        category: v.category.trim() || (v.category_id ? "—" : ""),
        category_id: v.category_id,
        description: v.description || null,
        unit: v.unit,
        sale_price: Number(v.sale_price) || 0,
        cost_price: Number(v.cost_price) || 0,
        base_price: Number(v.base_price || v.sale_price) || 0,
        stock: Number(v.stock) || 0,
        is_active: v.is_active,
        badge: v.badge || null,
        sort_order: Number(v.sort_order) || 0,
        tags: v.tags,
        images: v.images,
        attributes: v.attributes,
        curtain_type: v.kind === "curtain" ? String(v.attributes.curtain_style ?? "s_fold") : null,
        affiliate_commission_pct: v.affiliate_commission_pct.trim()
          ? Number(v.affiliate_commission_pct)
          : null,
      };
      if (editing && initial?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("บันทึกสินค้าเรียบร้อย");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("เพิ่มสินค้าเรียบร้อย");
        navigate({ to: "/admin/products/$id", params: { id: data.id } });
      }
    } catch (e) {
      toast.error((e as Error).message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || !initial?.id) return;
    if (!confirm("ยืนยันการลบสินค้านี้?")) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", initial.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบสินค้าเรียบร้อย");
    navigate({ to: "/admin/products" });
  };

  const attrs = KIND_ATTRIBUTES[v.kind] ?? [];

  return (
    <div className="space-y-5">
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
          <TabsTrigger value="images">รูปภาพ</TabsTrigger>
          <TabsTrigger value="files" disabled={!editing}>
            เอกสารแนบ
          </TabsTrigger>
          <TabsTrigger value="tier" disabled={!editing}>
            ราคา & Tier
          </TabsTrigger>
          <TabsTrigger value="attributes">คุณสมบัติเฉพาะหมวด</TabsTrigger>
          <TabsTrigger value="history" disabled={!editing}>
            ประวัติการแก้ไข
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-5 mt-5">
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">ข้อมูลพื้นฐาน</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ประเภทสินค้า (kind)">
                <Select value={v.kind} onValueChange={(val) => onKindChange(val as ProductKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="หมวด / หมวดย่อย">
                <CategorySelect
                  kind={v.kind}
                  value={v.category_id}
                  onChange={(id) => set("category_id", id)}
                />
              </Field>
              <Field label="ชื่อแสดงหมวด (ใช้แสดงผล)">
                <Input
                  value={v.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="เช่น ม่านลอน, มู่ลี่ไม้"
                />
              </Field>
              <Field label="ชื่อสินค้า">
                <Input value={v.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Slug (URL)">
                <Input value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
              </Field>
              <Field label="SKU">
                <Input
                  value={v.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  placeholder="WP-CT-001"
                />
              </Field>
              <Field label="คำอธิบาย" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={v.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">ราคา & สต๊อก</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="ราคาขาย (บาท)">
                <Input
                  type="number"
                  value={v.sale_price}
                  onChange={(e) => set("sale_price", +e.target.value)}
                />
              </Field>
              <Field label="ราคาทุน (บาท)">
                <Input
                  type="number"
                  value={v.cost_price}
                  onChange={(e) => set("cost_price", +e.target.value)}
                />
              </Field>
              <Field label="ราคาเริ่มต้น (display)">
                <Input
                  type="number"
                  value={v.base_price}
                  onChange={(e) => set("base_price", +e.target.value)}
                />
              </Field>
              <Field label="หน่วย">
                <Input value={v.unit} onChange={(e) => set("unit", e.target.value)} />
              </Field>
              <Field label="สต๊อก">
                <Input
                  type="number"
                  value={v.stock}
                  onChange={(e) => set("stock", +e.target.value)}
                />
              </Field>
              <Field label="คอม Affiliate (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="ว่าง = ใช้หมวด/ค่าเริ่มต้น"
                  value={v.affiliate_commission_pct}
                  onChange={(e) => set("affiliate_commission_pct", e.target.value)}
                />
              </Field>
              <Field label="ป้าย (Badge)">
                <Input
                  value={v.badge}
                  onChange={(e) => set("badge", e.target.value)}
                  placeholder="New, Hot, ฯลฯ"
                />
              </Field>
              <Field label="ลำดับ">
                <Input
                  type="number"
                  value={v.sort_order}
                  onChange={(e) => set("sort_order", +e.target.value)}
                />
              </Field>
              <Field label="Tags (คั่นด้วย ,)">
                <Input
                  value={v.tags.join(",")}
                  onChange={(e) =>
                    set(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Label htmlFor="active">เปิดขาย</Label>
              <Switch
                id="active"
                checked={v.is_active}
                onCheckedChange={(c) => set("is_active", c)}
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="images" className="mt-5">
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">รูปสินค้า</h3>
            <ImageUploader value={v.images} onChange={(urls) => set("images", urls)} />
          </section>
        </TabsContent>

        <TabsContent value="files" className="mt-5">
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">เอกสารประกอบสินค้า</h3>
            {initial?.id && <ProductFilesSection productId={initial.id} />}
          </section>
        </TabsContent>

        <TabsContent value="tier" className="mt-5">
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">ราคาตามระดับลูกค้า (Tier)</h3>
            <p className="text-xs text-muted-foreground">
              ราคา fixed หรือ % ส่วนลดจากราคาขาย — สินค้าที่ตั้งราคาที่นี่จะ override ราคาของหมวด
            </p>
            <TierPriceEditor productId={initial?.id} basePrice={v.sale_price || v.base_price} />
          </section>
        </TabsContent>

        <TabsContent value="attributes" className="mt-5">
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">คุณสมบัติเฉพาะหมวด</h3>
            {attrs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                หมวดนี้ไม่มีคุณสมบัติเฉพาะ
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {attrs.map((f) => (
                  <Field key={f.key} label={f.label}>
                    {f.type === "select" ? (
                      <Select
                        value={String(v.attributes[f.key] ?? "")}
                        onValueChange={(val) => setAttr(f.key, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือก..." />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={f.type}
                        value={String(v.attributes[f.key] ?? "")}
                        placeholder={f.placeholder}
                        onChange={(e) =>
                          setAttr(f.key, f.type === "number" ? +e.target.value : e.target.value)
                        }
                      />
                    )}
                  </Field>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">ประวัติการแก้ไขสินค้านี้</h3>
            {initial?.id && <AuditLogList productId={initial.id} />}
          </section>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t border-border flex flex-wrap gap-2 items-center">
        <div className="text-xs text-muted-foreground flex-1">
          {editing ? "กำลังแก้ไข" : "สินค้าใหม่"} · สถานะ: {v.is_active ? "เปิดขาย" : "ปิด"}
        </div>
        {editing && (
          <Button
            variant="outline"
            onClick={remove}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 mr-1.5" /> ลบสินค้า
          </Button>
        )}
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Save className="size-4 mr-1.5" />
          )}
          {editing ? "บันทึก" : "เพิ่มสินค้า"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
