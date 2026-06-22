import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appPublicUrl } from "@/lib/app-public-url";
import { authVerifyEmailRedirectUrl } from "@/lib/auth-redirect";
import { AuthCardShell, AuthSubmitButton } from "@/components/auth/auth-form";
import { mapAuthError } from "@/lib/auth-errors";
import { resolvePostLoginPath } from "@/lib/auth-post-login";
import { clearEmailVerifyReminder } from "@/lib/auth-email-verify";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email.trim() : "",
  }),
  head: () => {
    const url = `${appPublicUrl()}/verify-email`;
    return {
      meta: [
        { title: "ยืนยันอีเมล · WP ALL" },
        {
          name: "description",
          content: "ยืนยันอีเมลเพื่อเปิดใช้งานบัญชี WP ALL ของคุณ",
        },
        { property: "og:title", content: "ยืนยันอีเมล · WP ALL" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: VerifyEmailPage,
});

const RESEND_COOLDOWN_SEC = 60;

function VerifyEmailPage() {
  const { email: emailFromSearch } = Route.useSearch();
  const router = useRouter();
  const { user, role, loading: authLoading, refresh } = useAuth();
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState(emailFromSearch);
  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (emailFromSearch) setEmail(emailFromSearch);
  }, [emailFromSearch]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function handleCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.history.replaceState({}, "", url.pathname);
          await refresh();
        }
      }

      const { data: initial } = await supabase.auth.getSession();
      if (!cancelled && initial.session?.user?.email_confirmed_at) {
        setVerified(true);
        setChecking(false);
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session?.user?.email_confirmed_at
        ) {
          setVerified(true);
          setChecking(false);
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      await new Promise((r) => setTimeout(r, 600));
      const { data: retry } = await supabase.auth.getSession();
      if (!cancelled) {
        if (retry.session?.user?.email_confirmed_at) {
          setVerified(true);
        }
        setChecking(false);
      }
    }

    void handleCallback();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refresh]);

  useEffect(() => {
    if (!authLoading && user?.email_confirmed_at) {
      setVerified(true);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!verified) return;
    void clearEmailVerifyReminder();
    toast.success("ยืนยันอีเมลสำเร็จ! ยินดีต้อนรับสู่ WP ALL");
    const t = setTimeout(() => {
      void router.history.replace(resolvePostLoginPath(role));
    }, 1500);
    return () => clearTimeout(t);
  }, [verified, role, router]);

  const handleResend = async () => {
    const target = email.trim();
    if (!target) {
      toast.error("กรุณากรอกอีเมลที่ใช้สมัคร");
      return;
    }
    if (cooldown > 0) return;

    setResendBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: authVerifyEmailRedirectUrl() },
    });
    setResendBusy(false);

    if (error) {
      toast.error(mapAuthError(error.message).formError);
      return;
    }

    toast.success("ส่งอีเมลยืนยันอีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมาย");
    setCooldown(RESEND_COOLDOWN_SEC);
  };

  if (checking) {
    return (
      <AuthCardShell title="ยืนยันอีเมล" subtitle="กำลังตรวจสอบ...">
        <div className="flex justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </AuthCardShell>
    );
  }

  if (verified) {
    return (
      <AuthCardShell title="ยืนยันอีเมลสำเร็จ!" subtitle="บัญชีของคุณพร้อมใช้งานแล้ว">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">กำลังพาคุณไปหน้าบัญชี...</p>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell
      title="ยืนยันอีเมลของคุณ"
      subtitle="ไม่บังคับ — ใช้งานร้านได้ทันที แนะนำยืนยันเพื่อความปลอดภัย"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10 p-5 text-center">
          <div className="mx-auto mb-3 size-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
            <Mail className="size-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">เราได้ส่งลิงก์ยืนยันไปที่</p>
          {email ? (
            <p className="mt-1 font-semibold text-foreground break-all">{email}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">อีเมลที่คุณใช้สมัคร</p>
          )}
        </div>

        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="shrink-0 size-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span>เปิดกล่องจดหมาย (ตรวจสอบโฟลเดอร์สแปม/จดหมายขยะด้วย)</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 size-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span>
              กดปุ่ม <strong className="text-foreground">ยืนยันอีเมล</strong> ในอีเมลจาก WP ALL
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 size-6 rounded-full bg-muted text-xs font-bold flex items-center justify-center">
              3
            </span>
            <span>กลับมาใช้งานได้ตามปกติ — ยืนยันแล้วแบนเนอร์ในโปรไฟล์จะหายไป</span>
          </li>
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleResend();
          }}
          className="space-y-0"
        >
          {!emailFromSearch && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="กรอกอีเมลที่ใช้สมัคร"
              required
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 mb-3"
            />
          )}

          <AuthSubmitButton
            label={cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที` : "ส่งอีเมลยืนยันอีกครั้ง"}
            loadingLabel="กำลังส่ง..."
            busy={resendBusy}
            disabled={cooldown > 0}
          />
        </form>

        <div className="flex flex-col items-center gap-2 text-sm pt-1">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            ไปหน้าเข้าสู่ระบบ
          </Link>
          <Link to="/" className="text-muted-foreground hover:underline text-xs">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </AuthCardShell>
  );
}
