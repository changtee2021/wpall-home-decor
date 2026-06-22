import { supabase } from "@/integrations/supabase/client";
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/auth-email-verification";
import { normalizeAuthEmail } from "@/lib/auth-errors";

async function requestAutoConfirm(params: {
  userId?: string;
  email?: string;
}): Promise<{ error: string | null }> {
  if (REQUIRE_EMAIL_VERIFICATION) return { error: null };

  try {
    const res = await fetch("/api/public/auth-confirm-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: params.userId,
        email: params.email ? normalizeAuthEmail(params.email) : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      return { error: data.error ?? "ไม่สามารถเปิดใช้งานบัญชีได้" };
    }
    return { error: null };
  } catch {
    return { error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export async function confirmAndSignIn(params: {
  email: string;
  password: string;
  userId?: string;
}): Promise<{ error: string | null }> {
  if (REQUIRE_EMAIL_VERIFICATION) {
    return { error: null };
  }

  const email = normalizeAuthEmail(params.email);
  const confirm = await requestAutoConfirm({ userId: params.userId, email });
  if (confirm.error) return confirm;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: params.password,
  });

  return { error: error?.message ?? null };
}

export function isUnverifiedAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("email not confirmed") || lower.includes("email_not_confirmed");
}

export function shouldRetryLoginWithConfirm(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isUnverifiedAuthError(message) ||
    lower.includes("invalid login") ||
    lower.includes("invalid credentials")
  );
}
