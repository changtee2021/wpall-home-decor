import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Fade-in wrapper so loaded content feels responsive. */
export function LoadingFade({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("animate-in fade-in duration-300 fill-mode-both", className)}>
      {children}
    </div>
  );
}
