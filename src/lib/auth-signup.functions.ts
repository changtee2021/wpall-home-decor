import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { autoConfirmSignupUser } from "@/lib/auth-confirm-signup.server";
import { getRequest } from "@tanstack/react-start/server";
import { getClientIp } from "@/lib/rate-limit.server";

const autoConfirmInput = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().trim().email().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "userId or email required",
  });

/** @deprecated Prefer POST /api/public/auth-confirm-signup from the browser. */
export const autoConfirmSignup = createServerFn({ method: "POST" })
  .inputValidator(autoConfirmInput)
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = request ? getClientIp(request) : "unknown";
    return autoConfirmSignupUser({
      userId: data.userId,
      email: data.email,
      rateLimitKey: `signup-confirm:${ip}`,
    });
  });
