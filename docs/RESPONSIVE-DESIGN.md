# Responsive Design — wpallin1-salepage

Standard for mobile, tablet, and desktop layouts. All new UI/UX work must follow this guide.

มาตรฐาน responsive สำหรับมือถือ แทปเลต และเดสก์ท็อป — งาน UI/UX ใหม่ต้องอ้างอิงเอกสารนี้

---

## Breakpoints (Tailwind v4, mobile-first)

| Prefix      | Min width | Typical device             | Usage in this app                                           |
| ----------- | --------- | -------------------------- | ----------------------------------------------------------- |
| _(default)_ | 0         | Phone portrait (375px)     | Base styles; bottom tab bar; single-column filters          |
| `sm`        | 640px     | Large phone / small tablet | Wider padding; show search text; inline filter rows         |
| `md`        | 768px     | Tablet portrait            | Customer order **table**; header CTA "ออกแบบม่าน"           |
| `lg`        | 1024px    | Tablet landscape / laptop  | Hide bottom tab; show **AppSidebar**; desktop header labels |
| `xl`        | 1280px    | Desktop                    | Hotspot builder 2-column grid; wider product grids          |

**Rule:** Write styles for mobile first, then add `sm:`, `md:`, `lg:` overrides. Never assume desktop-only.

---

## Layout tokens

```tsx
// Page container (storefront / account)
className = "max-w-screen-2xl mx-auto px-4 sm:px-6";

// Storefront main — clearance for bottom tab bar
className = "flex-1 pb-24 lg:pb-8";

// Admin main content area
className = "flex-1 px-4 sm:px-6 pb-8 min-w-0";
```

- Admin sidebar: `hidden lg:flex w-64` — below `lg`, use **AdminMobileNav** (hamburger in SiteHeader).
- **Account sidebar:** `hidden lg:flex w-64` — below `lg`, hub grid + back links on sub-pages.
- Bottom tab bar: `lg:hidden` — tabs for Home, Products, Customize, Cart, Account.

---

## Reusable patterns

### Product / customize grids

```tsx
className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4";
```

### Filter / toolbar bars

```tsx
className = "flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between";
```

### Admin data tables

Use horizontal scroll — admin users accept swipe on phone/tablet:

```tsx
<div className="bg-card border border-border rounded-2xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[640px]">{/* ... */}</table>
  </div>
</div>
```

### Customer-facing tables (orders, etc.)

Prefer **card list on mobile** + table on `md+`:

```tsx
{
  /* Mobile cards */
}
<div className="md:hidden space-y-3">{/* card per row */}</div>;

{
  /* Desktop table */
}
<div className="hidden md:block bg-card border ...">
  <table>...</table>
</div>;
```

### Touch targets

- Buttons and tappable links: at least `h-11` or `min-h-[44px]`.
- Icon-only controls: `size-10` minimum.

### Auth pages

```tsx
className = "min-h-screen flex items-center justify-center px-4 py-8";
className = "w-full max-w-md ... p-6 sm:p-8";
```

### Sticky mobile CTA (product detail)

Order panel uses a fixed bottom bar on `< lg` — do not add extra fixed elements that overlap it.

### Typography scaling

Avoid fixed pixel font sizes for hero numbers:

```tsx
// Good
className = "text-2xl sm:text-[32px] font-bold";
```

---

## Checklist before merging UI features

Test in browser DevTools at these widths:

| Width      | What to verify                                                                          |
| ---------- | --------------------------------------------------------------------------------------- |
| **375px**  | No unintended horizontal page scroll; bottom tab not covered; text truncates gracefully |
| **768px**  | Admin hamburger works; filters stack/unstack correctly                                  |
| **1280px** | Sidebar visible on admin; grids show intended column count                              |

- [ ] Mobile-first classes (base = smallest screen)
- [ ] Tables have fallback (scroll or cards)
- [ ] Admin routes usable below `lg` (AdminMobileNav)
- [ ] Touch targets ≥ 44px where tappable
- [ ] Images use `object-cover` / `aspect-*` — no layout shift
- [ ] Modals/sheets use `w-full max-w-*` not fixed pixel widths

---

## Page audit (2026-06)

| Route / area          | Mobile | Tablet | Notes                                                                                   |
| --------------------- | ------ | ------ | --------------------------------------------------------------------------------------- |
| `/` home              | OK     | OK     | Product grids 2→4 cols                                                                  |
| `/products`           | OK     | OK     | Category rail scrolls                                                                   |
| `/customize`          | OK     | OK     | Hero + kind chips wrap                                                                  |
| `/products/$slug`     | OK     | OK     | Sticky mobile CTA; hotspot popovers                                                     |
| `/compare`            | OK     | OK     | Compare bar above bottom tab (`pb-36`); matrix table scrolls `lg+`; mobile product tabs |
| `/cart`, `/checkout`  | OK     | OK     | Single column forms                                                                     |
| `/orders`             | OK     | OK     | Status tabs; card list `< md`, table `md+`; sidebar `lg+`                               |
| `/orders/$id`         | OK     | OK     | Order detail + timeline; sidebar `lg+`                                                  |
| `/quotation/$id`      | OK     | OK     | Line items table scrolls horizontally                                                   |
| Auth (`/login`, etc.) | OK     | OK     | `max-w-md` centered card                                                                |
| `/admin/*`            | OK     | OK     | AdminMobileNav `< lg`; tables scroll                                                    |
| `/account/*`          | OK     | OK     | Account sidebar `lg+`; hub 2-col on PC; touch targets 44px                              |
| Hotspot builder       | OK     | OK     | Stacks until `xl`                                                                       |

---

## Future improvements (not in scope yet)

- Shared `AdminPageShell` layout component (reduce duplicated sidebar/header in 20+ admin routes)
- Card layout for all admin tables (optional; scroll is sufficient for internal tools)
- Dedicated mobile search sheet on `max-sm` if header still feels crowded

---

## Manual verification log

After responsive changes, confirm:

1. `npm run lint` && `npm run build` pass
2. DevTools: 375px — `/`, `/customize`, `/orders`, `/admin/customize`
3. DevTools: 768px — admin hamburger, hotspot builder stacked
4. DevTools: 1280px — admin sidebar + full layout

---

## Related files

- [`src/components/layout/account-sidebar.tsx`](../src/components/layout/account-sidebar.tsx)
- [`src/components/layout/account-layout.tsx`](../src/components/layout/account-layout.tsx)
- [`src/lib/customer/account-nav.ts`](../src/lib/customer/account-nav.ts)
- [`src/lib/admin-nav.ts`](../src/lib/admin-nav.ts)
- [`src/components/storefront/bottom-tab-bar.tsx`](../src/components/storefront/bottom-tab-bar.tsx)
- [`.cursor/rules/responsive-wpall.mdc`](../.cursor/rules/responsive-wpall.mdc)
