import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { useInsideAccountLayout } from "@/components/layout/account-layout-context";

interface AccountPageShellProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  icon?: ReactNode;
  children: ReactNode;
}

/** Shared layout for customer /account/* sub-pages. */
export function AccountPageShell({
  title,
  description,
  backTo = "/account",
  backLabel = "บัญชีของฉัน",
  icon,
  children,
}: AccountPageShellProps) {
  const insideLayout = useInsideAccountLayout();

  if (insideLayout) {
    return (
      <div className="space-y-5 max-w-screen-lg w-full mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h1>
          {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader defaultMenuSide="left" />
      <main className="flex-1 px-4 sm:px-6 pb-8 max-w-screen-lg mx-auto w-full pt-4 space-y-5">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px] lg:hidden"
        >
          <ChevronLeft className="size-4" /> {backLabel}
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h1>
          {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
