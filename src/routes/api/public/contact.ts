import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getEmailTo, sendEmail, sendEmailSafe, escapeHtml } from "@/lib/email.server";
import { buildContactAutoReplyEmail } from "@/lib/email/templates/contact";
import { COMPANY_EMAIL } from "@/lib/company";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit.server";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional(),
  message: z.string().min(1).max(4000),
});

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

export const Route = createFileRoute("/api/public/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          const rl = await checkRateLimit({
            key: `contact:${ip}`,
            limit: RATE_LIMIT,
            windowMs: WINDOW_MS,
          });
          if (!rl.allowed) {
            return Response.json(
              { ok: false, error: "ส่งบ่อยเกินไป กรุณารอสักครู่" },
              { status: 429 },
            );
          }

          const body = await request.json().catch(() => null);
          const parsed = schema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
          }

          const { name, email, phone, message } = parsed.data;
          const html = `
            <h2>ข้อความจากหน้าติดต่อ WP ALL</h2>
            <p><strong>ชื่อ:</strong> ${escapeHtml(name)}</p>
            <p><strong>อีเมล:</strong> ${escapeHtml(email)}</p>
            ${phone ? `<p><strong>โทร:</strong> ${escapeHtml(phone)}</p>` : ""}
            <p><strong>ข้อความ:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          `;

          const sent = await sendEmail({
            to: getEmailTo(),
            subject: `[WP ALL] ติดต่อจาก ${name}`,
            html,
            replyTo: email,
          });

          if (!sent) {
            return Response.json(
              {
                ok: false,
                error: `ไม่สามารถส่งข้อความได้ในขณะนี้ กรุณาอีเมลที่ ${COMPANY_EMAIL}`,
              },
              { status: 503 },
            );
          }

          sendEmailSafe({
            to: email,
            subject: "[WP ALL] ได้รับข้อความของคุณแล้ว",
            html: buildContactAutoReplyEmail(name),
          });

          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false, error: "เกิดข้อผิดพลาด" }, { status: 500 });
        }
      },
    },
  },
});
