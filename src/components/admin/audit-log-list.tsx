import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CardListSkeleton } from "@/components/loading";
import { Plus, Pencil, Trash2, Power } from "lucide-react";

interface LogRow {
  id: string;
  product_id: string | null;
  product_name: string | null;
  user_email: string | null;
  action: string;
  changes: Record<string, { old: unknown; new: unknown } | unknown>;
  created_at: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  toggle_active: Power,
};
const COLORS: Record<string, string> = {
  create: "text-emerald-600 bg-emerald-50",
  update: "text-blue-600 bg-blue-50",
  delete: "text-destructive bg-destructive/10",
  toggle_active: "text-amber-600 bg-amber-50",
};

const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v).slice(0, 60);
};

export function AuditLogList({ productId, limit = 50 }: { productId?: string; limit?: number }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      let q = supabase
        .from("product_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (productId) q = q.eq("product_id", productId);
      const { data } = await q;
      setRows((data ?? []) as LogRow[]);
      setBusy(false);
    })();
  }, [productId, limit]);

  if (busy) return <CardListSkeleton count={4} className="py-4" />;
  if (rows.length === 0)
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการแก้ไข</div>
    );

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const Icon = ICONS[r.action] ?? Pencil;
        const colors = COLORS[r.action] ?? "text-foreground bg-muted";
        return (
          <div key={r.id} className="flex gap-3 border border-border rounded-xl p-3 bg-card">
            <div
              className={`size-9 rounded-full flex items-center justify-center shrink-0 ${colors}`}
            >
              <Icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-normal capitalize">
                  {r.action.replace("_", " ")}
                </Badge>
                <span className="text-sm font-semibold">{r.product_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">โดย {r.user_email ?? "ระบบ"}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleString("th-TH")}
                </span>
              </div>
              {r.action === "update" || r.action === "toggle_active" ? (
                <div className="mt-2 space-y-1 text-xs">
                  {Object.entries(r.changes).map(([field, diff]) => {
                    const d = diff as { old: unknown; new: unknown };
                    return (
                      <div key={field} className="flex gap-2 items-baseline">
                        <span className="font-medium min-w-[120px]">{field}</span>
                        <span className="text-destructive line-through">{fmt(d.old)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-emerald-700">{fmt(d.new)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
