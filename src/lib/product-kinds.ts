export type ProductKind =
  | "curtain"
  | "wood_blind"
  | "aluminum_blind"
  | "dim_blind"
  | "ready_curtain"
  | "accessory"
  | "other";

export const KINDS: { value: ProductKind; label: string; defaultUnit: string }[] = [
  { value: "curtain", label: "ผ้าม่านสั่งตัด", defaultUnit: "ชุด" },
  { value: "ready_curtain", label: "ผ้าม่านสำเร็จรูป", defaultUnit: "ชุด" },
  { value: "wood_blind", label: "มู่ลี่ไม้", defaultUnit: "ตร.ม." },
  { value: "aluminum_blind", label: "มู่ลี่อลูมิเนียม", defaultUnit: "ตร.ม." },
  { value: "dim_blind", label: "ม่านปรับแสง", defaultUnit: "ตร.ม." },
  { value: "accessory", label: "อุปกรณ์ม่าน", defaultUnit: "ชิ้น" },
  { value: "other", label: "อื่นๆ", defaultUnit: "ชิ้น" },
];

export const kindLabel = (k: ProductKind) => KINDS.find((x) => x.value === k)?.label ?? k;

export interface AttributeField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
}

export const KIND_ATTRIBUTES: Record<ProductKind, AttributeField[]> = {
  curtain: [
    {
      key: "curtain_style",
      label: "สไตล์ม่าน",
      type: "select",
      options: ["ลอน (S-Fold)", "จีบ (Pinch Pleat)", "ตาไก่ (Eyelet)", "พับ (Roman)"],
    },
    { key: "fullness", label: "Fullness", type: "number", placeholder: "2.0" },
    { key: "labor_per_panel", label: "ค่าแรง/ผืน (บาท)", type: "number" },
  ],
  ready_curtain: [
    { key: "size", label: "ขนาดสำเร็จ", type: "text", placeholder: "เช่น 200x240 cm" },
    { key: "color", label: "สี", type: "text" },
  ],
  wood_blind: [
    {
      key: "slat_size_mm",
      label: "ขนาดสแลต (mm)",
      type: "select",
      options: ["25", "35", "50", "63"],
    },
    {
      key: "material",
      label: "วัสดุ",
      type: "select",
      options: ["ไม้บาสวูด", "ไม้สนธรรมชาติ", "PVC ลายไม้"],
    },
    {
      key: "control",
      label: "การควบคุม",
      type: "select",
      options: ["สายดึง", "รีโมท", "แบบไร้สาย"],
    },
    { key: "max_width_cm", label: "กว้างสูงสุด (cm)", type: "number" },
    { key: "max_height_cm", label: "สูงสูงสุด (cm)", type: "number" },
  ],
  aluminum_blind: [
    {
      key: "slat_size_mm",
      label: "ขนาดสแลต (mm)",
      type: "select",
      options: ["16", "25", "35", "50"],
    },
    { key: "finish", label: "ผิว", type: "select", options: ["เงา", "ด้าน", "เมทัลลิก"] },
    {
      key: "control",
      label: "การควบคุม",
      type: "select",
      options: ["สายดึง", "ก้านปรับ", "ไร้สาย"],
    },
  ],
  dim_blind: [
    { key: "opacity_pct", label: "ความทึบ (%)", type: "number" },
    {
      key: "fabric_type",
      label: "ชนิดผ้า",
      type: "select",
      options: ["ซีทรู", "ทึบแสง", "กึ่งทึบ"],
    },
    {
      key: "control",
      label: "การควบคุม",
      type: "select",
      options: ["สายดึง", "โซ่ปรับ", "มอเตอร์"],
    },
  ],
  accessory: [
    { key: "pack_qty", label: "จำนวน/แพ็ค", type: "number" },
    {
      key: "compatibility",
      label: "ใช้กับ",
      type: "text",
      placeholder: "เช่น รางโชว์อลู, ม่านตาไก่",
    },
  ],
  other: [],
};
