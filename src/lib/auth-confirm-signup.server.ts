import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/auth-email-verification";
import { checkRateLimit } from "@/lib/rate-limit.server";

async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);

    const found = data.users.find((u) => u.email?.trim().toLowerCase() === normalized);
    if (found) return found.id;

    if (data.users.length < 1000) return null;
    page += 1;
  }
}

/** Confirm auth email via service role so password login works without inbox click. */
export async function autoConfirmSignupUser(opts: {
  userId?: string;
  email?: string;
  rateLimitKey: string;
}): Promise<{ ok: true }> {
  if (REQUIRE_EMAIL_VERIFICATION) {
    throw new Error("Email verification is required");
  }

  const rl = await checkRateLimit({
    key: opts.rateLimitKey,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    throw new Error("Too many signup attempts");
  }

  const userId = opts.userId ?? (opts.email ? await findUserIdByEmail(opts.email) : null);
  if (!userId) throw new Error("User not found");

  const { data: userData, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getErr || !userData.user) throw new Error("User not found");

  if (userData.user.email_confirmed_at) {
    return { ok: true };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw new Error(error.message);

  return { ok: true };
}
