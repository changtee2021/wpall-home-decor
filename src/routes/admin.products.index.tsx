import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KINDS, kindLabel, type ProductKind } from "@/lib/product-kinds";
import { fmtTHB } from "@/lib/pricing";
import { Plus, Pencil, Search, Package, Eye, Trash2, X, Crosshair } from "lucide-react";
import { toast } from "sonner";
import {
  AdminPageSkeleton,
  AdminDashboardSkeleton,
  FormPageSkeleton,
  PageSkeleton,
  InlineTableLoading,
} from "@/components/loading";
import { fetchCustomizeCatalog, statusLabel, type CustomizeStatus } from "@/lib/customize-catalog";

export const Route = createFileRoute("/admin/products/")({
  head: () => ({ meta: [{ title: "จัดการสินค้า · WP Curtain" }] }),
  component: AdminProducts,
});

interface Row {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  kind: ProductKind;
  category: string;
  category_id: string | null;
  sale_price: number;
  base_price: number;
  stock: number;
  is_active: boolean;
  images: string[];
  sort_order: number;
}

interface Cat {
  id: string;
  name: string;
  kind: ProductKind;
}

type SortKey = "new" | "price_asc" | "price_desc" | "stock_asc" | "name";

function AdminProducts() {
  const { user, role, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ProductKind | "all">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "on" | "off">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");
  const [sortBy, setSortBy] = useState<SortKey>("new");
  const [customizeFilter, setCustomizeFilter] = useState<CustomizeStatus | "all">("all");
  const [customizeById, setCustomizeById] = useState<
    Map<string, { status: CustomizeStatus; hotspotCount: number }>
  >(new Map());
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [bulkDialog, setBulkDialog] = useState<null | "price" | "stock" | "category">(null);
  const [bulkValue, setBulkValue] = useState<string>("");

  const load = async () => {
    setBusy(true);
    const [{ data, error }, { data: catData }, customizeRows] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name,slug,sku,kind,category,category_id,sale_price,base_price,stock,is_active,images,sort_order",
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("product_categories")
        .select("id,name,kind")
        .eq("is_active", true)
        .order("sort_order"),
      fetchCustomizeCatalog().catch(() => []),
    ]);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Row[]);
    setCats((catData ?? []) as Cat[]);
    setCustomizeById(
      new Map(customizeRows.map((r) => [r.id, { status: r.status, hotspotCount: r.hotspotCount }])),
    );
    setBusy(false);
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (catFilter !== "all" && r.category !== catFilter) return false;
      if (statusFilter === "on" && !r.is_active) return false;
      if (statusFilter === "off" && r.is_active) return false;
      if (stockFilter === "in" && r.stock <= 0) return false;
      if (stockFilter === "out" && r.stock > 0) return false;
      if (q && !`${r.name} ${r.sku ?? ""} ${r.category}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      if (customizeFilter !== "all") {
        const cs = customizeById.get(r.id)?.status ?? "none";
        if (cs !== customizeFilter) return false;
      }
      return true;
    });
    const sorted = [...list];
    switch (sortBy) {
      case "price_asc":
        sorted.sort((a, b) => (a.sale_price || a.base_price) - (b.sale_price || b.base_price));
        break;
      case "price_desc":
        sorted.sort((a, b) => (b.sale_price || b.base_price) - (a.sale_price || a.base_price));
        break;
      case "stock_asc":
        sorted.sort((a, b) => a.stock - b.stock);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [rows, kind, catFilter, statusFilter, stockFilter, q, sortBy, customizeFilter, customizeById]);

  const distinctCats = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).filter(Boolean),
    [rows],
  );

  if (loading) return <AdminPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/account" replace />;

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someChecked = filtered.some((r) => selected.has(r.id));

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) filtered.forEach((r) => next.add(r.id));
      else filtered.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleActive = async (r: Row, value: boolean) => {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: value } : x)));
    const { error } = await supabase.from("products").update({ is_active: value }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: !value } : x)));
    } else {
      toast.success(value ? "เปิดขายแล้ว" : "ปิดการขายแล้ว");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const ids = confirmDelete.ids;
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`ลบ ${ids.length} รายการแล้ว`);
    setSelected((prev) => {
      const n = new Set(prev);
      ids.forEach((i) => n.delete(i));
      return n;
    });
    setConfirmDelete(null);
    load();
  };

  const bulkSetStatus = async (value: boolean) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await supabase.from("products").update({ is_active: value }).in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`อัปเดต ${ids.length} รายการ`);
    load();
  };

  const applyBulk = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !bulkDialog) return;
    let error: { message: string } | null = null;
    if (bulkDialog === "price") {
      const v = Number(bulkValue);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("ราคาไม่ถูกต้อง");
        return;
      }
      ({ error } = await supabase.from("products").update({ sale_price: v }).in("id", ids));
    } else if (bulkDialog === "stock") {
      const v = Number(bulkValue);
      if (!Number.isInteger(v) || v < 0) {
        toast.error("สต๊อกไม่ถูกต้อง");
        return;
      }
      ({ error } = await supabase.from("products").update({ stock: v }).in("id", ids));
    } else if (bulkDialog === "category") {
      if (!bulkValue) {
        toast.error("เลือกหมวด");
        return;
      }
      const c = cats.find((x) => x.id === bulkValue);
      if (!c) return;
      ({ error } = await supabase
        .from("products")
        .update({ category_id: c.id, category: c.name, kind: c.kind })
        .in("id", ids));
    }

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`อัปเดต ${ids.length} รายการ`);
    setBulkDialog(null);
    setBulkValue("");
    load();
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <SiteHeader />
        <main className="flex-1 px-4 sm:px-6 pb-8 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">จัดการสินค้า</h1>
              <p className="text-sm text-muted-foreground mt-1">
                เพิ่ม / แก้ไข / เปิด-ปิดขาย สินค้าทุกหมวด
              </p>
            </div>
            <Button asChild>
              <Link to="/admin/products/new">
                <Plus className="size-4 mr-1" /> เพิ่มสินค้า
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="ค้นหาชื่อ / SKU / หมวด"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as ProductKind | "all")}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="หมวด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวด</SelectItem>
                {distinctCats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | "on" | "off")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="on">เปิดขาย</SelectItem>
                <SelectItem value="off">ปิด</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stockFilter}
              onValueChange={(v) => setStockFilter(v as "all" | "in" | "out")}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สต๊อกทั้งหมด</SelectItem>
                <SelectItem value="in">มีสต๊อก</SelectItem>
                <SelectItem value="out">หมด</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">ใหม่ล่าสุด</SelectItem>
                <SelectItem value="price_asc">ราคา ต่ำ → สูง</SelectItem>
                <SelectItem value="price_desc">ราคา สูง → ต่ำ</SelectItem>
                <SelectItem value="stock_asc">สต๊อก น้อย → มาก</SelectItem>
                <SelectItem value="name">ชื่อ A–Z</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={customizeFilter}
              onValueChange={(v) => setCustomizeFilter(v as CustomizeStatus | "all")}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="คัสตอม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">คัสตอม: ทั้งหมด</SelectItem>
                <SelectItem value="ready">พร้อมแสดง /customize</SelectItem>
                <SelectItem value="incomplete">ตั้งไม่ครบ</SelectItem>
                <SelectItem value="none">ยังไม่ตั้ง</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/30 rounded-xl px-3 py-2">
              <span className="text-sm font-semibold mr-2">เลือก {selected.size} รายการ</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkDialog("price");
                  setBulkValue("");
                }}
              >
                แก้ไขราคา
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkDialog("stock");
                  setBulkValue("");
                }}
              >
                แก้ไขสต๊อก
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkDialog("category");
                  setBulkValue("");
                }}
              >
                เปลี่ยนหมวด
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetStatus(true)}>
                เปิดขายทั้งหมด
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetStatus(false)}>
                ปิดทั้งหมด
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setConfirmDelete({
                    ids: Array.from(selected),
                    label: `${selected.size} รายการที่เลือก`,
                  })
                }
              >
                <Trash2 className="size-4 mr-1" /> ลบที่เลือก
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                <X className="size-4 mr-1" /> ยกเลิก
              </Button>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </th>
                    <th className="text-left py-2.5 px-3">สินค้า</th>
                    <th className="text-left py-2.5 px-3">หมวด</th>
                    <th className="text-left py-2.5 px-3">SKU</th>
                    <th className="text-right py-2.5 px-3">ราคา</th>
                    <th className="text-right py-2.5 px-3">สต๊อก</th>
                    <th className="text-center py-2.5 px-3">คัสตอม</th>
                    <th className="text-center py-2.5 px-3">สถานะ</th>
                    <th className="text-right py-2.5 px-3">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {busy ? (
                    <InlineTableLoading colSpan={9} label="กำลังโหลดสินค้า..." />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        <Package className="size-8 mx-auto mb-2 opacity-50" />
                        ไม่พบสินค้า
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={(v) => toggleOne(r.id, !!v)}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted overflow-hidden shrink-0">
                              {r.images?.[0] && (
                                <img
                                  src={r.images[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold">{r.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {kindLabel(r.kind)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="secondary" className="font-normal">
                            {r.category}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{r.sku ?? "—"}</td>
                        <td className="py-2 px-3 text-right font-semibold">
                          {fmtTHB(r.sale_price || r.base_price)}
                        </td>
                        <td className="py-2 px-3 text-right">{r.stock}</td>
                        <td className="py-2 px-3 text-center">
                          {(() => {
                            const cs = customizeById.get(r.id);
                            if (!cs || cs.status === "none") {
                              return (
                                <Badge
                                  variant="outline"
                                  className="font-normal text-muted-foreground"
                                >
                                  —
                                </Badge>
                              );
                            }
                            return (
                              <Badge
                                variant={cs.status === "ready" ? "default" : "secondary"}
                                className="font-normal"
                              >
                                {statusLabel(cs.status)}
                                {cs.hotspotCount > 0 ? ` (${cs.hotspotCount})` : ""}
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={r.is_active}
                              onCheckedChange={(v) => toggleActive(r, v)}
                            />
                            <span
                              className={`text-xs ${r.is_active ? "text-emerald-600" : "text-muted-foreground"}`}
                            >
                              {r.is_active ? "เปิด" : "ปิด"}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="sm" title="Hotspot คัสตอม">
                              <Link to="/admin/products/$id/hotspots" params={{ id: r.id }}>
                                <Crosshair className="size-4" />
                              </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" title="พรีวิวมุมมองลูกค้า">
                              <a
                                href={`/products/${r.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="size-4" />
                              </a>
                            </Button>
                            <Button asChild variant="ghost" size="sm" title="แก้ไข">
                              <Link to="/admin/products/$id" params={{ id: r.id }}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="ลบ"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete({ ids: [r.id], label: r.name })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ <span className="font-semibold">{confirmDelete?.label}</span> หรือไม่?
              การกระทำนี้ย้อนกลับไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!bulkDialog} onOpenChange={(o) => !o && setBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkDialog === "price" && "แก้ไขราคา"}
              {bulkDialog === "stock" && "แก้ไขสต๊อก"}
              {bulkDialog === "category" && "เปลี่ยนหมวดหมู่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">ใช้กับ {selected.size} รายการที่เลือก</p>
            {bulkDialog === "price" && (
              <div className="space-y-1.5">
                <Label>ราคาขายใหม่ (บาท)</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
              </div>
            )}
            {bulkDialog === "stock" && (
              <div className="space-y-1.5">
                <Label>จำนวนสต๊อกใหม่</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
              </div>
            )}
            {bulkDialog === "category" && (
              <div className="space-y-1.5">
                <Label>เลือกหมวดหมู่</Label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- เลือก --" />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {kindLabel(c.kind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(null)}>
              ยกเลิก
            </Button>
            <Button onClick={applyBulk}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
