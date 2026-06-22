export const CLAIM_STATUS_LABELS: Record<string, string> = {
  submitted: "ส่งคำขอแล้ว",
  reviewing: "กำลังตรวจสอบ",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
  processing: "ดำเนินการแก้ไข",
  completed: "เสร็จสิ้น",
};

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  defect: "สินค้าชำรุด / บกพร่อง",
  wrong_item: "ได้รับสินค้าผิด",
  missing: "ของไม่ครบ",
  warranty: "เคลมประกัน",
  other: "อื่นๆ",
};

export const CLAIM_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  reviewing: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-slate-100 text-slate-800",
};
