import { type MouseEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompareList } from "@/hooks/use-compare-list";
import type { CompareItem } from "@/lib/compare";

/** Toggle product compare — stops click propagation for use inside Link cards. */
export function CompareCheckbox({ item }: { item: CompareItem }) {
  const { isSelected, toggle, isFull } = useCompareList();
  const selected = isSelected(item.id);
  const disabled = isFull && !selected;

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    toggle(item);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={selected ? "ลบออกจากรายการเปรียบเทียบ" : "เพิ่มในรายการเปรียบเทียบ"}
      aria-pressed={selected}
      className="absolute top-1.5 left-1.5 z-10 flex size-9 items-center justify-center min-h-[44px] min-w-[44px] disabled:opacity-50"
    >
      <Checkbox
        checked={selected}
        disabled={disabled}
        className="pointer-events-none size-4"
        tabIndex={-1}
        aria-hidden
      />
    </button>
  );
}
