import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CouponRow {
  id: string;
  code: string;
  title: string;
  type: string;
  value: number;
  min_order: number;
  max_discount: number | null;
}

export function CouponStrip({
  subtotal,
  compact = false,
}: {
  subtotal?: number;
  compact?: boolean;
}) {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  useEffect(() => {
    supabase
      .from("coupons")
      .select("id,code,title,type,value,min_order,max_discount,expires_at")
      .eq("is_active", true)
      .order("min_order")
      .limit(3)
      .then(({ data }) => setCoupons((data ?? []) as CouponRow[]));
  }, []);

  if (coupons.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base sm:text-lg font-bold">คูปองส่วนลด</h2>
        <Link to="/account/coupons" className="text-xs text-primary font-semibold">
          ดูทั้งหมด →
        </Link>
      </div>
      <div
        className={
          compact
            ? "flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1"
            : "grid grid-cols-1 sm:grid-cols-3 gap-3"
        }
      >
        {coupons.map((c) => {
          const label = c.type === "percent" ? `ลด ${c.value}%` : `ลด ${c.value} บาท`;
          const gap = subtotal != null && subtotal < c.min_order ? c.min_order - subtotal : 0;
          return (
            <div
              key={c.id}
              className={`flex items-stretch rounded-xl overflow-hidden border border-border bg-card shrink-0 ${compact ? "w-[85vw] max-w-[320px] snap-start" : ""}`}
            >
              <div className="bg-secondary text-secondary-foreground flex flex-col items-center justify-center px-4 py-3 w-24 shrink-0">
                <Ticket className="size-5 mb-1" />
                <div className="text-[10px] font-semibold">{c.code}</div>
              </div>
              <div className="flex-1 p-3">
                <div className="font-bold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.title} · ขั้นต่ำ {c.min_order.toLocaleString()} บาท
                  {gap > 0 && (
                    <span className="text-secondary-foreground font-medium">
                      {" "}
                      · ซื้อเพิ่มอีก {gap.toLocaleString()} บาท
                    </span>
                  )}
                </div>
                <Link
                  to="/account/coupons"
                  className="text-xs text-primary font-semibold mt-1 inline-block"
                >
                  เก็บคูปอง →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
