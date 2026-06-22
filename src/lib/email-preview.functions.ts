import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendEmail } from "@/lib/email.server";
import { getAllEmailPreviews, getEmailPreviewById } from "@/lib/email/all-templates";
import type { Database } from "@/integrations/supabase/types";

async function requireAdmin(
  supabase: SupabaseClient<Database, "wpall_home_decor">,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export const listEmailPreviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return getAllEmailPreviews().map(({ id, group, groupLabel, label, subject }) => ({
      id,
      group,
      groupLabel,
      label,
      subject,
    }));
  });

export const getEmailPreviewHtml = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const entry = getEmailPreviewById(data.id);
    if (!entry) throw new Error("Template not found");
    return { id: entry.id, html: entry.html, subject: entry.subject, label: entry.label };
  });

export const sendTestEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        to: z.string().email().max(200),
        templateIds: z.array(z.string()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    const all = getAllEmailPreviews();
    const targets = data.templateIds?.length
      ? all.filter((e) => data.templateIds!.includes(e.id))
      : all;

    if (targets.length === 0) throw new Error("No templates selected");

    const results: { id: string; ok: boolean }[] = [];
    for (const entry of targets) {
      const ok = await sendEmail({
        to: data.to,
        subject: `[TEST] ${entry.subject}`,
        html: entry.html,
      });
      results.push({ id: entry.id, ok });
      if (targets.length > 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).map((r) => r.id);

    return { sent, total: targets.length, failed };
  });

export const loadAllEmailPreviewHtml = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return getAllEmailPreviews();
  });
