import { create } from "zustand";
import type { CartItem, Role } from "../types";
import { customers } from "../mock/customers";

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  manualDiscountPct: number;
  setManualDiscountPct: (n: number) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: "customer",
  setRole: (role) => set({ role, selectedCustomerId: role === "sales" ? customers[1].id : null }),
  selectedCustomerId: null,
  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  manualDiscountPct: 0,
  setManualDiscountPct: (n) => set({ manualDiscountPct: Math.max(0, Math.min(50, n)) }),
  cart: [],
  addToCart: (item) => set((s) => ({ cart: [...s.cart, item] })),
  removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((i) => i.id !== id) })),
  updateQty: (id, qty) =>
    set((s) => ({
      cart: s.cart.map((i) =>
        i.id === id
          ? {
              ...i,
              config: { ...i.config, quantity: qty },
              price: {
                ...i.price,
                subtotal: (i.price.subtotal / i.config.quantity) * qty,
                costSubtotal: (i.price.costSubtotal / i.config.quantity) * qty,
              },
            }
          : i,
      ),
    })),
  clearCart: () => set({ cart: [] }),
}));
