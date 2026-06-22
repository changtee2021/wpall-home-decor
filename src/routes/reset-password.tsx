import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appPublicUrl } from "@/lib/app-public-url";
import {
  AuthCardShell,
  AuthFormAlert,
  AuthPasswordField,
  AuthSubmitButton,
} from "@/components/auth/auth-form";
import {
  mapAuthError,
  resetPasswordSchema,
  zodFieldErrors,
  type FieldErrors,
} from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  head: () => {
    const url = `${appPublicUrl()}/reset-password`;
    return {
      meta: [
        { title: "ตั้งรหัสผ่านใหม่ · WP ALL" },
        {
          name: "description",
          content: "ตั้งรหัสผ่านใหม่สำหรับบัญชี WP ALL ของคุณ",
        },
        { property: "og:title", content: "ตั้งรหัสผ่านใหม่ · WP ALL" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function checkRecoverySession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.history.replaceState({}, "", url.pathname);
        }
      }

      const { data: initial } = await supabase.auth.getSession();
      if (!cancelled && initial.session) {
        setHasSession(true);
        setChecking(false);
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasSession(true);
          setChecking(false);
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      // Give Supabase a moment to parse hash from the magic link
      await new Promise((r) => setTimeout(r, 500));
      const { data: retry } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(!!retry.session);
        setChecking(false);
      }
    }

    void checkRecoverySession();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);

    if (error) {
      const mapped = mapAuthError(error.message);
      setFormError(mapped.formError);
      if (mapped.fieldErrors) setFieldErrors(mapped.fieldErrors);
      return;
    }

    toast.success("ตั้งรหัสผ่านใหม่เรียบร้อย");
    navigate({ to: "/login", replace: true });
  };

  if (checking) {
    return (
      <AuthCardShell title="ตั้งรหัสผ่านใหม่" subtitle="กำลังตรวจสอบลิงก์...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthCardShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthCardShell title="ลิงก์หมดอายุ" subtitle="ไม่สามารถตั้งรหัสผ่านใหม่ได้">
        <p className="text-sm text-muted-foreground text-center mb-4">
          ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่
        </p>
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
            ขอลิงก์รีเซ็ตรหัสผ่านใหม่
          </Link>
          <Link to="/login" className="text-muted-foreground hover:underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell title="ตั้งรหัสผ่านใหม่" subtitle="กรอกรหัสผ่านใหม่ของคุณ">
      <AuthFormAlert message={formError} />

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthPasswordField
          id="password"
          label="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
          value={password}
          autoComplete="new-password"
          required
          error={fieldErrors.password}
          onChange={(v) => {
            setPassword(v);
            clearFieldError("password");
          }}
        />
        <AuthPasswordField
          id="confirmPassword"
          label="ยืนยันรหัสผ่านใหม่"
          value={confirmPassword}
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            clearFieldError("confirmPassword");
          }}
        />

        <AuthSubmitButton label="บันทึกรหัสผ่านใหม่" loadingLabel="กำลังบันทึก..." busy={busy} />
      </form>
    </AuthCardShell>
  );
}
