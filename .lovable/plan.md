# ปรับหน้ารายละเอียดสินค้า `/products/$id` ให้เต็มระบบ

ปัจจุบันหน้านี้ใช้ mock (`@/lib/mock/products`, `fabrics`) และ Configurator แบบเดิม จะรีไรท์ให้ดึงจาก Supabase จริง + วาง layout แบบ E-commerce 2 คอลัมน์ตามภาพเรฟ

## โครงสร้างไฟล์ที่แก้/สร้าง

- ✏️ `src/routes/_app.products.$id.tsx` — เปลี่ยน loader ให้ `useParams` หา product จาก Supabase ด้วย `id` หรือ `slug` (รองรับทั้งสอง) + ดึง hotspots, tier price, related products พร้อมกัน
- 🆕 `src/components/product/product-detail.tsx` — คอมโพเนนต์ใหม่ layout 2 คอลัมน์ (55/45)
- 🆕 `src/components/product/product-gallery.tsx` — ฝั่งซ้าย: ภาพหลัก + hotspot pins + thumbnail row
- 🆕 `src/components/product/order-panel.tsx` — ฝั่งขวา: header info + dual-mode toggle + dimensions + live price + CTA
- 🆕 `src/components/product/product-tabs.tsx` — ล่าง: 3 แท็บ (รายละเอียด / ข้อมูลจำเพาะ / จัดส่ง&ประกัน)
- 🆕 `src/components/product/related-products.tsx` — แถวสินค้าที่เกี่ยวข้อง (หมวดเดียวกัน 4-6 ชิ้น)
- 🆕 `src/lib/products.functions.ts` — server fn: `getProductDetail({ idOrSlug })` คืน `{ product, hotspots, tierPrice, related }` ใช้ `supabaseAdmin` (route public, อ่านเฉพาะ active)

## โซน 1 — Visual Showcase (ซ้าย 55%)

- ภาพหลัก aspect-square จาก `product.image_url` / `images[0]`
- Hotspot pins: query `product_hotspots` → render `<button>` absolute `style={{ left: x%, top: y% }}` กดแล้วเปิด popover เลือก option จาก `attribute_groups`/`attribute_options`
- Thumbnail row: ภาพจาก `product.images` (jsonb array) — scroll-x แนวนอน, กดเปลี่ยนภาพหลัก
- Badge มุมซ้ายบน: `product.badge` ถ้ามี

## โซน 2 — Order Panel (ขวา 45%)

แสดง sticky บน desktop:

- **Header**: category → name (h1) → SKU + stock badge (เขียว/แดงจาก `stock`) + tier badge ของลูกค้า (`profiles.tier`)
- **Dual mode toggle**: ใช้ `useAuth().role` — ถ้า admin/sales เห็นแถบ Sales Mode (combobox เลือกลูกค้า + input override %)
- **Dimensions**: width/height (cm), default 200×240
- **Dynamic attributes**: ถ้ามี `attribute_groups` ผูกกับสินค้า → render dropdown/swatch group
- **Live price box**:
  - สูตร: `(W × H / 10000) × salePrice + Σ upcharge × qty`
  - ถ้ามี tier price ผูกผ่าน `resolve_product_price` → ใช้ราคานั้นแทน base
  - แสดง: ราคา (ตัวใหญ่ส้ม), น้ำหนักรวม (kg), จำนวนกล่อง (จาก attributes meta)
- **CTAs**:
  - หลัก `เพิ่มลงตะกร้า` (สีส้ม) → `addToCart()` แล้ว navigate `/cart`
  - รอง `ออกใบเสนอราคา` (สี teal/secondary) → POST สร้าง quotation (ถ้ายังไม่มี endpoint ก็ stub ไว้ + toast "บันทึกใบเสนอราคา")

## โซน 3 — Tabs ด้านล่าง (full width)

ใช้ shadcn `Tabs`:

1. **รายละเอียดสินค้า** — `product.description` + bullet ฟีเจอร์จาก `attributes.features[]`
2. **ข้อมูลจำเพาะ** — ตาราง 2 คอลัมน์: SKU, น้ำหนัก/หน่วย, หน่วยนับ, จำนวนต่อกล่อง, ความหนาแน่นผ้า (จาก `attributes`)
3. **การจัดส่งและประกัน** — ข้อความ static + tier-specific terms

## โซน 4 — Related Products

Query `products` `WHERE category_id = current AND id != current AND is_active LIMIT 6` → `<ProductCardShopee>` grid

## Data flow

```
loader ─ getProductDetail({ idOrSlug })
        ├─ products (single)
        ├─ product_hotspots + attribute_groups + options
        ├─ product_tier_prices (filtered โดย user.tier ถ้า login)
        └─ related products
```

ใช้ `queryOptions` + `ensureQueryData` + `useSuspenseQuery` ตามแพทเทิร์น TanStack Query

## หมายเหตุ

- ทุกสีใช้ token จาก `src/styles.css` (primary = ส้ม, secondary = teal) ไม่ hardcode
- `errorComponent` + `notFoundComponent` ใช้แบบที่มีอยู่
- ไม่แตะ schema ฐานข้อมูล — ใช้ตารางและฟังก์ชันที่มีอยู่แล้วทั้งหมด
- mock `pricing.ts` ยังไม่ลบ (ของหน้า `_app.custom` ใช้อยู่)

ยืนยันแผนเพื่อ implement ได้เลยครับ
