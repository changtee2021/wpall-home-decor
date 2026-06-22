import { Link, useNavigate } from "@tanstack/react-router";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompareList, useCompareListOptional } from "@/hooks/use-compare-list";
import { MAX_COMPARE } from "@/lib/compare";
import { toast } from "sonner";

export function CompareBar() {
  const { items, count, clear, remove, ids } = useCompareList();
  const navigate = useNavigate();

  if (count === 0) return null;

  const onCompare = () => {
    if (count < 2) {
      toast.info("เลือกอย่างน้อย 2 สินค้าเพื่อเปรียบเทียบ");
      return;
    }
    navigate({ to: "/compare", search: { ids: ids.join(",") } });
  };

  const slots = Array.from({ length: MAX_COMPARE }, (_, i) => items[i] ?? null);

  return (
    <div
      className="fixed z-30 left-0 right-0 border-t border-border bg-card/95 backdrop-blur shadow-lg
        bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:max-w-2xl lg:rounded-xl lg:border"
      role="region"
      aria-label="รายการเปรียบเทียบสินค้า"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-1.5 shrink-0">
          {slots.map((item, i) => (
            <div
              key={i}
              className="relative size-10 rounded-lg border border-border bg-muted overflow-hidden shrink-0"
            >
              {item ? (
                <>
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted-foreground text-xs">
                      🪟
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    aria-label={`ลบ ${item.name} ออกจากรายการเปรียบเทียบ`}
                  >
                    <X className="size-2.5" />
                  </button>
                </>
              ) : (
                <div className="size-full flex items-center justify-center text-muted-foreground/40 text-lg">
                  +
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0 px-1 text-xs text-muted-foreground">
          {count}/{MAX_COMPARE} รายการ
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            className="min-h-[44px] gap-1.5"
            onClick={onCompare}
            disabled={count < 2}
          >
            <GitCompare className="size-4" />
            เปรียบเทียบ
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] px-2"
            onClick={clear}
            aria-label="ล้างรายการเปรียบเทียบ"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Hook-friendly link for header */
export function CompareHeaderLink({ className = "" }: { className?: string }) {
  const ctx = useCompareListOptional();
  if (!ctx || ctx.count === 0) return null;

  const { count, ids } = ctx;
  const search = count >= 2 ? { ids: ids.join(",") } : {};

  return (
    <Link
      to="/compare"
      search={search}
      className={`relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] ${className}`}
      aria-label={`เปรียบเทียบสินค้า ${count} รายการ`}
    >
      <GitCompare className="size-5" />
      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
        {count}
      </span>
    </Link>
  );
}
