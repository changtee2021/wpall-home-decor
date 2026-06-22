import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { ACCOUNT_SIDEBAR_NAV, isAccountNavActive } from "@/lib/customer/account-nav";
import { releaseBodyScrollLock } from "@/hooks/use-sheet-navigate";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Mobile account navigation — always reachable without blocking the whole page. */
export function AccountMobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    releaseBodyScrollLock();
  }, [pathname]);

  const closeOnNav = () => setOpen(false);

  return (
    <div className="lg:hidden flex items-center gap-2 pb-3">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/60 min-h-[44px]"
      >
        <ArrowLeft className="size-3.5" /> หน้าร้าน
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary min-h-[44px]"
          >
            <Menu className="size-4" /> เมนูบัญชี
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left text-base">บัญชีของฉัน</SheetTitle>
          </SheetHeader>
          <nav className="p-2 overflow-y-auto">
            <ul className="space-y-0.5">
              {ACCOUNT_SIDEBAR_NAV.map((item) => {
                const active = isAccountNavActive(pathname, item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={closeOnNav}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px] text-left ${
                        active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60"
                      }`}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
