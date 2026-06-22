# Deploy wpallin1-salepage on Vercel

## Prerequisites

- Supabase ERP project `erpzxusskbtdxvqadwxv` with schema `wpall_shop`
- Node 20+

## Vercel project settings

1. Import GitHub repo `changtee2021/wpallin1-salepage`
2. Framework Preset: **Other**
3. Build Command: `npm run build`
4. Install Command: `npm install --legacy-peer-deps`
5. Output: Nitro/Vercel output from TanStack Start (see build logs)

## Environment variables

Copy from `.env.example`. Server secrets must **not** use `VITE_` prefix.

Set `VITE_SUPABASE_SCHEMA=wpall_shop` and `SUPABASE_SCHEMA=wpall_shop`.

For Vercel + TanStack Start, set Nitro preset if needed:

```bash
NITRO_PRESET=vercel
```

## Local verify

```bash
npm run build
npm run preview
```

Lovable Cloud deploy remains supported; Vercel is an optional secondary host.
