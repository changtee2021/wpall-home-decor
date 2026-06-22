import { createContext, useContext, useState, type ReactNode } from "react";
import { UserMenuSheet } from "@/components/layout/user-menu-sheet";

interface UserMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  side: "left" | "right";
  setSide: (side: "left" | "right") => void;
}

const UserMenuContext = createContext<UserMenuContextValue | null>(null);

/** Keeps profile sheet mounted across layout switches (storefront ↔ account). */
export function UserMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");

  return (
    <UserMenuContext.Provider value={{ open, setOpen, side, setSide }}>
      {children}
      <UserMenuSheet open={open} onOpenChange={setOpen} side={side} />
    </UserMenuContext.Provider>
  );
}

export function useUserMenu() {
  const ctx = useContext(UserMenuContext);
  if (!ctx) throw new Error("useUserMenu must be used within UserMenuProvider");
  return ctx;
}
