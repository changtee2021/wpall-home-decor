import { createFileRoute, Link } from "@tanstack/react-router";
import { fmtTHB, curtainTypeLabels, VAT_RATE } from "@/lib/pricing";
import { Printer, Download, ChevronLeft } from "lucide-react";
import logo from "@/assets/wp-logo.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPaymentInfo } from "@/lib/payment-settings";
import { DEFAULT_PAYMENT_INFO, type PaymentInfo } from "@/lib/payment-fees";
import { PaymentInfoBlock } from "@/components/payment/payment-info-block";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { QuotationSkeleton } from "@/components/loading";

import { COMPANY_EMAIL, COMPANY_NAME_EN, COMPANY_NAME_TH, COMPANY_TAX_ID } from "@/lib/company";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: number;
  discount: number;
  vat_amount: number;
  grand_total: number;
  payment_method: string | null;
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

export const Route = createFileRoute("/_app/quotation/$id")({
  head: ({ params }) => ({ meta: [{ title: `ใบเสนอราคา ${params.id.slice(0, 8)} · WP ALL` }] }),
  component: QuotationPage,
});

function QuotationPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(DEFAULT_PAYMENT_INFO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: it }, info] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        fetchPaymentInfo(),
      ]);
      setOrder(o as OrderRow | null);
      setItems((it ?? []) as ItemRow[]);
      setPaymentInfo(info);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <QuotationSkeleton />;
  if (!order) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">ไม่พบเอกสาร</h2>
        <Link to="/orders" className="text-primary text-sm mt-2 inline-block">
          ← กลับ
        </Link>
      </div>
    );
  }

  const isPaid = ["paid", "producing", "shipped", "done"].includes(order.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1"
        >
          <ChevronLeft className="size-4" /> รายการเอกสาร
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Printer className="size-4" /> พิมพ์
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Download className="size-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="no-print space-y-3 max-w-4xl mx-auto">
        <OrderStatusTimeline status={order.status} />
        {order.status === "pending_payment" &&
          (order.payment_method === "promptpay_direct" || order.payment_method === "transfer") && (
            <Link
              to="/orders/$id/pay"
              params={{ id: order.id }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
            >
              ชำระเงิน / อัปโหลดสลิป
            </Link>
          )}
      </div>

      <div className="bg-card border border-border rounded-3xl p-8 sm:p-10 max-w-4xl mx-auto">
        <div className="flex justify-between items-start pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-2xl bg-accent p-2">
              <img src={logo} alt="WP" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-lg">{COMPANY_NAME_TH}</div>
              <div className="text-xs text-muted-foreground">
                {COMPANY_NAME_EN} · เลขประจำตัวผู้เสียภาษี {COMPANY_TAX_ID}
              </div>
              <a
                href={`mailto:${COMPANY_EMAIL}`}
                className="text-xs text-primary hover:underline mt-0.5 inline-block"
              >
                {COMPANY_EMAIL}
              </a>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {isPaid ? "Tax Invoice" : "Quotation"}
            </div>
            <div className="text-2xl font-bold mt-1">{isPaid ? "ใบกำกับภาษี" : "ใบเสนอราคา"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              เลขที่: <span className="font-semibold text-foreground">{order.order_number}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              วันที่: {new Date(order.created_at).toLocaleDateString("th-TH")}
            </div>
            <div className="text-xs mt-1 inline-block px-2 py-0.5 rounded bg-muted font-semibold uppercase">
              {order.status}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 py-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              ลูกค้า
            </div>
            <div className="font-semibold">{order.customer_name ?? "ลูกค้าทั่วไป"}</div>
            {order.customer_phone && (
              <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
            )}
            {order.customer_address && (
              <div className="text-xs text-muted-foreground mt-0.5">{order.customer_address}</div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              ยืนราคาถึง
            </div>
            <div className="font-semibold">
              {new Date(new Date(order.created_at).getTime() + 30 * 86400000).toLocaleDateString(
                "th-TH",
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              เงื่อนไข: มัดจำ 50%, ส่วนที่เหลือก่อนติดตั้ง
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-muted text-left text-xs uppercase tracking-wider">
                <th className="p-3 rounded-l-lg">รายการ</th>
                <th className="p-3 text-right">จำนวน</th>
                <th className="p-3 text-right">ราคา/หน่วย</th>
                <th className="p-3 text-right rounded-r-lg">รวม</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const cfg = it.config as {
                  widthCm?: number;
                  heightCm?: number;
                  fullness?: number;
                  curtainType?: string;
                };
                return (
                  <tr key={it.id} className="border-b border-border align-top">
                    <td className="p-3">
                      <div className="font-semibold">{it.product_name}</div>
                      {cfg.widthCm && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {cfg.curtainType ? curtainTypeLabels[cfg.curtainType] : ""} ·{" "}
                          {cfg.widthCm}×{cfg.heightCm} cm · ×{cfg.fullness}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">{it.qty}</td>
                    <td className="p-3 text-right">{fmtTHB(it.unit_price)}</td>
                    <td className="p-3 text-right font-semibold">{fmtTHB(it.line_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-sm">
            <Row label="ยอดรวม" value={fmtTHB(order.subtotal)} />
            {order.discount > 0 && <Row label="ส่วนลด" value={`− ${fmtTHB(order.discount)}`} />}
            <Row label="ก่อน VAT" value={fmtTHB(order.subtotal - order.discount)} />
            <Row label={`VAT ${(VAT_RATE * 100).toFixed(0)}%`} value={fmtTHB(order.vat_amount)} />
            <div className="border-t border-border pt-2 flex justify-between items-baseline">
              <span className="font-semibold">รวมทั้งสิ้น</span>
              <span className="text-xl font-bold text-primary">{fmtTHB(order.grand_total)}</span>
            </div>
          </div>
        </div>

        {order.note && (
          <div className="mt-6 text-xs text-muted-foreground border-t border-border pt-3">
            <span className="font-semibold">หมายเหตุ: </span>
            {order.note}
          </div>
        )}

        {!isPaid && (
          <div className="mt-8 border-t border-border pt-6 print:break-before-page">
            <div className="text-sm font-bold mb-1">ช่องทางการชำระเงิน</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
              Payment Method
            </div>
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <PaymentInfoBlock
                info={paymentInfo}
                amount={Number(order.grand_total)}
                reference={order.order_number}
                compact
              />
              <div className="hidden md:block space-y-3 no-print">
                <img
                  src="/payment/promptpay-scb.png"
                  alt="PromptPay SCB"
                  className="w-full rounded-xl border border-border"
                />
                <img
                  src="/payment/bank-accounts.png"
                  alt="บัญชีธนาคาร"
                  className="w-full rounded-xl border border-border"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-6 text-xs text-muted-foreground">
          <div>
            <div className="border-t border-border pt-2 mt-12">ผู้ออกเอกสาร</div>
          </div>
          <div>
            <div className="border-t border-border pt-2 mt-12">ลูกค้า / ผู้สั่งซื้อ</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
