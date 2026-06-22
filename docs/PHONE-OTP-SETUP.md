# Phone OTP Login — WP ALL Salepage

ลูกค้าเข้าระบบด้วย **เบอร์มือถือ + OTP** ผ่าน Supabase Auth Phone provider

## แนะนำสถาปัตยกรรม

| หัวข้อ        | คำแนะนำ                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Provider**  | Supabase Auth → Phone (SMS OTP) — ไม่ต้องเขียน backend SMS เอง                                 |
| **SMS ในไทย** | ใช้ **Twilio** หรือ **MessageBird** ใน Supabase Dashboard → Authentication → Providers → Phone |
| **Identity**  | `auth.users.phone` เป็น primary login; อีเมล optional สำหรับ admin                             |
| **Profile**   | Trigger `wpall_shop.handle_new_user` sync `phone` → `profiles.phone`                           |
| **UI**        | `/login-phone` — 2 ขั้น: กรอกเบอร์ → ใส่ OTP 6 หลัก                                            |
| **Normalize** | `0812345678` → `+66812345678` (E.164) ใน `src/lib/auth-phone.ts`                               |

## โครงสร้างใน repo (พร้อม — ยังไม่ต่อ SMS จริง)

| ส่วน              | path                                                 |
| ----------------- | ---------------------------------------------------- |
| หน้า login OTP    | `/login-phone`                                       |
| Auth client       | `src/lib/auth-phone.ts`                              |
| Send SMS Hook     | `POST /api/auth/send-sms-hook`                       |
| Provider adapters | `src/lib/sms/providers/`                             |
| สถานะ             | `GET /api/public/sms-status`                         |
| คู่มือเชื่อมต่อ   | [SMS-PROVIDER-CONNECT.md](./SMS-PROVIDER-CONNECT.md) |

Default: `SMS_PROVIDER=stub` — OTP อยู่ใน server log เท่านั้น

---

## ตั้งค่า Supabase Dashboard

1. **Authentication → Providers → Phone** → Enable
2. เลือก SMS provider (Twilio แนะนำ):
   - Account SID, Auth Token
   - Messaging Service SID หรือ From number ที่รองรับส่งไทย
3. **Authentication → URL Configuration** — เพิ่ม redirect ของ production/preview:
   - `https://wpallin1-salepage.vercel.app/**`
   - `http://localhost:5173/**`
4. **Rate limits** — ตั้ง OTP ไม่เกิน ~3 ครั้ง/ชม./เบอร์ (ป้องกัน spam)

## ทดสอบ local

```bash
cd wpallin1-salepage
npm run dev
# เปิด /login-phone
```

ถ้ายังไม่ตั้ง SMS provider จะเห็นข้อความ "ระบบ SMS ยังไม่พร้อม"

## ความปลอดภัย

- OTP หมดอายุตาม Supabase default (~60 วินาที)
- อย่า expose `SUPABASE_SERVICE_ROLE_KEY` ฝั่ง client
- เก็บเบอร์ใน `profiles.phone` หลัง verify สำเร็จ

## ลูกค้า vs แอดมิน

- ลูกค้า: ใช้ `/login-phone` เป็นหลัก
- แอดมิน: ยังใช้ email/password หรือ Google ได้ (`/login`)

## อ้างอิง

- [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login)
- `src/lib/auth-phone.ts`, `src/routes/login-phone.tsx`
