import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCategories, type Category } from "@/lib/categories";
import type { ProductKind } from "@/lib/product-kinds";

export function CategorySelect({
  kind,
  value,
  onChange,
}: {
  kind: ProductKind;
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const [cats, setCats] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories()
      .then(setCats)
      .catch(() => setCats([]));
  }, []);

  const inKind = cats.filter((c) => c.kind === kind);
  const roots = inKind.filter((c) => !c.parent_id);
  const current = cats.find((c) => c.id === value) ?? null;
  const parentId = current?.parent_id ?? current?.id ?? null;
  const subs = parentId ? inKind.filter((c) => c.parent_id === parentId) : [];

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Select
        value={parentId ?? ""}
        onValueChange={(v) => {
          // pick root: set value to root id (no sub)
          onChange(v || null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="เลือกหมวดหลัก" />
        </SelectTrigger>
        <SelectContent>
          {roots.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">ยังไม่มีหมวดในประเภทนี้</div>
          )}
          {roots.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={current?.parent_id ? current.id : ""}
        onValueChange={(v) => onChange(v || parentId)}
        disabled={!parentId}
      >
        <SelectTrigger>
          <SelectValue placeholder={parentId ? "เลือกหมวดย่อย (ไม่บังคับ)" : "—"} />
        </SelectTrigger>
        <SelectContent>
          {subs.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">ไม่มีหมวดย่อย</div>
          )}
          {subs.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
