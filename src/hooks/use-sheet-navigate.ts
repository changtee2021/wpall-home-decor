import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef } from "react";

/** Radix Sheet/Dialog can leave body locked after layout unmount. */
export function releaseBodyScrollLock() {
  document.documentElement.style.pointerEvents = "";
  document.documentElement.style.overflow = "";
  document.documentElement.removeAttribute("data-scroll-locked");
  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.body.removeAttribute("data-scroll-locked");
}

/** Remove orphan sheet overlays only — do not touch popper/portals React still manages. */
export function forceCloseSheetPortals() {
  releaseBodyScrollLock();
  document.querySelectorAll("[data-radix-dialog-overlay]").forEach((el) => el.remove());
}

export function useSheetNavigate(open: boolean, setOpen: (open: boolean) => void) {
  const navigate = useNavigate();
  const pendingRouteRef = useRef<string | null>(null);

  const goTo = useCallback(
    (to: string) => {
      forceCloseSheetPortals();
      const path = to === "/account/" ? "/account" : to;
      void navigate({ to: path });
    },
    [navigate],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        forceCloseSheetPortals();
        const to = pendingRouteRef.current;
        if (!to) return;
        pendingRouteRef.current = null;
        goTo(to);
      }
    },
    [goTo, setOpen],
  );

  /** Close sheet first; navigate after close animation. */
  const queueNavigation = useCallback(
    (to: string) => {
      if (!open) {
        goTo(to);
        return;
      }
      pendingRouteRef.current = to;
      handleOpenChange(false);
    },
    [goTo, open, handleOpenChange],
  );

  const closeSheet = useCallback(() => {
    pendingRouteRef.current = null;
    handleOpenChange(false);
  }, [handleOpenChange]);

  return { handleOpenChange, queueNavigation, closeSheet };
}
