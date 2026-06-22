# Admin & wp-backoffice

## In-app lean admin (`/admin/*`)

Daily order intake: dashboard, orders, payment slips, products list, customers.

## Full admin (wp-backoffice `/shop/*`)

Set on wp-backoffice deployment:

```env
VITE_SUPABASE_SCHEMA_SHOP=wpall_home_decor
VITE_SALEPAGE_URL=https://wpall-home-decor.vercel.app
```

Apply migration `20260622150000_wpall_home_decor_backoffice_admin_access.sql` on ERP Supabase before go-live.

In-app sidebar links to backoffice for full catalog/CMS operations.
