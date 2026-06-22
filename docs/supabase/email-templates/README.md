# Supabase Auth email templates — WP ALL

Paste these HTML files into Supabase Dashboard for branded Thai confirmation emails.

วาง HTML ใน Supabase Dashboard เพื่อให้อีเมลยืนยันสวยและเป็นภาษาไทย

## Setup steps

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/erpzxusskbtdxvqadwxv/auth/templates)
2. **Authentication → Email Templates**
3. Enable **Custom SMTP** (Resend) per [`wpgroup-portal/docs/EMAIL-SETUP.md`](../../../wpgroup-portal/docs/EMAIL-SETUP.md)
4. Paste templates:
   - **Confirm signup** → [`confirm-signup.html`](./confirm-signup.html)
   - **Reset password** → [`reset-password.html`](./reset-password.html)
5. **Authentication → URL Configuration** — add redirect URLs:
   - `https://wpallin1-salepage.vercel.app/verify-email`
   - `https://wpallin1-salepage.vercel.app/reset-password`
   - `https://wpallin1-salepage.vercel.app/auth/callback`
   - `http://localhost:5173/verify-email` (local dev)
   - `http://localhost:5173/reset-password` (local dev)

## App routes

| Route             | Purpose                                   |
| ----------------- | ----------------------------------------- |
| `/verify-email`   | Post-signup waiting + email link callback |
| `/reset-password` | Password reset callback                   |

## User flow after signup

1. User signs up → redirected to `/verify-email?email=...`
2. User clicks link in email → lands on `/verify-email` with session → auto redirect to `/account`
3. User can login with email + password

If login fails with "invalid credentials" after signup, the account is almost always **not yet verified** — use **ส่งอีเมลยืนยันอีกครั้ง** on `/verify-email`.
