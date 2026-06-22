import { Checkbox } from "@/components/ui/checkbox";

export function CartSelectBar({
  allSelected,
  someSelected,
  selectedCount,
  onToggleAll,
  onDeleteSelected,
}: {
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
  onToggleAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2">
      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(v) => onToggleAll(v === true)}
          className="size-5"
        />
        <span className="text-sm font-medium">เลือกทั้งหมด</span>
      </label>
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={onDeleteSelected}
          className="text-sm text-destructive font-semibold min-h-[44px] px-2"
        >
          ลบ ({selectedCount})
        </button>
      )}
    </div>
  );
}
