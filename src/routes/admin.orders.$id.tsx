import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtTHB, curtainTypeLabels } from "@/lib/pricing";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { useServerFn } from "@tanstack/react-start";
import {
  updateOrderStatus,
  confirmOrderPayment,
  retryBackofficeForward,
  refundOrderToWallet,
} from "@/lib/orders.functions";
import { rejectPaymentSlip } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { ChevronLeft, RefreshCw, Check, X } from "lucide-react";
import {
  AdminPageSkeleton,
  AdminDashboardSkeleton,
  FormPageSkeleton,
  PageSkeleton,
} from "@/components/loading";

export const Route = createFileRoute("/admin/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `ออเดอร์ ${params.id.slice(0, 8)} · Admin` }] }),
  component: AdminOrderDetail,
});

const STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "forwarded",
  "producing",
  "shipped",
  "done",
  "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

interface OrderRow {
  id: string;
  order_number: string;
  status: Status;
  user_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: number;
  discount: number;
  vat_amount: number;
  grand_total: number;
  base_total: number | null;
  payment_fee: number;
  shipping_fee: number;
  payment_method: string | null;
  paid_at: string | null;
  coupon_id: string | null;
  note: string | null;
  backoffice_forwarded_at: string | null;
  backoffice_forward_error: string | null;
  backoffice_refs: string[] | null;
  stock_reserved: boolean;
  created_at: string;
}

interface ItemRow {
  id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  config: Record<string, unknown>;
}

