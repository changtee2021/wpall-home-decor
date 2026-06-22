# wpallin1-salepage — Go-live checklist

Production: **https://wpallin1-salepage.vercel.app**  
Supabase schema: **`wpall_shop`** · project **`erpzxusskbtdxvqadwxv`**

---

## Done (automated / deployed)

| Item                                                             | Status                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Production deploy                                                | https://wpallin1-salepage.vercel.app                         |
| Health                                                           | `GET /api/public/health` → `{ ok: true }`                    |
| DB: `orders.payment_fee`, `base_total`, gateway cols             | Applied                                                      |
| DB: `site_settings.value` + `payment_info` / `payment_fee_rates` | Applied                                                      |
| DB: `product_claims` + claim storage                             | Applied                                                      |
| DB: `site_settings.main.email` = `info@wpallin1.com`             | Applied                                                      |
| Transactional emails (18 templates)                              | Code + `/admin/email-preview`                                |
| Email send via Resend API                                        | `RESEND_API_KEY` on Vercel (direct API, no Lovable required) |
| Responsive storefront + admin mobile nav                         | Shipped                                                      |
| Google OAuth code path                                           | `/auth/callback`                                             |

---

## Manual — Supabase Dashboard (one-time)

### URL configuration

[Authentication → URL Configuration](https://supabase.com/dashboard/project/erpzxusskbtdxvqadwxv/auth/url-configuration)

Add redirect URLs:

```
https://wpallin1-salepage.vercel.app/**
https://wpallin1-salepage.vercel.app/auth/callback
https://wpallin1-salepage.vercel.app/verify-email
https://wpallin1-salepage.vercel.app/reset-password
http://localhost:5173/**
http://localhost:5173/auth/callback
http://localhost:5173/verify-email
http://localhost:5173/reset-password
```

### Email templates + SMTP

[Authentication → Email Templates](https://supabase.com/dashboard/project/erpzxusskbtdxvqadwxv/auth/templates)

1. Enable **Custom SMTP** (Resend) — see [`wpgroup-portal/docs/EMAIL-SETUP.md`](../../wpgroup-portal/docs/EMAIL-SETUP.md)
2. Paste HTML from [`docs/supabase/email-templates/`](./supabase/email-templates/)

### Google OAuth (optional)

See [`docs/GOOGLE-AUTH-SETUP.md`](./GOOGLE-AUTH-SETUP.md)

---

## Manual — Vercel env (verify)

Required for transactional email:

| Variable              | Example                                |
| --------------------- | -------------------------------------- |
| `RESEND_API_KEY`      | From Resend dashboard                  |
| `EMAIL_FROM`          | `WP ALL <info@wpallin1.com>`           |
| `EMAIL_TO`            | `info@wpallin1.com`                    |
| `VITE_APP_PUBLIC_URL` | `https://wpallin1-salepage.vercel.app` |

Optional: `LOVABLE_API_KEY` (fallback gateway), `C2C2P_*` for card payments.

---

## Smoke test (15 min)

1. **Email preview** — Admin → Email Preview → send all to your inbox
2. **Signup** — register → `/verify-email` → confirm link → login
3. **Contact** — `/contact` → admin + auto-reply
4. **Order** — place order → quotation email
5. **Wallet topup** — submit slip → approval emails
6. **Mobile** — orders list + admin tables on phone width

---

## Docs index

| Doc                                                                        | Topic                        |
| -------------------------------------------------------------------------- | ---------------------------- |
| [RESPONSIVE-DESIGN.md](./RESPONSIVE-DESIGN.md)                             | Breakpoints, mobile patterns |
| [GOOGLE-AUTH-SETUP.md](./GOOGLE-AUTH-SETUP.md)                             | Google sign-in               |
| [supabase/email-templates/README.md](./supabase/email-templates/README.md) | Auth email HTML              |
| [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)                                     | Deploy commands              |
| [PRODUCT-CLAIMS.md](./PRODUCT-CLAIMS.md)                                   | Warranty claims              |

---

## Support contact

**info@wpallin1.com** · WP Trading Intergroup Co., Ltd.
