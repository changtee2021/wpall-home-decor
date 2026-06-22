import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { appPublicUrl } from "@/lib/app-public-url";
import {
  AuthCardShell,
  AuthFooterLink,
  AuthFormAlert,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
  RememberMeRow,
} from "@/components/auth/auth-form";
import {
  loadRememberedEmail,
  loginSchema,
  mapAuthError,
  saveRememberedEmail,
  zodFieldErrors,
  type FieldErrors,
} from "@/lib/auth-errors";
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/auth-email-verification";
import {
  resolvePostLoginPath,
  sanitizeReturnPath,
  completeClientSignIn,
} from "@/lib/auth-post-login";
import { confirmAndSignIn, shouldRetryLoginWithConfirm } from "@/lib/auth-signup";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: sanitizeReturnPath(typeof search.next === "string" ? search.next : null) ?? "",
    email: typeof search.email === "string" ? search.email.trim().toLowerCase() : "",
  }),
  head: () => {
    const url = `${appPublicUrl()}/login`;
    return {
      meta: [
        { title: "เข้าสู่ระบบ · WP ALL Home & Decor" },
        {
          name: "description",
          content:
            "เข้าสู่ระบบสมาชิก WP ALL เพื่อสั่งซื้อม่าน มู่ลี่ และของแต่งบ้าน พร้อมรับสิทธิ์ Tier และคูปองพิเศษ",
        },
        { property: "og:title", content: "เข้าสู่ระบบ · WP ALL" },
        {
          property: "og:description",
          content: "ลงชื่อเข้าใช้ WP ALL เพื่อใช้สิทธิ์สมาชิกและติดตามคำสั่งซื้อของคุณ",
        },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const { next, email: emailFromSearch } = Route.useSearch();
  const { user, role, loading, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const saved = loadRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    } else if (emailFromSearch) {
      setEmail(emailFromSearch);
    }
  }, [emailFromSearch]);

  useEffect(() => {
    if (!loading && user) {
      void router.history.replace(resolvePostLoginPath(role, next || null));
    }
  }, [user, role, loading, next, router]);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }

    setBusy(true);
    let { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error && !REQUIRE_EMAIL_VERIFICATION && shouldRetryLoginWithConfirm(error.message)) {
      const retry = await confirmAndSignIn({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (!retry.error) {
        error = null;
      } else if (
        !retry.error.toLowerCase().includes("invalid login") &&
        !retry.error.toLowerCase().includes("invalid credentials")
      ) {
        error = { ...error, message: retry.error };
      }
    }

    setBusy(false);

    if (error) {
      const mapped = mapAuthError(error.message);
      setFormError(mapped.formError);
      if (mapped.fieldErrors) setFieldErrors(mapped.fieldErrors);
      return;
    }

    saveRememberedEmail(parsed.data.email, rememberMe);

    const { data: sessionData } = await supabase.auth.getSession();
    const signedInUser = sessionData.session?.user;
    if (!signedInUser) {
      setFormError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    const path = await completeClientSignIn(signedInUser, next || null);
    await refresh();
    toast.success("ยินดีต้อนรับกลับมา");
    void router.history.replace(path);
  };

  return (
    <AuthCardShell title="เข้าสู่ระบบ" subtitle="WP ALL Home & Decor">
      <AuthFormAlert message={formError} />

      <form onSubmit={handleEmail} className="space-y-3">
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
          label="รหัสผ่าน"
          value={password}
          autoComplete="current-password"
          required
          error={fieldErrors.password}
          onChange={(v) => {
            setPassword(v);
            clearFieldError("password");
          }}
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <RememberMeRow checked={rememberMe} onCheckedChange={setRememberMe} />
          <Link
            to="/forgot-password"
            className="text-xs text-primary font-medium hover:underline shrink-0"
          >
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <AuthSubmitButton label="เข้าสู่ระบบ" loadingLabel="กำลังเข้าสู่ระบบ..." busy={busy} />
      </form>

      <AuthFooterLink>
        ยังไม่มีบัญชี?{" "}
        <Link to="/signup" search={{ next }} className="text-primary font-semibold hover:underline">
          สมัครสมาชิก
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
