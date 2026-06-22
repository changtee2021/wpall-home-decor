const STEPS = [
  { key: "pending_payment", label: "รอชำระ" },
  { key: "paid", label: "ชำระแล้ว" },
  { key: "producing", label: "ผลิต" },
  { key: "shipped", label: "จัดส่ง" },
  { key: "done", label: "เสร็จสิ้น" },
] as const;

const STATUS_INDEX: Record<string, number> = {
  draft: 0,
  pending_payment: 0,
  paid: 1,
  forwarded: 1,
  producing: 2,
  shipped: 3,
  done: 4,
  cancelled: -1,
};

export function OrderStatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        ออเดอร์ถูกยกเลิก
      </div>
    );
  }

  const current = STATUS_INDEX[status] ?? 0;

  return (
    <ol className="flex items-center justify-between gap-1 no-print">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const active = i === current;
        return (
          <li key={step.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div
              className={`size-3 rounded-full border-2 ${
                done
                  ? active
                    ? "bg-primary border-primary"
                    : "bg-primary/60 border-primary/60"
                  : "bg-muted border-border"
              }`}
            />
            <span
              className={`text-[10px] sm:text-xs text-center truncate w-full ${
                active ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
