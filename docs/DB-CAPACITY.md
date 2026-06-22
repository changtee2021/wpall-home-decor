# wpall_shop database capacity

Schema: **`wpall_shop`** · Supabase Pro **8 GB** limit

## Migrations applied

| Migration                                           | Purpose        |
| --------------------------------------------------- | -------------- |
| `20260619120100_wpall_shop_performance_indexes.sql` | Query indexes  |
| `20260619120000_wpall_shop_security_hardening.sql`  | RLS + triggers |

## Indexes

- `orders(user_id, created_at DESC)`, `orders(status)`
- `notifications(user_id, is_read, created_at DESC)`
- `cart_items(cart_id)`, `reviews(product_id)`, `topup_requests(user_id, status)`
- `favorites(user_id)`, `user_coupons(user_id)`, `addresses(user_id, is_default)`

## Housekeeping

- `wpall_shop.prune_old_notifications(90)` — service_role cron only; deletes read notifications older than 90 days
- Monitor growth via [wpgroup-portal `/infrastructure`](https://wpgroup-portal.vercel.app/infrastructure)
- Alert `db-usage-80` at 80% (see [`COST-MONITORING.md`](../../wpgroup-portal/docs/COST-MONITORING.md))

## Connection

Server apps: use **Session pooler** `DATABASE_URL` (not direct IPv6 `db.*` on Windows).

## Backup

Included in [`BACKUP-GDRIVE.md`](../../wp-group-erp/docs/BACKUP-GDRIVE.md) folder `wpallin1-salepage/`. Verify weekly via portal `/support/backups`.
