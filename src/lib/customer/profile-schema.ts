import { z } from "zod";

export const profileFormSchema = z.object({
  full_name: z.string().trim().min(1, "กรุณากรอกชื่อ").max(100),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[\d+\-\s()]*$/, "รูปแบบเบอร์โทรไม่ถูกต้อง")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
