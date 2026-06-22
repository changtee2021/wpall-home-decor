import type { Customer } from "../types";

export const customers: Customer[] = [
  { id: "c1", name: "คุณมาริน ใจดี", tier: "retail", phone: "081-234-5678" },
  {
    id: "c2",
    name: "ฝ่ายจัดซื้อ",
    company: "โรงแรมสยามรีสอร์ท จำกัด",
    tier: "vip",
    taxId: "0105561234567",
    address: "123 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110",
    phone: "02-123-4567",
    email: "purchase@siamresort.co.th",
  },
  {
    id: "c3",
    name: "คุณวินัย",
    company: "บ.บ้านสวยอินทีเรีย จำกัด",
    tier: "wholesale",
    taxId: "0105560987654",
    address: "55/9 ถ.พระราม 9 เขตห้วยขวาง กรุงเทพฯ 10310",
    phone: "02-987-6543",
    email: "winai@bansuay.co.th",
  },
  {
    id: "c4",
    name: "คุณนภา",
    company: "Modern Living Studio",
    tier: "wholesale",
    taxId: "0105562345678",
    address: "88 ถ.เพชรบุรี เขตราชเทวี กรุงเทพฯ 10400",
    phone: "086-111-2233",
  },
  { id: "c5", name: "คุณสมชาย", tier: "retail", phone: "089-555-7788" },
];

export const tierDiscount: Record<string, number> = {
  retail: 0,
  wholesale: 0.12,
  vip: 0.18,
};