interface SlipRow {
  id: string;
  slip_url: string;
  status: string;
  created_at: string;
}

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const { user, role, loading } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<{
    full_name: string | null;
    email: string | null;
    tier: string;
  } | null>(null);
  const updateStatus = useServerFn(updateOrderStatus);
  const confirmPay = useServerFn(confirmOrderPayment);
  const retryForward = useServerFn(retryBackofficeForward);
  const rejectSlip = useServerFn(rejectPaymentSlip);
  const refundOrder = useServerFn(refundOrderToWallet);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(o as OrderRow | null);
    const { data: it } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems((it ?? []) as ItemRow[]);
    const { data: ps } = await supabase
      .from("payment_slips")
      .select("id,slip_url,status,created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false });
    setSlips((ps ?? []) as SlipRow[]);
    if (ps?.[0]?.slip_url) {
      const { data: signed } = await supabase.storage
        .from("payment-slips")
        .createSignedUrl(ps[0].slip_url, 3600);
      setSlipPreview(signed?.signedUrl ?? null);
    } else {
      setSlipPreview(null);
    }
    if (o) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name,email,tier")
        .eq("id", o.user_id)
        .maybeSingle();
      setBuyer(p as typeof buyer);
    }
  };

  useEffect(() => {
    if (role === "admin") load();
  }, [role, id]);

  if (loading) return <AdminPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/account" replace />;

  const setStatus = async (status: Status) => {
    try {
      await updateStatus({ data: { orderId: id, status } });
      toast.success("อัปเดตสถานะแล้ว");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  const onConfirmPay = async () => {
    try {
      await confirmPay({ data: { orderId: id } });
      toast.success("ยืนยันชำระแล้ว");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  const onRetryForward = async () => {
    try {
      const res = await retryForward({ data: { orderId: id } });
      if (res.ok) toast.success("ส่งไป backoffice สำเร็จ");
      else toast.error(res.error ?? "ส่งไม่สำเร็จ");
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
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> ออเดอร์ทั้งหมด
          </Link>

          {!order ? (
            <div className="p-10 text-sm text-muted-foreground">ไม่พบออเดอร์</div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">เลขที่</div>
                      <div className="text-2xl font-bold">{order.order_number}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleString("th-TH")}
                      </div>
                    </div>
                    <select
                      value={order.status}
                      onChange={(e) => setStatus(e.target.value as Status)}
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {order.payment_method && (
                      <span className="bg-muted px-2 py-1 rounded">
                        ชำระ: {order.payment_method}
                      </span>
                    )}
                    {order.stock_reserved && (
                      <span className="bg-muted px-2 py-1 rounded">จองสต๊อกแล้ว</span>
                    )}
                    {order.paid_at && (
                      <span className="bg-success/15 text-success px-2 py-1 rounded">
                        paid {new Date(order.paid_at).toLocaleDateString("th-TH")}
                      </span>
                    )}
                  </div>
                </div>

                {order.status === "pending_payment" && slips.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <div className="font-semibold text-sm">สลิปชำระเงิน</div>
                    {slipPreview && (
                      <img
                        src={slipPreview}
                        alt="สลิป"
                        className="max-h-64 rounded-lg border border-border object-contain"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onConfirmPay}
                        className="flex items-center gap-1 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        <Check className="size-4" /> ยืนยันชำระ
                      </button>
                      {slips[0] && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await rejectSlip({ data: { slipId: slips[0].id } });
                              toast.success("ปฏิเสธสลิปแล้ว");
                              load();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
                            }
                          }}
                          className="flex items-center gap-1 border border-border rounded-xl px-3 py-2 text-sm text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {(order.status === "paid" || order.backoffice_forward_error) && (
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
                    <div className="font-semibold">ส่งไป wp-backoffice</div>
                    {order.backoffice_forwarded_at ? (
                      <p className="text-success text-xs">
                        ส่งแล้ว {new Date(order.backoffice_forwarded_at).toLocaleString("th-TH")} ·{" "}
                        {(order.backoffice_refs ?? []).length} รายการ
                      </p>
                    ) : order.backoffice_forward_error ? (
                      <p className="text-destructive text-xs">{order.backoffice_forward_error}</p>
                    ) : (
                      <p className="text-muted-foreground text-xs">ยังไม่ได้ส่ง</p>
                    )}
                    <button
                      type="button"
                      onClick={onRetryForward}
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold"
                    >
                      <RefreshCw className="size-3.5" /> ส่งใหม่
                    </button>
                  </div>
                )}

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3">รายการ</th>
                        <th className="text-right px-4 py-3">จำนวน</th>
                        <th className="text-right px-4 py-3">ราคา</th>
                        <th className="text-right px-4 py-3">รวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((it) => {
                        const cfg = it.config as {
                          widthCm?: number;
                          heightCm?: number;
                          fullness?: number;
                          curtainType?: string;
                        };
                        return (
                          <tr key={it.id} className="align-top">
                            <td className="px-4 py-3">
                              <div className="font-semibold">{it.product_name}</div>
                              {cfg.widthCm && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {cfg.curtainType ? curtainTypeLabels[cfg.curtainType] : ""} ·{" "}
                                  {cfg.widthCm}×{cfg.heightCm} cm · ×{cfg.fullness}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">{it.qty}</td>
                            <td className="px-4 py-3 text-right">{fmtTHB(it.unit_price)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-primary">
                              {fmtTHB(it.line_total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {order.note && (
                  <div className="bg-card border border-border rounded-2xl p-4 text-sm">
                    <div className="text-xs text-muted-foreground uppercase mb-1">หมายเหตุ</div>
                    {order.note}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm">
                  <div className="font-semibold mb-1">ผู้สั่งซื้อ</div>
                  <Row label="ชื่อ" value={order.customer_name ?? "—"} />
                  <Row label="โทร" value={order.customer_phone ?? "—"} />
                  <Row label="ที่อยู่" value={order.customer_address ?? "—"} />
                  {buyer && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <Row label="บัญชี" value={buyer.full_name ?? buyer.email ?? "—"} />
                      <Row label="Tier" value={buyer.tier.toUpperCase()} />
                    </>
                  )}
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm">
                  <div className="font-semibold mb-1">สรุปยอด</div>
                  <Row label="ยอดรวม" value={fmtTHB(order.subtotal)} />
                  <Row label="ส่วนลด" value={`− ${fmtTHB(order.discount)}`} />
                  {order.shipping_fee > 0 && (
                    <Row label="จัดส่ง" value={fmtTHB(order.shipping_fee)} />
                  )}
                  <Row label="VAT" value={fmtTHB(order.vat_amount)} />
                  {Number(order.payment_fee) > 0 && (
                    <Row label="ค่าธรรมเนียมชำระ" value={fmtTHB(order.payment_fee)} />
                  )}
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">รวมทั้งสิ้น</span>
                    <span className="text-lg font-bold text-primary">
                      {fmtTHB(order.grand_total)}
                    </span>
                  </div>
                  {["paid", "forwarded", "producing", "pending_payment"].includes(order.status) && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("คืนเงินเข้า Wallet และยกเลิกออเดอร์?")) return;
                        try {
                          await refundOrder({ data: { orderId: id } });
                          toast.success("คืนเงินแล้ว");
                          load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
                        }
                      }}
                      className="w-full mt-2 text-xs text-destructive border border-destructive/30 rounded-lg py-2"
                    >
                      คืนเงินเข้า Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
