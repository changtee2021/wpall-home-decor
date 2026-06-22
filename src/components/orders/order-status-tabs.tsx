import { Link } from "@tanstack/react-router";
import { HUB_ORDER_STATUS, isHubStatusKey, type HubStatusKey } from "@/lib/customer/order-status";

interface OrderStatusTabsProps {
  active?: HubStatusKey;
}

export function OrderStatusTabs({ active }: OrderStatusTabsProps) {
  const tabClass = (selected: boolean) =>
    `shrink-0 px-3 py-2 rounded-full text-xs font-semibold min-h-[44px] inline-flex items-center transition-colors ${
      selected
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <Link to="/orders" search={{}} className={tabClass(!active)}>
        ทั้งหมด
      </Link>
      {HUB_ORDER_STATUS.map((s) => (
        <Link
          key={s.key}
          to="/orders"
          search={{ status: s.key }}
          className={tabClass(active === s.key)}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export function parseOrdersStatusSearch(search: Record<string, unknown>): HubStatusKey | undefined {
  const raw = typeof search.status === "string" ? search.status : undefined;
  return isHubStatusKey(raw) ? raw : undefined;
}
