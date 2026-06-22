import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { authVerifyEmailRedirectUrl } from "@/lib/auth-redirect";
import { completeClientSignIn, sanitizeReturnPath } from "@/lib/auth-post-login";
import { confirmAndSignIn } from "@/lib/auth-signup";
import { useAuth } from "@/hooks/use-auth";
import { appPublicUrl } from "@/lib/app-public-url";
import {
  AuthCardShell,
  AuthFooterLink,
  AuthFormAlert,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
} from "@/components/auth/auth-form";
import { mapAuthError, signupSchema, zodFieldErrors, type FieldErrors } from "@/lib/auth-errors";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: sanitizeReturnPath(typeof search.next === "string" ? search.next : null) ?? "",
  }),
  head: () => {
    const url = `${appPublicUrl()}/signup`;
    return {
      meta: [
        { title: "สมัครสมาชิก · WP ALL Home & Decor" },
        {
          name: "description",
          content:
            "สมัครสมาชิก WP ALL ฟรี รับสิทธิ์ Tier อัตโนมัติและส่วนลดทุกออเดอร์ม่าน มู่ลี่ และของแต่งบ้าน",
        },
        { property: "og:title", content: "สมัครสมาชิก · WP ALL" },
        {
          property: "og:description",
          content:
            "สมัครฟรีรับสิทธิ์สมาชิก Tier และคูปองส่วนลดสำหรับสั่งซื้อม่านและของแต่งบ้านที่ WP ALL",
        },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SignupPage,
});

function SignupPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const finishSignup = async (explicitNext?: string | null) => {
    const { data } = await supabase.auth.getSession();
    const signedInUser = data.session?.user;
    if (!signedInUser) {
      setFormError("สมัครสำเร็จแต่ยังเข้าระบบไม่ได้ กรุณาไปหน้าเข้าสู่ระบบ");
      navigate({ to: "/login", search: { email: email.trim().toLowerCase(), next: next || "" } });
      return;
    }
    const path = await completeClientSignIn(signedInUser, explicitNext);
    await refresh();
    void router.history.replace(path);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    const parsed = signupSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: authVerifyEmailRedirectUrl(),
        data: { full_name: parsed.data.fullName, pending_email_verify: true },
      },
    });
    setBusy(false);

    if (error) {
      const mapped = mapAuthError(error.message);
      setFormError(mapped.formError);
      if (mapped.fieldErrors) setFieldErrors(mapped.fieldErrors);
      return;
    }

    if (data.user?.identities?.length === 0) {
      const { error: signInError } = await confirmAndSignIn({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (!signInError) {
        toast.success("ยินดีต้อนรับกลับมา!");
        await finishSignup(next || null);
        return;
      }
      setFormError(
        "อีเมลนี้เคยสมัครแล้ว — กรุณาเข้าสู่ระบบด้วยรหัสผ่านเดิม หรือกดลืมรหัสผ่านหากจำไม่ได้",
      );
      navigate({ to: "/login", search: { email: parsed.data.email } });
      return;
    }

    if (data.session?.user) {
      toast.success("สมัครสำเร็จ! ยินดีต้อนรับ");
      await finishSignup(next || null);
      return;
    }

    if (data.user && !data.session) {
      const { error: signInError } = await confirmAndSignIn({
        email: parsed.data.email,
        password: parsed.data.password,
        userId: data.user.id,
      });
      if (!signInError) {
        toast.success("สมัครสำเร็จ! ยินดีต้อนรับ");
        await finishSignup(next || null);
        return;
      }
      setFormError(
        signInError.includes("ลองบ่อย")
          ? signInError
          : "สมัครสำเร็จแล้ว แต่เข้าระบบอัตโนมัติไม่ได้ — ลองเข้าสู่ระบบด้วยอีเมลและรหัสผ่านเดิม หรือยืนยันอีเมลจากกล่องจดหมาย",
      );
      navigate({
        to: "/verify-email",
        search: { email: parsed.data.email },
        replace: true,
      });
      return;
    }

    setFormError("ไม่สามารถสมัครได้ กรุณาลองใหม่อีกครั้ง");
  };

  return (
    <AuthCardShell title="สมัครสมาชิก" subtitle="WP ALL Home & Decor — รับสิทธิ์ Tier อัตโนมัติ">
      <AuthFormAlert message={formError} />

      <form onSubmit={handleEmail} className="space-y-3">
        <AuthTextField
          id="fullName"
          label="ชื่อ-นามสกุล"
          type="text"
          value={fullName}
          autoComplete="name"
          required
          error={fieldErrors.fullName}
          onChange={(v) => {
            setFullName(v);
            clearFieldError("fullName");
          }}
        />
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
            clearFieldError("email");
          }}
        />
        <AuthPasswordField
          id="password"
          label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
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
          label="ยืนยันรหัสผ่าน"
          value={confirmPassword}
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            clearFieldError("confirmPassword");
          }}
        />

        <AuthSubmitButton label="สมัครสมาชิก" loadingLabel="กำลังสมัคร..." busy={busy} />
      </form>

      <AuthFooterLink>
        มีบัญชีแล้ว?{" "}
        <Link to="/login" search={{ next }} className="text-primary font-semibold hover:underline">
          เข้าสู่ระบบ
        </Link>
      </AuthFooterLink>
      <div className="mt-2 text-center">
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          ← กลับหน้าหลัก
        </Link>
      </div>
    </AuthCardShell>
  );
}
