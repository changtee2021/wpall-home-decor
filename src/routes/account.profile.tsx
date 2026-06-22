import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { EmailVerifyBanner } from "@/components/account/email-verify-banner";
import { AccountPageSkeleton } from "@/components/loading";
import { UserCircle, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { TIER_INFO, nextTier, type Tier } from "@/lib/tier";
import { fmtTHB } from "@/lib/pricing";
import { profileFormSchema, type ProfileFormValues } from "@/lib/customer/profile-schema";
import type { CustomerAddress } from "@/lib/customer/types";

export const Route = createFileRoute("/account/profile")({
  head: () => ({ meta: [{ title: "ข้อมูลส่วนตัว · WP ALL" }] }),
  component: ProfileEditPage,
});

function ProfileEditPage() {
  const { user, loading, refresh } = useAuth();
  const [form, setForm] = useState<ProfileFormValues>({
    full_name: "",
    phone: "",
    address: "",
  });
  const [tier, setTier] = useState<Tier>("bronze");
  const [totalSpent, setTotalSpent] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [defaultAddress, setDefaultAddress] = useState<CustomerAddress | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>(
    {},
  );

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,phone,address,tier,total_spent,order_count")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
          });
          setTier(data.tier as Tier);
          setTotalSpent(Number(data.total_spent ?? 0));
          setOrderCount(data.order_count ?? 0);
        }
      });

    supabase
      .from("addresses")
      .select("id,recipient_name,phone,line1,line2,district,province,postal_code,is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDefaultAddress(data as CustomerAddress | null));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setFieldErrors({});
    const parsed = profileFormSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof ProfileFormValues, string>> = {};
      parsed.error.errors.forEach((e) => {
        const key = e.path[0] as keyof ProfileFormValues;
        if (key) errs[key] = e.message;
      });
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    const payload = {
      full_name: parsed.data.full_name,
      address: parsed.data.address,
      phone: parsed.data.phone || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("บันทึกแล้ว");
    refresh();
  };

  if (loading) return <AccountPageSkeleton variant="form" />;
  if (!user) return <Navigate to="/login" replace />;

  const info = TIER_INFO[tier];
  const next = nextTier(tier);
  const nextInfo = next ? TIER_INFO[next] : null;
  const progress = nextInfo ? Math.min(100, (totalSpent / nextInfo.min) * 100) : 100;

  return (
    <AccountPageShell
      title="ข้อมูลส่วนตัว"
      description="จัดการข้อมูลติดต่อและสมาชิก WP ALL"
      icon={<UserCircle className="size-6 text-cyan-500" />}
    >
      <EmailVerifyBanner user={user} className="mb-5" />

      <div
        className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br"
        style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)` }}
      >
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {(form.full_name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{form.full_name || user.email}</div>
            <div className="text-xs font-semibold mt-0.5">
              ⭐ {info.label} · {orderCount} ออเดอร์ · {fmtTHB(totalSpent)}
            </div>
            {nextInfo && (
              <div className="mt-2 max-w-sm">
                <div className="flex justify-between text-[10px] opacity-90 mb-1">
                  <span>ไปยัง {nextInfo.label}</span>
                  <span>{fmtTHB(Math.max(0, nextInfo.min - totalSpent))} เพิ่มเติม</span>
                </div>
                <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
                  <div className="h-full bg-white" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start space-y-5 lg:space-y-0">
        <div className="space-y-5">
          {defaultAddress && (
            <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <MapPin className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-semibold">ที่อยู่จัดส่งหลัก</div>
                <div className="text-muted-foreground mt-1">
                  {defaultAddress.recipient_name} · {defaultAddress.phone}
                  <br />
                  {defaultAddress.line1}
                  {defaultAddress.district ? ` ${defaultAddress.district}` : ""}{" "}
                  {defaultAddress.province} {defaultAddress.postal_code}
                </div>
                <Link
                  to="/account/addresses"
                  className="text-primary text-xs font-semibold mt-2 inline-block"
                >
                  จัดการที่อยู่ →
                </Link>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">อีเมล</label>
              <input
                value={user.email ?? ""}
                disabled
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">ชื่อ-นามสกุล</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                maxLength={100}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm min-h-[44px]"
              />
              {fieldErrors.full_name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.full_name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">เบอร์โทร</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={20}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm min-h-[44px]"
              />
              {fieldErrors.phone && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">ที่อยู่ติดต่อ</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                maxLength={500}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <button
              onClick={save}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 min-h-[44px]"
            >
              {busy ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 hidden lg:block">
            <div className="font-semibold text-sm">สถิติสมาชิก</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="text-muted-foreground text-xs">ออเดอร์</div>
                <div className="font-bold text-lg">{orderCount}</div>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <div className="text-muted-foreground text-xs">ยอดใช้จ่าย</div>
                <div className="font-bold text-lg">{fmtTHB(totalSpent)}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              ระดับ {info.label} · ส่วนลด {(info.discount * 100).toFixed(0)}%
            </div>
          </div>

          <Link
            to="/account/security"
            className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:bg-muted/30 transition-colors min-h-[44px]"
          >
            <ShieldCheck className="size-5 text-slate-600" />
            <div>
              <div className="font-semibold text-sm">ความปลอดภัย</div>
              <div className="text-xs text-muted-foreground">เปลี่ยนรหัสผ่าน</div>
            </div>
          </Link>
        </div>
      </div>
    </AccountPageShell>
  );
}
