import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { AccountPageSkeleton } from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { applyForAffiliate, upsertAffiliateBankAccount } from "@/lib/affiliate.functions";
import {
  AFFILIATE_STATUS_LABELS,
  COMMISSION_STATUS_LABELS,
  THAI_BANKS,
  getMyAffiliate,
  getMyAffiliateCommissions,
  getMyBankAccounts,
  type Affiliate,
  type AffiliateBankAccount,
  type AffiliateCommission,
} from "@/lib/affiliate";
import { buildReferralUrl } from "@/lib/referral";
import { fmtTHB } from "@/lib/pricing";
import { toast } from "sonner";
import {
  Handshake,
  Copy,
  Share2,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/account/affiliate")({
  head: () => ({ meta: [{ title: "ช่วยขายรับคอมมิชชัน · WP ALL" }] }),
  component: AffiliatePage,
});

function AffiliatePage() {
  const { user, loading } = useAuth();
  const apply = useServerFn(applyForAffiliate);
  const saveBank = useServerFn(upsertAffiliateBankAccount);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [banks, setBanks] = useState<AffiliateBankAccount[]>([]);
  const [busy, setBusy] = useState(true);
  const [applying, setApplying] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [bankCode, setBankCode] = useState(THAI_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setBusy(true);
    const aff = await getMyAffiliate(user.id);
    setAffiliate(aff);
    if (aff) {
      const [comms, accts] = await Promise.all([
        getMyAffiliateCommissions(aff.id),
        getMyBankAccounts(aff.id),
      ]);
      setCommissions(comms);
      setBanks(accts);
    }
    setBusy(false);
  };

  useEffect(() => {
    refresh();
  }, [user]);

  if (loading || busy) return <AccountPageSkeleton variant="cards" />;
  if (!user) return <Navigate to="/login" replace />;

  const handleApply = async () => {
    if (!accepted) {
      toast.error("กรุณายอมรับข้อกำหนดโปรแกรม Affiliate");
      return;
    }
    setApplying(true);
    try {
      const res = await apply();
      toast.success("ส่งคำขอสมัครแล้ว รอแอดมินอนุมัติ");
      setAffiliate({
        id: res.id,
        user_id: user.id,
        referral_code: res.referral_code,
        status: res.status as Affiliate["status"],
        accepted_terms_at: new Date().toISOString(),
        approved_at: null,
        rejected_reason: null,
        total_orders: 0,
        total_commission_accrued: 0,
        total_commission_paid: 0,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สมัครไม่สำเร็จ");
    } finally {
      setApplying(false);
    }
  };

  const copyLink = () => {
    if (!affiliate) return;
    const url = buildReferralUrl(affiliate.referral_code);
    void navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์แล้ว");
  };

  const shareLine = () => {
    if (!affiliate) return;
    const url = buildReferralUrl(affiliate.referral_code);
    const text = `แนะนำร้าน WP ALL ม่าน มู่ลี่ ของแต่งบ้าน สั่งผ่านลิงก์นี้เลย\n${url}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };

  const handleSaveBank = async () => {
    const bank = THAI_BANKS.find((b) => b.code === bankCode);
    if (!bank || !accountNumber.trim() || !accountName.trim()) {
      toast.error("กรุณากรอกข้อมูลบัญชีให้ครบ");
      return;
    }
    setSavingBank(true);
    try {
      await saveBank({
        data: {
          bankCode: bank.code,
          bankName: bank.name,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          isDefault: true,
        },
      });
      toast.success("บันทึกบัญชีธนาคารแล้ว");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingBank(false);
    }
  };

  const pendingTotal = commissions
    .filter((c) => c.status === "accrued" || c.status === "in_payout")
    .reduce((s, c) => s + c.commission_amount, 0);

  if (!affiliate) {
    return (
      <AccountPageShell
        title="ช่วยขาย รับคอมมิชชัน"
        description="แชร์ลิงก์ของคุณ เมื่อมีคนซื้อและชำระเงินแล้ว จะได้ค่าคอมมิชชันตาม % ของสินค้า โอนเข้าบัญชีทุกเดือน"
        icon={<Handshake className="size-6 text-primary" />}
      >
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold">สมัครเป็น Affiliate</h2>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>แต่ละสินค้า/หมวดมี % คอมมิชชันต่างกัน</li>
            <li>คอมมิชชันคำนวณเมื่อลูกค้าชำระเงินแล้ว</li>
            <li>โอนเข้าบัญชีธนาคารทุกเดือน หลังบริษัททำบัญชีจ่าย</li>
            <li>ต้องรอแอดมินอนุมัติก่อนเริ่มแชร์ลิงก์</li>
          </ul>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>ยอมรับข้อกำหนดโปรแกรม Affiliate และนโยบายการจ่ายค่าคอมมิชชัน</span>
          </label>
          <Button onClick={handleApply} disabled={applying} className="min-h-11">
            {applying && <Loader2 className="size-4 animate-spin mr-2" />}
            ส่งคำขอสมัคร
          </Button>
        </section>
      </AccountPageShell>
    );
  }

  const statusIcon =
    affiliate.status === "active" ? (
      <CheckCircle2 className="size-4 text-emerald-600" />
    ) : affiliate.status === "rejected" ? (
      <XCircle className="size-4 text-destructive" />
    ) : (
      <Clock className="size-4 text-amber-600" />
    );

  return (
    <AccountPageShell
      title="ช่วยขาย รับคอมมิชชัน"
      description="แชร์ลิงก์ · ติดตามคอมมิชชัน · รับโอนทุกเดือน"
      icon={<Handshake className="size-6 text-primary" />}
    >
      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {statusIcon}
            สถานะ: {AFFILIATE_STATUS_LABELS[affiliate.status]}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{affiliate.referral_code}</div>
        </div>
        {affiliate.status === "rejected" && affiliate.rejected_reason && (
          <p className="text-sm text-destructive">{affiliate.rejected_reason}</p>
        )}
        {affiliate.status === "pending" && (
          <p className="text-sm text-muted-foreground">
            คำขอของคุณอยู่ระหว่างรอแอดมินอนุมัติ — เมื่ออนุมัติแล้วจึงแชร์ลิงก์ได้
          </p>
        )}
        {affiliate.status === "active" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink} className="min-h-11">
              <Copy className="size-4 mr-2" /> คัดลอกลิงก์
            </Button>
            <Button variant="outline" onClick={shareLine} className="min-h-11">
              <Share2 className="size-4 mr-2" /> แชร์ LINE
            </Button>
          </div>
        )}
      </section>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="ออเดอร์จากลิงก์" value={String(affiliate.total_orders)} />
        <StatCard label="คอมรอจ่าย/ในรอบ" value={fmtTHB(pendingTotal)} />
        <StatCard label="คอมโอนแล้ว" value={fmtTHB(affiliate.total_commission_paid)} />
      </div>

      {affiliate.status === "active" && (
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <Building2 className="size-5" /> บัญชีรับโอนค่าคอมมิชชัน
          </h2>
          {banks[0] ? (
            <div className="text-sm space-y-1 bg-muted/50 rounded-xl p-4">
              <div>{banks[0].bank_name}</div>
              <div className="font-mono">{banks[0].account_number}</div>
              <div>{banks[0].account_name}</div>
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              กรุณาเพิ่มบัญชีธนาคารเพื่อรับโอนค่าคอมมิชชันรายเดือน
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ธนาคาร</Label>
              <Select value={bankCode} onValueChange={setBankCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THAI_BANKS.map((b) => (
                    <SelectItem key={b.code} value={b.code}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>เลขบัญชี</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="xxx-x-xxxxx-x"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>ชื่อบัญชี</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="ชื่อ-นามสกุล ตามบัญชีธนาคาร"
              />
            </div>
          </div>
          <Button onClick={handleSaveBank} disabled={savingBank} className="min-h-11">
            {savingBank && <Loader2 className="size-4 animate-spin mr-2" />}
            บันทึกบัญชี
          </Button>
        </section>
      )}

      <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-bold">ประวัติค่าคอมมิชชัน</h2>
        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีรายการ</p>
        ) : (
          <div className="space-y-2 md:hidden">
            {commissions.map((c) => (
              <div key={c.id} className="border border-border rounded-xl p-3 text-sm space-y-1">
                <div className="font-medium">{c.product_name}</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {c.commission_pct}% จาก {fmtTHB(c.line_amount)}
                  </span>
                  <span className="font-semibold text-foreground">
                    {fmtTHB(c.commission_amount)}
                  </span>
                </div>
                <div className="text-xs">{COMMISSION_STATUS_LABELS[c.status]}</div>
              </div>
            ))}
          </div>
        )}
        {commissions.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">สินค้า</th>
                  <th className="py-2 pr-3">ฐาน</th>
                  <th className="py-2 pr-3">%</th>
                  <th className="py-2 pr-3">คอม</th>
                  <th className="py-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">{c.product_name}</td>
                    <td className="py-2.5 pr-3">{fmtTHB(c.line_amount)}</td>
                    <td className="py-2.5 pr-3">{c.commission_pct}%</td>
                    <td className="py-2.5 pr-3 font-semibold">{fmtTHB(c.commission_amount)}</td>
                    <td className="py-2.5">{COMMISSION_STATUS_LABELS[c.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AccountPageShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
