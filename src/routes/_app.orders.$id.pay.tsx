import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmtTHB } from "@/lib/pricing";
import { fetchPaymentInfo } from "@/lib/payment-settings";
import { DEFAULT_PAYMENT_INFO, type PaymentInfo } from "@/lib/payment-fees";
import { PaymentInfoBlock } from "@/components/payment/payment-info-block";
import { useServerFn } from "@tanstack/react-start";
import { submitPaymentSlip } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { AccountOrdersContentShell } from "@/components/layout/account-layout";
import { PaymentPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/_app/orders/$id/pay")({
  head: () => ({ meta: [{ title: "ชำระเงิน PromptPay · WP ALL" }] }),
  component: OrderPayPage,
});

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  grand_total: number;
  payment_fee: number;
  payment_method: string | null;
}

function OrderPayPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const submitSlip = useServerFn(submitPaymentSlip);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(DEFAULT_PAYMENT_INFO);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: o }, info] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        fetchPaymentInfo(),
      ]);
      setOrder(o as OrderRow | null);
      setPaymentInfo(info);
      setFetching(false);
    })();
  }, [user, id]);

  const uploadSlip = async () => {
    if (!user || !order || !slipFile) {
      toast.error("กรุณาเลือกไฟล์สลิป");
      return;
    }
    setBusy(true);
    try {
      const ext = slipFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${order.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-slips").upload(path, slipFile);
      if (upErr) throw upErr;
      await submitSlip({ data: { orderId: order.id, slipPath: path } });
      toast.success("ส่งสลิปแล้ว รอแอดมินตรวจสอบ");
      window.location.href = "/orders";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  if (loading || fetching) {
    return (
      <AccountOrdersContentShell>
        <PaymentPageSkeleton />
      </AccountOrdersContentShell>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!order || order.user_id !== user.id) {
    return (
      <AccountOrdersContentShell>
        <div className="py-20 text-center">
          <p className="text-muted-foreground">ไม่พบออเดอร์</p>
          <Link to="/orders" className="text-primary text-sm mt-2 inline-block">
            กลับรายการออเดอร์
          </Link>
        </div>
      </AccountOrdersContentShell>
    );
  }

  if (order.status === "paid" || order.status === "forwarded") {
    return <Navigate to="/orders" replace />;
  }

  return (
    <AccountOrdersContentShell>
      <div className="max-w-md mx-auto space-y-5 pb-20">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" /> ออเดอร์ของฉัน
        </Link>

        <div>
          <h1 className="text-2xl font-bold">ชำระเงิน</h1>
          <p className="text-sm text-muted-foreground mt-1">ออเดอร์ {order.order_number}</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5">
          <PaymentInfoBlock
            info={paymentInfo}
            amount={Number(order.grand_total)}
            reference={order.order_number}
          />
          {Number(order.payment_fee) > 0 && (
            <div className="text-xs text-muted-foreground text-center mt-3">
              (รวมค่าธรรมเนียม {fmtTHB(order.payment_fee)})
            </div>
          )}
        </div>

        <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold">อัปโหลดสลิปการโอน</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Upload className="size-4 text-muted-foreground" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
          </label>
          <button
            type="button"
            onClick={uploadSlip}
            disabled={busy || !slipFile}
            className="w-full bg-secondary text-secondary-foreground rounded-full py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            ส่งสลิปยืนยันการชำระ
          </button>
        </div>
      </div>
    </AccountOrdersContentShell>
  );
}
