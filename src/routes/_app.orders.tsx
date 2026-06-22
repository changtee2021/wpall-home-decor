import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fmtTHB } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { appPublicUrl } from "@/lib/app-public-url";
import { useServerFn } from "@tanstack/react-start";
import { confirmC2C2PPaymentReturn } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AccountOrdersContentShell } from "@/components/layout/account-layout";
import { OrdersListSkeleton } from "@/components/loading";
import { filterOrdersByHubStatus, orderStatusMeta } from "@/lib/customer/order-status";
import { OrderStatusTabs, parseOrdersStatusSearch } from "@/components/orders/order-status-tabs";

const ORD_TITLE = "ใบเสนอราคา & ออเดอร์ · WP ALL";

export const Route = createFileRoute("/_app/orders")({
  validateSearch: (search: Record<string, unknown>) => ({
    c2c2p: typeof search.c2c2p === "string" ? search.c2c2p : undefined,
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
    status: parseOrdersStatusSearch(search),
  }),
  head: () => {
    const url = `${appPublicUrl()}/orders`;
    return {
      meta: [
        { title: ORD_TITLE },
        { name: "robots", content: "noindex,follow" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: OrdersPage,
});

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  grand_total: number;
  payment_fee: number;
  payment_method: string | null;
  status: string;
  created_at: string;
}

function OrdersPage() {
  const { user } = useAuth();
  const { c2c2p, orderId: returnOrderId, status: statusFilter } = Route.useSearch();
  const confirmC2C2P = useServerFn(confirmC2C2PPaymentReturn);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [syncingReturn, setSyncingReturn] = useState(false);

  const filteredOrders = useMemo(
    () => filterOrdersByHubStatus(orders, statusFilter),
    [orders, statusFilter],
  );

  const loadOrders = async (uid: string) => {
    const { data } = await supabase
      .from("orders")
      .select(
        "id,order_number,customer_name,grand_total,payment_fee,payment_method,status,created_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data ?? []) as OrderRow[]);
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setBusy(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setBusy(true);

      if (c2c2p === "return" && returnOrderId) {
        setSyncingReturn(true);
        try {
          const res = await confirmC2C2P({ data: { orderId: returnOrderId } });
          if (res.paid) {
            toast.success("ชำระเงินสำเร็จ");
          } else if (res.pending) {
            toast.info(res.message ?? "รอการยืนยันจาก 2C2P — จะอัปเดตอัตโนมัติเมื่อสำเร็จ");
          } else if (res.message) {
            toast.error(res.message);
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "ตรวจสอบสถานะชำระเงินไม่สำเร็จ");
        } finally {
          setSyncingReturn(false);
          window.history.replaceState({}, "", "/orders");
        }
      }

      if (!cancelled) {
        await loadOrders(user.id);
        setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, c2c2p, returnOrderId, confirmC2C2P]);

  return (
    <AccountOrdersContentShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ออเดอร์ของฉัน</h1>
          <p className="text-sm text-muted-foreground mt-1">ติดตามและจัดการออเดอร์ทั้งหมด</p>
        </div>

        {user && <OrderStatusTabs active={statusFilter} />}

        {syncingReturn && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-xl px-4 py-3">
            <Loader2 className="size-4 animate-spin" />
            กำลังตรวจสอบการชำระเงิน 2C2P...
          </div>
        )}

        {!user ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
            กรุณา{" "}
            <Link to="/login" className="text-primary font-semibold underline">
              เข้าสู่ระบบ
            </Link>{" "}
            เพื่อดูรายการ
          </div>
        ) : busy ? (
          <OrdersListSkeleton />
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
            {orders.length === 0 ? (
              <>
                ยังไม่มีรายการ —{" "}
                <Link to="/products" className="text-primary font-semibold">
                  เลือกสินค้า
                </Link>
              </>
            ) : (
              <>ไม่มีออเดอร์ในสถานะนี้</>
            )}
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {filteredOrders.map((o) => {
                const st = orderStatusMeta(o.status);
                return (
                  <div
                    key={o.id}
                    className="bg-card border border-border rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{o.order_number}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.customer_name ?? "—"}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-foreground">
                          {fmtTHB(Number(o.grand_total))}
                        </div>
                        {Number(o.payment_fee) > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            รวมค่าธรรมเนียม {fmtTHB(o.payment_fee)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(o.created_at).toLocaleDateString("th-TH")}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          to="/orders/$id"
                          params={{ id: o.id }}
                          className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          รายละเอียด
                        </Link>
                        {o.status === "pending_payment" &&
                          (o.payment_method === "promptpay_direct" ||
                            o.payment_method === "transfer") && (
                            <Link
                              to="/orders/$id/pay"
                              params={{ id: o.id }}
                              className="text-secondary text-xs font-semibold hover:underline"
                            >
                              ชำระเงิน
                            </Link>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="p-4">เลขที่</th>
                      <th className="p-4">ลูกค้า</th>
                      <th className="p-4 text-right">ยอดรวม</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4">วันที่</th>
                      <th className="p-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const st = orderStatusMeta(o.status);
                      return (
                        <tr key={o.id} className="border-t border-border hover:bg-accent/30">
                          <td className="p-4 font-semibold">{o.order_number}</td>
                          <td className="p-4">{o.customer_name ?? "—"}</td>
                          <td className="p-4 text-right">
                            <div className="font-semibold text-foreground">
                              {fmtTHB(Number(o.grand_total))}
                            </div>
                            {Number(o.payment_fee) > 0 && (
                              <div className="text-[10px] text-muted-foreground">
                                รวมค่าธรรมเนียม {fmtTHB(o.payment_fee)}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${st.cls}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(o.created_at).toLocaleDateString("th-TH")}
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <Link
                              to="/orders/$id"
                              params={{ id: o.id }}
                              className="text-primary text-xs font-semibold hover:underline"
                            >
                              รายละเอียด →
                            </Link>
                            {o.status === "pending_payment" &&
                              (o.payment_method === "promptpay_direct" ||
                                o.payment_method === "transfer") && (
                                <Link
                                  to="/orders/$id/pay"
                                  params={{ id: o.id }}
                                  className="text-secondary text-xs font-semibold hover:underline"
                                >
                                  ชำระเงิน →
                                </Link>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AccountOrdersContentShell>
  );
}
