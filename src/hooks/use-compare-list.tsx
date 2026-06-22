import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  MAX_COMPARE,
  type CompareItem,
  loadCompareFromStorage,
  saveCompareToStorage,
} from "@/lib/compare";

interface CompareCtx {
  items: CompareItem[];
  count: number;
  isFull: boolean;
  isSelected: (id: string) => boolean;
  add: (item: CompareItem, opts?: { silent?: boolean }) => boolean;
  remove: (id: string, opts?: { silent?: boolean }) => void;
  toggle: (item: CompareItem) => void;
  clear: () => void;
  syncItems: (next: CompareItem[]) => void;
  ids: string[];
}

const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCompareFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCompareToStorage(items);
  }, [items, hydrated]);

  const isSelected = useCallback((id: string) => items.some((x) => x.id === id), [items]);

  const add = useCallback(
    (item: CompareItem, opts?: { silent?: boolean }): boolean => {
      if (items.some((x) => x.id === item.id)) return true;
      if (items.length >= MAX_COMPARE) {
        if (!opts?.silent) {
          toast.info(`เลือกได้สูงสุด ${MAX_COMPARE} สินค้า กรุณาลบรายการก่อน`);
        }
        return false;
      }
      const next = [...items, item];
      setItems(next);
      if (!opts?.silent) {
        toast.success(`เพิ่มในรายการเปรียบเทียบแล้ว (${next.length}/${MAX_COMPARE})`);
      }
      return true;
    },
    [items],
  );

  const remove = useCallback((id: string, opts?: { silent?: boolean }) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (next.length < prev.length && !opts?.silent) {
        toast.success("ลบออกจากรายการเปรียบเทียบ");
      }
      return next;
    });
  }, []);

  const toggle = useCallback(
    (item: CompareItem) => {
      if (items.some((x) => x.id === item.id)) {
        remove(item.id);
      } else {
        add(item);
      }
    },
    [items, add, remove],
  );

  const clear = useCallback(() => {
    setItems([]);
    toast.success("ล้างรายการเปรียบเทียบแล้ว");
  }, []);

  const syncItems = useCallback((next: CompareItem[]) => {
    setItems(next.slice(0, MAX_COMPARE));
  }, []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isFull: items.length >= MAX_COMPARE,
      isSelected,
      add,
      remove,
      toggle,
      clear,
      syncItems,
      ids: items.map((x) => x.id),
    }),
    [items, isSelected, add, remove, toggle, clear, syncItems],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompareList(): CompareCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompareList must be used within CompareProvider");
  return ctx;
}

/** Safe for SiteHeader outside CompareProvider (account/admin layouts). */
export function useCompareListOptional(): CompareCtx | null {
  return useContext(Ctx);
}
