# Mobile API v1 — wpallin1-salepage

REST layer for future iOS/Android apps. Business logic stays in Supabase RLS + existing server functions where possible.

Base URL: `https://wpallin1-salepage.vercel.app/api/mobile/v1`

## Authentication

All protected routes:

```
Authorization: Bearer <supabase_access_token>
```

Obtain token via Supabase Auth (email, phone OTP, or Google) in the mobile app.

## Endpoints

| Method | Path                  | Auth | Description                                                 |
| ------ | --------------------- | ---- | ----------------------------------------------------------- |
| GET    | `/health`             | No   | API health                                                  |
| GET    | `/me`                 | Yes  | Profile + auth user                                         |
| PATCH  | `/me`                 | Yes  | Update profile (full_name, phone, address)                  |
| GET    | `/cart`               | Yes  | Current user cart                                           |
| POST   | `/cart`               | Yes  | Add cart item (JSON body)                                   |
| PATCH  | `/cart`               | Yes  | Update item qty/price                                       |
| DELETE | `/cart?itemId=<uuid>` | Yes  | Remove cart item                                            |
| GET    | `/orders`             | Yes  | List user orders                                            |
| POST   | `/orders`             | Yes  | Create order (same schema as web checkout)                  |
| POST   | `/checkout`           | Yes  | `{ action: "pay_wallet" \| "c2c2p" \| "submit_slip", ... }` |
| POST   | `/wallet/topup`       | Yes  | Submit wallet topup request                                 |
| POST   | `/claims`             | Yes  | Create product claim                                        |

### Checkout actions

**Wallet pay:**

```json
{ "action": "pay_wallet", "orderId": "uuid" }
```

**2C2P session:**

```json
{ "action": "c2c2p", "orderId": "uuid", "method": "c2c2p_card" }
```

**Bank slip:**

```json
{ "action": "submit_slip", "orderId": "uuid", "slipPath": "user-id/slip.jpg" }
```

Upload slip to Supabase Storage `payment-slips` bucket from the app first.

## Direct Supabase (no REST)

Mobile app should call Supabase client directly for:

- `addresses`, `favorites`, `notifications` (read/update)
- `orders` (read detail)
- Realtime subscriptions

Schema: `wpall_shop` · project `erpzxusskbtdxvqadwxv`

## CORS

Set `MOBILE_CORS_ORIGINS` on Vercel (comma-separated). Expo dev (`exp://`) allowed by default.

## Rate limits

| Route           | Limit      |
| --------------- | ---------- |
| `/me` GET       | 120/min/IP |
| `/me` PATCH     | 30/min/IP  |
| `/cart/*`       | 60/min/IP  |
| `/orders` POST  | 20/min/IP  |
| `/checkout`     | 20/min/IP  |
| `/wallet/topup` | 20/min/IP  |
| `/claims`       | 20/min/IP  |

Uses Upstash when `UPSTASH_REDIS_REST_*` configured.

## Device tokens

Register push tokens in `wpall_shop.device_tokens` (migration `20260619120200`).

## Auth redirect URLs

Add to Supabase Auth (see `wp-group-erp/docs/SUPABASE-AUTH-VERCEL-URLS.md`):

```
wpall://auth/callback
exp://127.0.0.1:8081/--/auth/callback
```

## Expo app

See [`../wpall-mobile/README.md`](../../wpall-mobile/README.md) for the native app shell (Sprint 5).

OpenAPI stub: [`MOBILE-API.openapi.yaml`](./MOBILE-API.openapi.yaml)
