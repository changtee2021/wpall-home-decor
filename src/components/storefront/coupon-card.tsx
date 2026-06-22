import { Ticket } from "lucide-react";
import { fmtTHB } from "@/lib/pricing";

export interface CouponView {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  expires_at?: string | null;
  claimed?: boolean;
  used?: boolean;
}

export function CouponCard({ c, onClaim }: { c: CouponView; onClaim?: () => void }) {
  return (
    <div className="flex bg-card border border-border rounded-2xl overflow-hidden">
      <div className="w-24 shrink-0 bg-gradient-to-br from-primary to-orange-600 text-white flex flex-col items-center justify-center p-2 text-center">
        <Ticket className="size-5 mb-1" />
        <div className="text-[10px] opacity-80">ส่วนลด</div>
        <div className="text-base font-bold leading-tight">
          {c.type === "percent" ? `${c.value}%` : fmtTHB(c.value)}
        </div>
      </div>
      <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
        <div className="font-semibold text-sm truncate">{c.title}</div>
        {c.description && (
          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            {c.description}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-1">
          ขั้นต่ำ {fmtTHB(c.min_order)}
          {c.expires_at && ` · หมดอายุ ${new Date(c.expires_at).toLocaleDateString("th-TH")}`}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          โค้ด: <span className="font-mono font-bold text-foreground">{c.code}</span>
        </div>
      </div>
      {onClaim && (
        <div className="p-3 flex items-center">
          <button
            onClick={onClaim}
            disabled={c.claimed}
            className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-4 py-2 disabled:opacity-50"
          >
            {c.used ? "ใช้แล้ว" : c.claimed ? "เก็บแล้ว" : "เก็บโค้ด"}
          </button>
        </div>
      )}
    </div>
  );
}
