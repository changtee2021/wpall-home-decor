import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingHintProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

/** Small spinner + label — use under skeletons or for inline fetches. */
export function LoadingHint({ label = "กำลังโหลด...", className, size = "sm" }: LoadingHintProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-muted-foreground",
        size === "sm" ? "text-xs py-2" : "text-sm py-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin shrink-0", size === "sm" ? "size-3.5" : "size-4")} />
      <span>{label}</span>
    </div>
  );
}
