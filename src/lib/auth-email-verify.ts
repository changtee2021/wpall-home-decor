import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authVerifyEmailRedirectUrl } from "@/lib/auth-redirect";

/** Soft nudge only — never blocks login or checkout. */
export function shouldShowEmailVerifyReminder(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  const provider = user.app_metadata?.provider as string | undefined;
  if (provider === "google") return false;
  return user.user_metadata?.pending_email_verify === true;
}

export async function resendEmailVerification(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: authVerifyEmailRedirectUrl() },
  });
  return { error: error?.message ?? null };
}

export async function clearEmailVerifyReminder(): Promise<void> {
  await supabase.auth.updateUser({ data: { pending_email_verify: false } });
}
