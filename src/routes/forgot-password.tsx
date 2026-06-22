import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authResetPasswordRedirectUrl } from "@/lib/auth-redirect";
import { appPublicUrl } from "@/lib/app-public-url";
import {
  AuthCardShell,
  AuthFormAlert,
  AuthSubmitButton,
  AuthTextField,
} from "@/components/auth/auth-form";
import {
  forgotPasswordSchema,
  mapAuthError,
  zodFieldErrors,
  type FieldErrors,
} from "@/lib/auth-errors";

export const Route = createFileRoute("/forgot-password")({
  head: () => {
    const url = `${appPublicUrl()}/forgot-password`;
    return {
      meta: [
        { title: "ลืมรหัสผ่าน · WP ALL" },
        {
          name: "description",
          content: "ขอลิงก์รีเซ็ตรหัสผ่านสำหรับบัญชี WP ALL ของคุณ",
        },
        { property: "og:title", content: "ลืมรหัสผ่าน · WP ALL" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: authResetPasswordRedirectUrl(),
    });
    setBusy(false);

    if (error) {
      const mapped = mapAuthError(error.message);
      setFormError(mapped.formError);
      if (mapped.fieldErrors) setFieldErrors(mapped.fieldErrors);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthCardShell title="ตรวจสอบอีเมล" subtitle="ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <p className="text-sm text-muted-foreground">
            เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่{" "}
            <span className="font-medium text-foreground">{email}</span> แล้ว
            กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์สแปม)
          </p>
          <Link to="/login" className="text-sm text-primary font-semibold hover:underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell title="ลืมรหัสผ่าน" subtitle="กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน">
      <AuthFormAlert message={formError} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthTextField
          id="email"
          label="อีเมล"
          type="email"
          value={email}
          autoComplete="email"
          required
          error={fieldErrors.email}
          onChange={(v) => {
            setEmail(v);
            setFieldErrors((prev) => {
              if (!prev.email) return prev;
              const next = { ...prev };
              delete next.email;
              return next;
            });
            setFormError("");
          }}
        />

        <AuthSubmitButton label="ส่งลิงก์รีเซ็ตรหัสผ่าน" loadingLabel="กำลังส่ง..." busy={busy} />
      </form>

      <div className="mt-5 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary font-semibold hover:underline">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </AuthCardShell>
  );
}
