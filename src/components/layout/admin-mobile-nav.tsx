import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Menu } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/wp-logo.png";
import { ADMIN_NAV_ITEMS, adminNavHref, isAdminNavActive } from "@/lib/admin-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AdminMobileNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden shrink-0 size-10 rounded-full"
          aria-label="เมนูแอดมิน"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(100vw-2rem,320px)] p-0 flex flex-col bg-sidebar text-sidebar-foreground"
      >
        <SheetHeader className="px-5 py-4 border-b border-sidebar-border">
          <SheetTitle className="text-left">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white p-1.5 shadow-sm">
                <img
                  src={logo}
                  alt="WP ALL Home & Decor"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold tracking-tight text-base">WP ALL</div>
                <div className="text-[11px] text-sidebar-foreground/70">Home & Decor Admin</div>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <SheetClose asChild>
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent"
            >
              <ArrowLeft className="size-3.5" /> กลับหน้าร้าน
            </Link>
          </SheetClose>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-2">
            แอดมิน
          </div>
          <ul className="space-y-1 pb-4">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = !item.external && isAdminNavActive(pathname, item.url);
              const href = adminNavHref(item);
              const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[44px] ${
                active
                  ? "bg-secondary text-secondary-foreground font-semibold shadow-sm"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/90"
              }`;
              return (
                <li key={`${item.url}-${item.title}`}>
                  {item.external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                    </a>
                  ) : (
                    <SheetClose asChild>
                      <Link to={item.url} className={className}>
                        <item.icon className="size-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SheetClose>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
