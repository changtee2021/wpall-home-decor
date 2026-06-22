import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { fmtTHB, curtainTypeLabels } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { orderStatusMeta } from "@/lib/customer/order-status";
import { AccountOrdersContentShell } from "@/components/layout/account-layout";
import { OrderDetailSkeleton } from "@/components/loading";

export const Route = createFileRoute("/_app/orders/$id")({
  head: ({ params }) => ({
    meta: [{ title: `ออเดอร์ ${params.id.slice(0, 8)} · WP ALL` }],
  }),
  component: OrderDetailPage,
});

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  grand_total: number;
  payment_fee: number;
  payment_method: string | null;
  subtotal: number;
  discount: number;
  vat_amount: number;
  created_at: string;
  note: string | null;
}

interface ItemRow {
  id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  config: Record<string, unknown>;
}

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    (async () => {
      const [{ data: o }, { data: it }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (!o || o.user_id !== user.id) {
        setDenied(true);
        setFetching(false);
        return;
      }
      setOrder(o as OrderRow);
      setItems((it ?? []) as ItemRow[]);
      setFetching(false);
    })();
  }, [id, user, authLoading]);

  if (authLoading || fetching) {
    return (
      <AccountOrdersContentShell>
        <OrderDetailSkeleton />
      </AccountOrdersContentShell>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (denied || !order) {
    return (
      <AccountOrdersContentShell>
        <NotFoundPage
          title="ไม่พบออเดอร์"
          description="ออเดอร์นี้อาจถูกลบ ไม่มีอยู่ในระบบ หรือคุณไม่มีสิทธิ์เข้าถึง"
          backTo={{ label: "กลับรายการออเดอร์", to: "/orders" }}
          compact
        />
      </AccountOrdersContentShell>
    );
  }

  const st = orderStatusMeta(order.status);
  const canPay =
    order.status === "pending_payment" &&
    (order.payment_method === "promptpay_direct" || order.payment_method === "transfer");

  return (
    <AccountOrdersContentShell>
      <div className="space-y-6">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px] lg:hidden"
        >
          <ChevronLeft className="size-4" /> ออเดอร์ของฉัน
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(order.created_at).toLocaleString("th-TH")}
            </p>
          </div>
          <span className={`self-start text-xs font-semibold rounded-full px-3 py-1.5 ${st.cls}`}>
            {st.label}
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <OrderStatusTimeline status={order.status} />
        </div>

        <div className="flex flex-wrap gap-2">
          {canPay && (
            <Link
              to="/orders/$id/pay"
              params={{ id: order.id }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
            >
              ชำระเงิน / อัปโหลดสลิป
            </Link>
          )}
          <Link
            to="/quotation/$id"
            params={{ id: order.id }}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted/50"
          >
            ดูใบเสนอราคา
          </Link>
          <Link
            to="/account/claims/new"
            search={{ orderId: order.id }}
            className="inline-flex min-h-11 gap-1.5 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted/50"
          >
            <ShieldAlert className="size-4" /> แจ้งเคลม
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
            <div className="font-semibold">ข้อมูลจัดส่ง</div>
            <div>{order.customer_name ?? "—"}</div>
            <div className="text-muted-foreground">{order.customer_phone ?? "—"}</div>
            <div className="text-muted-foreground whitespace-pre-wrap">
              {order.customer_address ?? "—"}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1 text-sm">
            <div className="font-semibold mb-2">สรุปยอด</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ยอดสินค้า</span>
              <span>{fmtTHB(Number(order.subtotal))}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ส่วนลด</span>
                <span>-{fmtTHB(Number(order.discount))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <span>{fmtTHB(Number(order.vat_amount))}</span>
            </div>
            {Number(order.payment_fee) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ค่าธรรมเนียม</span>
                <span>{fmtTHB(Number(order.payment_fee))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>รวมทั้งสิ้น</span>
              <span className="text-primary">{fmtTHB(Number(order.grand_total))}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold text-sm">รายการสินค้า</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-3">สินค้า</th>
                  <th className="p-3 text-right">จำนวน</th>
                  <th className="p-3 text-right">ราคา</th>
                  <th className="p-3 text-right">รวม</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const cfg = item.config ?? {};
                  const curtainType =
                    typeof cfg.curtain_type === "string"
                      ? (curtainTypeLabels[cfg.curtain_type] ?? cfg.curtain_type)
                      : null;
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3">
                        <div className="font-medium">{item.product_name}</div>
                        {curtainType && (
                          <div className="text-xs text-muted-foreground">{curtainType}</div>
                        )}
                      </td>
                      <td className="p-3 text-right">{item.qty}</td>
                      <td className="p-3 text-right">{fmtTHB(Number(item.unit_price))}</td>
                      <td className="p-3 text-right font-semibold">
                        {fmtTHB(Number(item.line_total))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {order.note && (
          <div className="bg-muted/40 border border-border rounded-2xl p-4 text-sm">
            <div className="font-semibold mb-1">หมายเหตุ</div>
            <p className="text-muted-foreground whitespace-pre-wrap">{order.note}</p>
          </div>
        )}
      </div>
    </AccountOrdersContentShell>
  );
}
