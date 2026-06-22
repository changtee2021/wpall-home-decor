import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { autoConfirmSignupUser } from "@/lib/auth-confirm-signup.server";
import { getClientIp } from "@/lib/rate-limit.server";

const bodySchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "userId or email required",
  });

export const Route = createFileRoute("/api/public/auth-confirm-signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json({ ok: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
          }

          const ip = getClientIp(request);
          await autoConfirmSignupUser({
            userId: parsed.data.userId,
            email: parsed.data.email,
            rateLimitKey: `signup-confirm:${ip}`,
          });

          return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
        } catch (err) {
          const message = err instanceof Error ? err.message : "confirm failed";
          const status =
            message === "Too many signup attempts" ? 429 : message === "User not found" ? 404 : 500;
          const thai =
            message === "Too many signup attempts"
              ? "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่"
              : message === "User not found"
                ? "ไม่พบบัญชีนี้"
                : "ระบบเปิดใช้งานบัญชีไม่สำเร็จชั่วคราว กรุณาลองใหม่";
          return Response.json({ ok: false, error: thai }, { status });
        }
      },
    },
  },
});
