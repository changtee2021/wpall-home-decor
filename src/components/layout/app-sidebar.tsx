import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_NAV_ITEMS, adminNavHref, isAdminNavActive } from "@/lib/admin-nav";
import logo from "@/assets/wp-logo.png";

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { role } = useAuth();

  if (!pathname.startsWith("/admin") || role !== "admin") return null;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground rounded-r-3xl my-3 ml-3 shadow-sm">
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-white p-1.5 shadow-sm">
          <img src={logo} alt="WP ALL Home & Decor" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-base">WP ALL</div>
          <div className="text-[11px] text-sidebar-foreground/70">Home & Decor Admin</div>
        </div>
      </div>

      <nav className="px-3 flex-1 mt-2 overflow-y-auto">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent"
        >
          <ArrowLeft className="size-3.5" /> กลับหน้าร้าน
        </Link>
        <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-2">
          รับออเดอร์
        </div>
        <ul className="space-y-1 pb-4">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = !item.external && isAdminNavActive(pathname, item.url);
            const href = adminNavHref(item);
            const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              active
                ? "bg-secondary text-secondary-foreground font-semibold shadow-sm"
                : "hover:bg-sidebar-accent text-sidebar-foreground/90"
            }`;
            return (
              <li key={`${item.url}-${item.title}`}>
                {item.external ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.title}</span>
                    <ExternalLink className="size-3.5 opacity-70" />
                  </a>
                ) : (
                  <Link to={item.url} className={className}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
