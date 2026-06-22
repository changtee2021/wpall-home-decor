# Authentication — wpall-home-decor

Email + password only (no Google OAuth or phone OTP in v1).

| Route | Purpose |
|-------|---------|
| `/login` | `signInWithPassword`, remember email, `?next=` redirect |
| `/signup` | `signUp` + email verification |
| `/verify-email` | Confirm email after signup |
| `/forgot-password` | Reset link via email |
| `/reset-password` | Set new password |

Post-login: admin → `/admin`, customer → `/account`.

Supabase redirect URLs: see `wp-group-erp/docs/SUPABASE-AUTH-VERCEL-URLS.md`.
