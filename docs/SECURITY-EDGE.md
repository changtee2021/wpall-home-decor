# Security edge — wpallin1-salepage

Full-stack firewall checklist for production.

## 1. Vercel Firewall (WAF)

1. Vercel Dashboard → **wpallin1-salepage** → Settings → **Firewall**
2. Enable **Attack Challenge Mode** for `/api/public/contact` POST abuse (start in log mode)
3. Block known bad bots; optional geo rules if needed
4. Monitor via [wpgroup-portal](https://wpgroup-portal.vercel.app) IT Support alerts

## 2. Cloudflare (optional DNS proxy)

If `wpallin1.com` uses Cloudflare:

- Enable **Managed WAF** + **Bot Fight Mode**
- Rate limit rule: `/api/*` — 100 req/min per IP
- SSL: Full (strict)
- Do not cache `/api/*` or authenticated routes

DNS cutover: lower TTL to 300s before switching.

## 3. Application layer (this repo)

| Control            | Location                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Security headers   | [`vercel.json`](../vercel.json)                                                                                                         |
| Rate limiting      | [`src/lib/rate-limit.server.ts`](../src/lib/rate-limit.server.ts) — set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Vercel |
| Order status guard | ERP migration `20260619120000_wpall_shop_security_hardening.sql`                                                                        |
| Webhook HMAC/JWT   | `c2c2p-webhook.ts`, `send-sms-hook.ts`                                                                                                  |

## 4. Supabase

- **Postgres network restrictions:** see [`wp-group-erp/docs/SUPABASE-NETWORK-RESTRICTIONS.md`](../../wp-group-erp/docs/SUPABASE-NETWORK-RESTRICTIONS.md)
- Keep **Auth + REST API** open for web/mobile clients
- Restrict **direct Postgres** to Vercel egress + office + GitHub Actions backup

## 5. Service role rotation

Follow [`wp-group-erp/docs/MANUAL-STEPS.md`](../../wp-group-erp/docs/MANUAL-STEPS.md) §5 — update Vercel env on all apps after rotation.

## Smoke test after enabling WAF

1. `GET /api/public/health` → 200
2. Login + checkout flow
3. Contact form (not challenged for normal users)
4. Mobile Supabase auth (if testing app)
