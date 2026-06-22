import type { Fabric, Track, Accessory } from "../types";

export const fabrics: Fabric[] = [
  {
    id: "f1",
    code: "VL-101",
    name: "Velvet Lux",
    color: "Sage Green",
    pricePerMeter: 480,
    costPerMeter: 280,
    rollWidthCm: 280,
    swatch: "#9ab59a",
  },
  {
    id: "f2",
    code: "VL-102",
    name: "Velvet Lux",
    color: "Dusty Pink",
    pricePerMeter: 480,
    costPerMeter: 280,
    rollWidthCm: 280,
    swatch: "#d9a9a9",
  },
  {
    id: "f3",
    code: "LN-203",
    name: "Linen Natural",
    color: "Cream",
    pricePerMeter: 320,
    costPerMeter: 180,
    rollWidthCm: 300,
    swatch: "#efe6d4",
  },
  {
    id: "f4",
    code: "BO-410",
    name: "Blackout Premium",
    color: "Charcoal",
    pricePerMeter: 620,
    costPerMeter: 360,
    rollWidthCm: 280,
    swatch: "#3a3a3a",
  },
  {
    id: "f5",
    code: "SK-501",
    name: "Silk Shine",
    color: "Champagne",
    pricePerMeter: 780,
    costPerMeter: 460,
    rollWidthCm: 280,
    swatch: "#e8d9b0",
  },
  {
    id: "f6",
    code: "CT-302",
    name: "Cotton Plain",
    color: "Sky",
    pricePerMeter: 280,
    costPerMeter: 150,
    rollWidthCm: 300,
    swatch: "#bcd6e5",
  },
];

export const tracks: Track[] = [
  { id: "t1", type: "show", name: "รางโชว์อลูมิเนียม", pricePerMeter: 350, costPerMeter: 200 },
  { id: "t2", type: "concealed", name: "รางเอ็มซ่อน", pricePerMeter: 220, costPerMeter: 120 },
  { id: "t3", type: "motorized", name: "รางมอเตอร์ไฟฟ้า", pricePerMeter: 1800, costPerMeter: 1100 },
];

export const accessories: Accessory[] = [
  { id: "a1", name: "ตะขอเกี่ยวม่าน (ชุด)", price: 120, cost: 60 },
  { id: "a2", name: "สายดึงม่าน", price: 80, cost: 35 },
  { id: "a3", name: "ตัวรองพื้นกันลม", price: 150, cost: 80 },
  { id: "a4", name: "รีโมทควบคุม", price: 1200, cost: 700 },
];
