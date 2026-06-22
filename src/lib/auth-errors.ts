import { z } from "zod";
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/auth-email-verification";

export const REMEMBER_EMAIL_KEY = "wpall_remember_email";

/** Lowercase + trim so sign-up and login use the same Supabase email key. */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "อีเมลไม่ถูกต้อง" })
    .max(255)
    .transform(normalizeAuthEmail),
  password: z.string().min(1, { message: "กรุณากรอกรหัสผ่าน" }).max(72),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, { message: "กรุณากรอกชื่อ-นามสกุล" }).max(100),
    email: z
      .string()
      .trim()
      .email({ message: "อีเมลไม่ถูกต้อง" })
      .max(255)
      .transform(normalizeAuthEmail),
    password: z.string().min(6, { message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" }).max(72),
    confirmPassword: z.string().min(1, { message: "กรุณายืนยันรหัสผ่าน" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "อีเมลไม่ถูกต้อง" })
    .max(255)
    .transform(normalizeAuthEmail),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" }).max(72),
    confirmPassword: z.string().min(1, { message: "กรุณายืนยันรหัสผ่าน" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) {
      out[key] = issue.message;
    }
  }
  return out;
}

export function mapAuthError(message: string): {
  formError: string;
  fieldErrors?: FieldErrors;
  hint?: "unverified";
} {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return {
      formError: REQUIRE_EMAIL_VERIFICATION
        ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง — หากเพิ่งสมัคร กรุณายืนยันอีเมลก่อน"
        : "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      fieldErrors: {
        email: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        password: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      },
      hint: REQUIRE_EMAIL_VERIFICATION ? "unverified" : undefined,
    };
  }

  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return {
      formError: "อีเมลนี้ถูกใช้งานแล้ว",
      fieldErrors: { email: "อีเมลนี้ถูกใช้งานแล้ว" },
    };
  }

  if (lower.includes("password") && lower.includes("weak")) {
    return {
      formError: "รหัสผ่านไม่ปลอดภัยเพียงพอ กรุณาใช้รหัสที่ยาวขึ้น",
      fieldErrors: { password: "รหัสผ่านไม่ปลอดภัยเพียงพอ" },
    };
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return { formError: "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  if (lower.includes("missing supabase") || lower.includes("service_role")) {
    return {
      formError: "ระบบยืนยันบัญชีขัดข้องชั่วคราว กรุณาลองใหม่หรือติดต่อทีมงาน",
    };
  }

  if (
    lower.includes("oauth") ||
    lower.includes("provider") ||
    lower.includes("google") ||
    lower.includes("popup closed")
  ) {
    return { formError: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่" };
  }

  if (lower.includes("email not confirmed")) {
    return {
      formError: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ",
      fieldErrors: { email: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" },
    };
  }

  if (
    lower.includes("invalid email") ||
    lower.includes("validate email") ||
    lower.includes("unable to validate email")
  ) {
    return {
      formError: "รูปแบบอีเมลไม่ถูกต้อง",
      fieldErrors: { email: "รูปแบบอีเมลไม่ถูกต้อง" },
    };
  }

  if (
    lower.includes("link is invalid") ||
    lower.includes("link has expired") ||
    lower.includes("otp_expired") ||
    lower.includes("token has expired") ||
    lower.includes("expired")
  ) {
    return { formError: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  }

  if (lower.includes("session missing") || lower.includes("auth session")) {
    return { formError: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  if (lower.includes("refresh token") || lower.includes("jwt")) {
    return { formError: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch")
  ) {
    return { formError: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" };
  }

  if (lower.includes("confirmation email") || lower.includes("sending email")) {
    return { formError: "ส่งอีเมลไม่สำเร็จชั่วคราว กรุณาลองใหม่ภายหลัง" };
  }

  if (lower.includes("signups not allowed") || lower.includes("signup is disabled")) {
    return { formError: "ระบบสมัครสมาชิกปิดชั่วคราว กรุณาติดต่อทีมงาน" };
  }

  if (lower.includes("user not found")) {
    return {
      formError: "ไม่พบบัญชีนี้ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่",
      fieldErrors: { email: "ไม่พบบัญชีนี้" },
    };
  }

  if (lower.includes("security purposes") || lower.includes("once every")) {
    return { formError: "รอสักครู่ก่อนขออีเมลซ้ำ (จำกัดความถี่เพื่อความปลอดภัย)" };
  }

  if (lower.includes("same password") || lower.includes("different from the old")) {
    return {
      formError: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม",
      fieldErrors: { password: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม" },
    };
  }

  if (lower.includes("signup attempts") || lower.includes("email rate limit")) {
    return { formError: "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  return {
    formError: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หรือติดต่อทีมงานหากปัญหายังคงอยู่",
  };
}

export function loadRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveRememberedEmail(email: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  } catch {
    // ignore storage errors
  }
}
