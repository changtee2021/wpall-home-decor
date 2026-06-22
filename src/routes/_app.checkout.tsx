import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useShopCart } from "@/hooks/use-shop-cart";
import { fmtTHB, VAT_RATE } from "@/lib/pricing";
import { TIER_INFO } from "@/lib/tier";
import { getMyWallet, type Wallet } from "@/lib/wallet";
import { useServerFn } from "@tanstack/react-start";
import { createOrder } from "@/lib/orders.functions";
import { payOrderWithWallet, initiateC2C2PPayment } from "@/lib/checkout.functions";
import { fetchPaymentFeeRates } from "@/lib/payment-settings";
import {
  calcPaymentFee,
  feeRateLabel,
  PAYMENT_METHOD_LABELS,
  type PaymentFeeRates,
  type PaymentMethod,
} from "@/lib/payment-fees";
import { appPublicUrl } from "@/lib/app-public-url";
import { toast } from "sonner";
import { CheckoutSkeleton } from "@/components/loading";
import {
  Wallet as WalletIcon,
  Banknote,
  Truck,
  Loader2,
  ChevronLeft,
  MapPin,
  CheckCircle2,
  Ticket,
  QrCode,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredReferral } from "@/lib/referral";

const SHIPPING_FEE = 0;
const CHECKOUT_TITLE = "ชำระเงิน · WP ALL";

