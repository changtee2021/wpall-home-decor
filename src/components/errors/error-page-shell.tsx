import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ErrorVisualVariant = "404" | "500" | "403" | "generic";

const VARIANT_STYLES: Record<ErrorVisualVariant, { badge: string; ring: string; glow: string }> = {
  "404": {
    badge: "bg-muted text-muted-foreground",
    ring: "border-border",
    glow: "from-muted/80 to-background",
  },
  "500": {
    badge: "bg-destructive/10 text-destructive",
    ring: "border-destructive/20",
    glow: "from-destructive/5 to-background",
  },
  "403": {
    badge: "bg-secondary/15 text-secondary-foreground",
    ring: "border-secondary/30",
    glow: "from-secondary/10 to-background",
  },
  generic: {
    badge: "bg-primary/10 text-primary",
    ring: "border-primary/20",
    glow: "from-primary/5 to-background",
  },
};

interface ErrorPageShellProps {
  code?: string;
  variant?: ErrorVisualVariant;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorPageShell({
  code,
  variant = "generic",
  title,
  description,
  icon,
  actions,
  footer,
  compact = false,
  className,
}: ErrorPageShellProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center px-4 sm:px-6",
        compact ? "py-10" : "min-h-[60vh] py-12 sm:py-16",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b sm:h-56",
          styles.glow,
        )}
      />
      <div className="relative w-full max-w-lg">
        <div
          className={cn(
            "rounded-3xl border bg-card/95 p-6 shadow-sm backdrop-blur-sm sm:p-8",
            styles.ring,
          )}
        >
          <div className="flex flex-col items-center text-center">
            {icon ??
              (code && (
                <div
                  className={cn(
                    "mb-4 inline-flex min-h-16 min-w-16 items-center justify-center rounded-2xl px-4 text-3xl font-bold tracking-tight sm:text-4xl",
                    styles.badge,
                  )}
                >
                  {code}
                </div>
              ))}
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
            {actions && (
              <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {actions}
              </div>
            )}
          </div>
          {footer && <div className="mt-6 border-t border-border pt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
