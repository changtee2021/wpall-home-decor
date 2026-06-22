import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtTHB } from "@/lib/pricing";
import { TIER_INFO, type Tier } from "@/lib/tier";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { useServerFn } from "@tanstack/react-start";
import { setTierOverride } from "@/lib/orders.functions";
import { toast } from "sonner";
import {
  AdminPageSkeleton,
  AdminDashboardSkeleton,
  FormPageSkeleton,
  PageSkeleton,
} from "@/components/loading";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "ลูกค้า & Tier · Admin" }] }),
  component: AdminCustomers,
});

interface Row {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  tier: Tier;
  tier_override: Tier | null;
  total_spent: number;
  order_count: number;
}

function AdminCustomers() {
  const { user, role, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | Tier>("all");
  const override = useServerFn(setTierOverride);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,email,phone,tier,tier_override,total_spent,order_count")
      .order("total_spent", { ascending: false });
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  if (loading) return <AdminPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/account" replace />;

  const filtered = filter === "all" ? rows : rows.filter((r) => r.tier === filter);

  const handleOverride = async (userId: string, tier: Tier | null) => {
    try {
      await override({ data: { userId, tier } });
      toast.success("อัปเดต Tier แล้ว");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <SiteHeader />
        <main className="flex-1 px-4 sm:px-6 pb-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ลูกค้า & Tier Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tier คำนวณอัตโนมัติจากยอดซื้อสะสม · แอดมินสามารถปรับแบบ manual ได้
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`ทั้งหมด (${rows.length})`}
            />
            {(Object.keys(TIER_INFO) as Tier[]).map((t) => (
              <FilterChip
                key={t}
                active={filter === t}
                onClick={() => setFilter(t)}
                label={`${TIER_INFO[t].label} (${rows.filter((r) => r.tier === t).length})`}
                color={TIER_INFO[t].color}
              />
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">ชื่อ / อีเมล</th>
                    <th className="text-right px-4 py-3">ยอดซื้อ</th>
                    <th className="text-right px-4 py-3">ออเดอร์</th>
                    <th className="text-left px-4 py-3">Tier ปัจจุบัน</th>
                    <th className="text-left px-4 py-3">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {fmtTHB(r.total_spent)}
                      </td>
                      <td className="px-4 py-3 text-right">{r.order_count}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1"
                          style={{
                            background: TIER_INFO[r.tier].color + "22",
                            color: TIER_INFO[r.tier].color,
                          }}
                        >
                          {TIER_INFO[r.tier].label}
                        </span>
                        {r.tier_override && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(manual)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.tier_override ?? ""}
                          onChange={(e) =>
                            handleOverride(r.id, (e.target.value || null) as Tier | null)
                          }
                          className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                          <option value="">— อัตโนมัติ —</option>
                          {(Object.keys(TIER_INFO) as Tier[]).map((t) => (
                            <option key={t} value={t}>
                              {TIER_INFO[t].label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border hover:border-foreground/40"
      }`}
      style={
        active && color ? { background: color, borderColor: color, color: "white" } : undefined
      }
    >
      {label}
    </button>
  );
}