export const Route = createFileRoute("/_app/checkout")({
  head: () => {
    const url = `${appPublicUrl()}/checkout`;
    return {
      meta: [
        { title: CHECKOUT_TITLE },
        { name: "robots", content: "noindex,follow" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CheckoutPage,
});

interface AddressRow {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  district: string | null;
  province: string;
  postal_code: string;
  is_default: boolean;
}

interface UserCouponRow {
  id: string;
  coupon_id: string;
  used_at: string | null;
  coupons: {
    title: string;
    type: "percent" | "fixed" | "free_shipping";
    value: number;
    min_order: number;
    max_discount: number | null;
  };
}

const CHECKOUT_METHODS: {
  id: PaymentMethod;
  icon: typeof WalletIcon;
  title: string;
  detail: string;
  c2c2p?: boolean;
}[] = [
  {
    id: "promptpay_direct",
    icon: QrCode,
    title: PAYMENT_METHOD_LABELS.promptpay_direct,
    detail: "สแกน QR ยอดตรงออเดอร์ · ไม่มีค่าธรรมเนียม",
  },
  {
    id: "wallet",
    icon: WalletIcon,
    title: PAYMENT_METHOD_LABELS.wallet,
    detail: "ชำระทันทีจากกระเป๋า WP",
  },
  {
    id: "c2c2p_card",
    icon: CreditCard,
    title: PAYMENT_METHOD_LABELS.c2c2p_card,
    detail: "Visa / Mastercard ผ่าน 2C2P",
    c2c2p: true,
  },
  {
    id: "c2c2p_wallet",
    icon: Banknote,
    title: PAYMENT_METHOD_LABELS.c2c2p_wallet,
    detail: "TrueMoney / LINE Pay ผ่าน 2C2P",
    c2c2p: true,
  },
  {
    id: "c2c2p_installment",
    icon: CreditCard,
    title: PAYMENT_METHOD_LABELS.c2c2p_installment,
    detail: "ผ่อนชำระผ่าน 2C2P",
    c2c2p: true,
  },
  {
    id: "cod",
    icon: Truck,
    title: PAYMENT_METHOD_LABELS.cod,
    detail: "ชำระเมื่อรับสินค้า",
  },
];

function CheckoutPage() {
  const { user, profile, loading } = useAuth();
  const { items, subtotal, isLoading: cartLoading, clearCart } = useShopCart();
  const navigate = useNavigate();
  const placeOrder = useServerFn(createOrder);
  const payWallet = useServerFn(payOrderWithWallet);
  const startC2C2P = useServerFn(initiateC2C2PPayment);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [coupons, setCoupons] = useState<UserCouponRow[]>([]);
  const [feeRates, setFeeRates] = useState<PaymentFeeRates | null>(null);
  const [addrId, setAddrId] = useState<string | null>(null);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("promptpay_direct");
  const [submitting, setSubmitting] = useState(false);
  const [c2c2pEnabled, setC2c2pEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyWallet(user.id).then(setWallet);
    fetchPaymentFeeRates().then(setFeeRates);
    fetch("/api/public/c2c2p-status")
      .then((r) => r.json())
      .then((j: { enabled?: boolean }) => setC2c2pEnabled(!!j.enabled))
      .catch(() => setC2c2pEnabled(false));
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const arr = (data ?? []) as AddressRow[];
        setAddresses(arr);
        setAddrId(arr.find((a) => a.is_default)?.id ?? arr[0]?.id ?? null);
      });
    supabase
      .from("user_coupons")
      .select("id,coupon_id,used_at,coupons(title,type,value,min_order,max_discount)")
      .eq("user_id", user.id)
      .is("used_at", null)
      .then(({ data }) => setCoupons((data ?? []) as UserCouponRow[]));
  }, [user]);

  const tierPct = profile ? TIER_INFO[profile.tier].discount : 0;
  const tierDisc = subtotal * tierPct;
  const selectedCoupon = coupons.find((c) => c.id === couponId);

  const couponDisc = useMemo(() => {
    if (!selectedCoupon) return 0;
    const c = selectedCoupon.coupons;
    const base = subtotal - tierDisc;
    if (base < c.min_order) return 0;
    if (c.type === "percent") {
      let d = base * (Number(c.value) / 100);
      if (c.max_discount != null) d = Math.min(d, Number(c.max_discount));
      return d;
    }
    if (c.type === "fixed") return Math.min(Number(c.value), base);
    if (c.type === "free_shipping") return SHIPPING_FEE;
    return 0;
  }, [selectedCoupon, subtotal, tierDisc]);

  const netBeforeVat = subtotal - tierDisc - couponDisc + SHIPPING_FEE;
  const vat = netBeforeVat * VAT_RATE;
  const baseTotal = netBeforeVat + vat;
  const rates = feeRates ?? {
    promptpay_direct: 0,
    wallet: 0,
    transfer: 0,
    cod_flat: 0,
    c2c2p_card: 0.0365,
    c2c2p_wallet: 0.015,
    c2c2p_installment: 0.05,
  };
  const paymentFee = calcPaymentFee(baseTotal, method, rates);
  const grandTotal = baseTotal + paymentFee;
  const feeLabel = feeRateLabel(method, rates);

  const visibleMethods = CHECKOUT_METHODS.filter((m) => !m.c2c2p || c2c2pEnabled);

  if (loading || cartLoading) return <CheckoutSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (items.length === 0) return <Navigate to="/cart" replace />;

  const addr = addresses.find((a) => a.id === addrId);
  const insufficient = method === "wallet" && (wallet?.balance ?? 0) < grandTotal;

  const handlePay = async () => {
    if (!addr) {
      toast.error("กรุณาเลือกที่อยู่จัดส่ง");
      return;
    }
    if (insufficient) {
      toast.error("ยอดเงินในกระเป๋าไม่พอ กรุณาเติมเงิน");
      return;
    }
    setSubmitting(true);
    try {
      const fullAddress = [addr.line1, addr.line2, addr.district, addr.province, addr.postal_code]
        .filter(Boolean)
        .join(" ");
      const res = await placeOrder({
        data: {
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            config: i.config,
            qty: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          })),
          subtotal,
          discount: couponId ? tierDisc : tierDisc + couponDisc,
          vatAmount: vat,
          baseTotal,
          paymentFee,
          grandTotal,
          shippingFee: SHIPPING_FEE,
          customerName: addr.recipient_name,
          customerPhone: addr.phone,
          customerAddress: fullAddress,
          shippingAddressId: addr.id,
          paymentMethod: method,
          userCouponId: couponId ?? undefined,
          referralCode: getStoredReferral() ?? undefined,
        },
      });

      if (method === "wallet") {
        await payWallet({ data: { orderId: res.id } });
        toast.success("ชำระเงินสำเร็จ");
        await clearCart.mutateAsync();
        navigate({ to: "/orders" });
      } else if (method === "promptpay_direct") {
        await clearCart.mutateAsync();
        navigate({ to: "/orders/$id/pay", params: { id: res.id } });
      } else if (
        method === "c2c2p_card" ||
        method === "c2c2p_wallet" ||
        method === "c2c2p_installment"
      ) {
        const { redirectUrl } = await startC2C2P({
          data: { orderId: res.id, method },
        });
        await clearCart.mutateAsync();
        window.location.href = redirectUrl;
      } else {
        toast.success(`สร้างออเดอร์ ${res.order_number} — ชำระเมื่อรับสินค้า`);
        await clearCart.mutateAsync();
        navigate({ to: "/orders" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-3xl">
      <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="size-4" /> ตะกร้า
      </Link>
      <h1 className="text-2xl font-bold">ชำระเงิน</h1>

      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2">
            <MapPin className="size-4 text-primary" /> ที่อยู่จัดส่ง
          </div>
          <Link to="/account/addresses" className="text-xs text-primary font-semibold">
            จัดการ →
          </Link>
        </div>
        {addresses.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            ยังไม่มีที่อยู่ —{" "}
            <Link to="/account/addresses" className="text-primary font-semibold">
              เพิ่มที่อยู่
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAddrId(a.id)}
                className={`w-full text-left p-3 rounded-xl border-2 ${addrId === a.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {a.recipient_name}{" "}
                  <span className="text-muted-foreground font-normal">· {a.phone}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[a.line1, a.line2, a.district, a.province, a.postal_code]
                    .filter(Boolean)
                    .join(" ")}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {coupons.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-4">
          <div className="font-semibold mb-3 flex items-center gap-2">
            <Ticket className="size-4 text-primary" /> คูปอง
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setCouponId(null)}
              className={`w-full text-left p-3 rounded-xl border-2 text-sm ${!couponId ? "border-primary bg-primary/5" : "border-border"}`}
            >
              ไม่ใช้คูปอง
            </button>
            {coupons.map((c) => {
              const eligible = subtotal - tierDisc >= c.coupons.min_order;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!eligible}
                  onClick={() => setCouponId(c.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 text-sm disabled:opacity-40 ${couponId === c.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="font-semibold">{c.coupons.title}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="font-semibold mb-3">วิธีการชำระเงิน</div>
        <div className="space-y-2">
          {visibleMethods.map((m) => {
            const feeHint = feeRateLabel(m.id, rates);
            const isWallet = m.id === "wallet";
            const warn = isWallet && (wallet?.balance ?? 0) < grandTotal;
            return (
              <MethodOpt
                key={m.id}
                active={method === m.id}
                onClick={() => setMethod(m.id)}
                icon={m.icon}
                title={m.title}
                detail={
                  isWallet
                    ? `ยอด ${fmtTHB(wallet?.balance ?? 0)}${warn ? " · ยอดไม่พอ" : ""}${feeHint ? ` · ค่าธรรมเนียม ${feeHint}` : " · ไม่มีค่าธรรมเนียม"}`
                    : feeHint
                      ? `${m.detail} · ค่าธรรมเนียม ${feeHint}`
                      : m.detail
                }
                warning={warn}
              />
            );
          })}
        </div>
        {insufficient && method === "wallet" && (
          <Link
            to="/account/wallet/topup"
            className="mt-3 block text-center bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold"
          >
            เติมเงินกระเป๋า
          </Link>
        )}
      </section>

      <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="font-semibold mb-1">สรุปคำสั่งซื้อ</div>
        <Row k="ยอดรวมสินค้า" v={fmtTHB(subtotal)} />
        {tierDisc > 0 && (
          <Row k={`ส่วนลด Tier (${(tierPct * 100).toFixed(0)}%)`} v={`− ${fmtTHB(tierDisc)}`} />
        )}
        {couponDisc > 0 && <Row k="ส่วนลดคูปอง" v={`− ${fmtTHB(couponDisc)}`} />}
        <Row k="VAT 7%" v={fmtTHB(vat)} />
        <Row k="ยอดก่อนค่าธรรมเนียม" v={fmtTHB(baseTotal)} />
        {paymentFee > 0 && (
          <Row k={`ค่าธรรมเนียมชำระ${feeLabel ? ` (${feeLabel})` : ""}`} v={fmtTHB(paymentFee)} />
        )}
        <div className="border-t border-border pt-2 flex justify-between items-baseline">
          <span className="font-semibold">ยอดชำระทั้งสิ้น</span>
          <span className="text-2xl font-bold text-secondary">{fmtTHB(grandTotal)}</span>
        </div>
      </section>

      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || insufficient || !addr}
        className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full py-3.5 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-5" />
        )}
        ยืนยันสั่งซื้อ {fmtTHB(grandTotal)}
      </button>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function MethodOpt({
  active,
  onClick,
  icon: Icon,
  title,
  detail,
  warning,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof WalletIcon;
  title: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${active ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <div className="flex-1 text-left">
        <div className="font-semibold text-sm">{title}</div>
        <div className={`text-xs ${warning ? "text-destructive" : "text-muted-foreground"}`}>
          {detail}
        </div>
      </div>
      <div
        className={`size-5 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`}
      />
    </button>
  );
}
