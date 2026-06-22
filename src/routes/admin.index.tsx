import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtTHB } from "@/lib/pricing";
import { TIER_INFO, type Tier } from "@/lib/tier";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { ShoppingBag, Users, TrendingUp, Package } from "lucide-react";
import {
  AdminDashboardSkeleton,
  AdminPageSkeleton,
  FormPageSkeleton,
  PageSkeleton,
} from "@/components/loading";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard · WP Curtain" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const [stats, setStats] = useState({ orders: 0, customers: 0, revenue: 0, productsCount: 0 });
  const [recent, setRecent] = useState<
    {
      id: string;
      order_number: string;
      status: string;
      grand_total: number;
      created_at: string;
      customer_name: string | null;
    }[]
  >([]);
  const [tiers, setTiers] = useState<Record<Tier, number>>({
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    vip: 0,
  });

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const [
        { count: orderCount },
        { count: custCount },
        { data: revData },
        { count: prodCount },
        { data: recentData },
        { data: profileData },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("grand_total")
          .in("status", ["paid", "producing", "shipped", "done"]),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id,order_number,status,grand_total,created_at,customer_name")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("profiles").select("tier"),
      ]);
      const revenue = (revData ?? []).reduce((s, r) => s + Number(r.grand_total ?? 0), 0);
      setStats({
        orders: orderCount ?? 0,
        customers: custCount ?? 0,
        revenue,
        productsCount: prodCount ?? 0,
      });
      setRecent(recentData ?? []);
      const t: Record<Tier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0, vip: 0 };
      (profileData ?? []).forEach((p) => {
        t[p.tier as Tier]++;
      });
      setTiers(t);
    })();
  }, [role]);

  if (loading) return <AdminDashboardSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/account" replace />;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <SiteHeader />
        <main className="flex-1 px-4 sm:px-6 pb-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">ภาพรวมระบบขายและสมาชิก</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              icon={TrendingUp}
              label="ยอดขายรวม"
              value={fmtTHB(stats.revenue)}
              color="bg-primary"
            />
            <Stat
              icon={ShoppingBag}
              label="ออเดอร์ทั้งหมด"
              value={String(stats.orders)}
              color="bg-secondary"
            />
            <Stat
              icon={Users}
              label="สมาชิก"
              value={String(stats.customers)}
              color="bg-emerald-500"
            />
            <Stat
              icon={Package}
              label="สินค้า"
              value={String(stats.productsCount)}
              color="bg-amber-500"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">ออเดอร์ล่าสุด</h2>
                <Link
                  to="/admin/orders"
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  ดูทั้งหมด →
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  ยังไม่มีออเดอร์
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((o) => (
                    <Link
                      to="/admin/orders"
                      key={o.id}
                      className="py-3 flex items-center justify-between hover:bg-accent/50 px-2 -mx-2 rounded-lg"
                    >
                      <div>
                        <div className="font-semibold text-sm">{o.order_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.customer_name ?? "—"} ·{" "}
                          {new Date(o.created_at).toLocaleString("th-TH")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary text-sm">
                          {fmtTHB(o.grand_total)}
                        </div>
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                          {o.status}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-bold mb-4">การกระจาย Tier</h2>
              <div className="space-y-3">
                {(Object.keys(tiers) as Tier[]).map((t) => {
                  const info = TIER_INFO[t];
                  const total = Object.values(tiers).reduce((a, b) => a + b, 0) || 1;
                  const pct = (tiers[t] / total) * 100;
                  return (
                    <div key={t}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold" style={{ color: info.color }}>
                          {info.label}
                        </span>
                        <span className="text-muted-foreground">{tiers[t]} คน</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: info.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div
        className={`size-10 rounded-xl ${color} text-white flex items-center justify-center mb-3`}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
