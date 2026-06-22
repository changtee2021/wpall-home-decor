import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtTHB } from "@/lib/pricing";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { useServerFn } from "@tanstack/react-start";
import { confirmOrderPayment } from "@/lib/orders.functions";
import { rejectPaymentSlip } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";
import {
  AdminPageSkeleton,
  AdminDashboardSkeleton,
  FormPageSkeleton,
  PageSkeleton,
  LoadingHint,
} from "@/components/loading";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "ตรวจสลิปชำระเงิน · Admin" }] }),
  component: AdminPayments,
});

interface SlipRow {
  id: string;
  order_id: string;
  slip_url: string;
  status: string;
  created_at: string;
  orders: { order_number: string; grand_total: number; customer_name: string | null } | null;
}

function AdminPayments() {
  const { user, role, loading } = useAuth();
  const [rows, setRows] = useState<SlipRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const confirmPay = useServerFn(confirmOrderPayment);
  const rejectSlip = useServerFn(rejectPaymentSlip);

  const load = async () => {
    const { data } = await supabase
      .from("payment_slips")
      .select(
        "id,order_id,slip_url,status,created_at,orders(order_number,grand_total,customer_name)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as SlipRow[];
    setRows(list);

    const urls: Record<string, string> = {};
    for (const r of list) {
      const { data: signed } = await supabase.storage
        .from("payment-slips")
        .createSignedUrl(r.slip_url, 3600);
      if (signed?.signedUrl) urls[r.id] = signed.signedUrl;
    }
    setSignedUrls(urls);
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role]);

  if (loading) return <AdminPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/account" replace />;

  const approve = async (orderId: string) => {
    try {
      await confirmPay({ data: { orderId } });
      toast.success("ยืนยันชำระเงินแล้ว — ส่งไป backoffice");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  const reject = async (slipId: string) => {
    try {
      await rejectSlip({ data: { slipId, reason: "สลิปไม่ถูกต้อง" } });
      toast.success("ปฏิเสธสลิปแล้ว");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  const slipUrl = (slipId: string) => signedUrls[slipId] ?? "";

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <SiteHeader />
        <main className="flex-1 px-4 sm:px-6 pb-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ตรวจสลิปชำระเงิน</h1>
            <p className="text-sm text-muted-foreground mt-1">คิวสลิปโอนเงินรอตรวจสอบ</p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      to="/admin/orders/$id"
                      params={{ id: r.order_id }}
                      className="font-bold text-primary hover:underline"
                    >
                      {r.orders?.order_number ?? r.order_id.slice(0, 8)}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.orders?.customer_name ?? "—"} · {fmtTHB(r.orders?.grand_total ?? 0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("th-TH")}
                    </div>
                  </div>
                </div>
                <a
                  href={slipUrl(r.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-video bg-muted rounded-lg overflow-hidden relative group"
                >
                  {slipUrl(r.id) ? (
                    <img src={slipUrl(r.id)} alt="สลิป" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                      <Skeleton className="w-full h-full min-h-[80px] rounded-lg" />
                      <LoadingHint label="กำลังโหลดสลิป..." />
                    </div>
                  )}
                  <ExternalLink className="size-4 absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/80 rounded p-0.5" />
                </a>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approve(r.order_id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold"
                  >
                    <Check className="size-4" /> ยืนยัน
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(r.id)}
                    className="flex items-center justify-center gap-1 border border-border rounded-xl px-3 py-2 text-sm text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
                ไม่มีสลิปรอตรวจ
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
