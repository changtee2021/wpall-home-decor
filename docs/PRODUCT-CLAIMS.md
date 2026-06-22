# Product Claims — WP ALL Salepage

ระบบเคลมสินค้าสำหรับลูกค้า + แอดมินใน **wpallin1-salepage** (schema `wpall_shop`)

## ลูกค้า (salepage)

| Route                 | หน้าที่                 |
| --------------------- | ----------------------- |
| `/login-phone`        | เข้าระบบด้วยเบอร์ + OTP |
| `/account/claims`     | รายการเคลมของฉัน        |
| `/account/claims/new` | แจ้งเคลมใหม่ + แนบรูป   |
| `/account/claims/$id` | ติดตามสถานะ + แชท       |

## แอดมิน

| Route               | หน้าที่                               |
| ------------------- | ------------------------------------- |
| `/admin/claims`     | รายการเคลมทั้งหมด (filter ตามสถานะ)   |
| `/admin/claims/$id` | อนุมัติ/ปฏิเสธ + หมายเหตุ + ตอบลูกค้า |

## Database

Migration: `20260616200000_product_claims_phone_auth.sql`

| ตาราง                       | 用途                 |
| --------------------------- | -------------------- |
| `wpall_shop.product_claims` | คำขอเคลม             |
| `wpall_shop.claim_comments` | ข้อความลูกค้า/แอดมิน |
| Storage `claim-media`       | รูปหลักฐาน           |

**สถานะ:** submitted → reviewing → approved/rejected → processing → completed

## Server functions

`src/lib/claims.functions.ts` — `createClaim`, `listMyClaims`, `listClaimsAdmin`, `updateClaimStatus`, `addClaimComment`

## หมายเหตุ

- แอดมินอยู่ใน **salepage** (`/admin/*`) ไม่ใช่ wp-backoffice — ข้อมูลอยู่ schema `wpall_shop`
- ถ้าต้องการให้ทีม backoffice จัดการเคลม ต้องเพิ่ม cross-schema client หรือ webhook แยก

## อ้างอิง

- [PHONE-OTP-SETUP.md](./PHONE-OTP-SETUP.md)
