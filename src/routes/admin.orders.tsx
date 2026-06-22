import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtTHB } from "@/lib/pricing";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { useServerFn } from "@tanstack/react-start";
import { updateOrderStatus } from "@/lib/orders.functions";
import { toast } from "sonner";
import {
  AdminPageSkeleton,
  AdminDashboardSkeleton,
  FormPageSkeleton,
  PageSkeleton,
} from "@/components/loading";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "ออเดอร์ทั้งหมด · Admin" }] }),
  component: AdminOrders,
});

const STATUSES = [
  "pending_payment",
  "paid",
  "forwarded",
  "producing",
  "shipped",
  "done",
  "cancelled",
  "all",
] as const;
type Tab = (typeof STATUSES)[number];
type Status = Exclude<Tab, "all">;

interface Row {
  id: string;
  order_number: string;
  status: Status;
  grand_total: number;
  payment_fee: number;
  created_at: string;
  customer_name: string | null;
  payment_method: string | null;
  backoffice_forwarded_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "รอชำระ",
  paid: "ชำระแล้ว",
  forwarded: "ส่ง backoffice",
  producing: "กำลังผลิต",
  shipped: "จัดส่งแล้ว",
  done: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

function AdminOrders() {
  const { user, role, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const updateStatus = useServerFn(updateOrderStatus);

  const load = async () => {
    let q = supabase
      .from("orders")
      .select(
        "id,order_number,status,grand_total,payment_fee,created_at,customer_name,payment_method,backoffice_forwarded_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (tab !== "all") q = q.eq("status", tab);
    const { data } = await q;
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role, tab]);

  if (loading) return <AdminPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/account" replace />;

  const setStatus = async (orderId: string, status: Status) => {
    try {
      await updateStatus({ data: { orderId, status } });
      toast.success("อัปเดตสถานะแล้ว");
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ออเดอร์ทั้งหมด</h1>
              <p className="text-sm text-muted-foreground mt-1">
                ยืนยันชำระที่{" "}
                <Link to="/admin/payments" className="text-primary font-semibold">
                  ตรวจสลิป
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTab(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${tab === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              >
                {s === "all" ? "ทั้งหมด" : (STATUS_LABELS[s] ?? s)}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">เลขที่</th>
                  <th className="text-left px-4 py-3">ลูกค้า</th>
                  <th className="text-left px-4 py-3">ชำระ</th>
                  <th className="text-left px-4 py-3">วันที่</th>
                  <th className="text-right px-4 py-3">ยอด</th>
                  <th className="text-right px-4 py-3">ค่าธรรมเนียม</th>
                  <th className="text-left px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        to="/admin/orders/$id"
                        params={{ id: o.id }}
                        className="text-primary hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      {o.backoffice_forwarded_at && (
                        <span className="ml-1 text-[10px] text-success">✓ BO</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{o.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{o.payment_method ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {fmtTHB(o.grand_total)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {o.payment_fee > 0 ? fmtTHB(o.payment_fee) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => setStatus(o.id, e.target.value as Status)}
                        className="text-xs bg-background border border-border rounded-lg px-2 py-1.5"
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      ยังไม่มีออเดอร์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
