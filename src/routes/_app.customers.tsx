import { createFileRoute } from "@tanstack/react-router";
import { customers } from "@/lib/mock/customers";
import { Mail, Phone, Building2 } from "lucide-react";
import { appPublicUrl } from "@/lib/app-public-url";

const CUST_TITLE = "ลูกค้า (CRM) · WP ALL";
const CUST_DESC =
  "ระบบจัดการรายชื่อลูกค้าและ Tier สำหรับทีมขายของ WP ALL ดูข้อมูลติดต่อและประวัติการสั่งซื้อ";

export const Route = createFileRoute("/_app/customers")({
  head: () => {
    const url = `${appPublicUrl()}/customers`;
    return {
      meta: [
        { title: CUST_TITLE },
        { name: "description", content: CUST_DESC },
        { name: "robots", content: "noindex,follow" },
        { property: "og:title", content: CUST_TITLE },
        { property: "og:description", content: CUST_DESC },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CustomersPage,
});

const tierColor: Record<string, string> = {
  retail: "bg-muted text-foreground",
  wholesale: "bg-secondary text-secondary-foreground",
  vip: "bg-primary text-primary-foreground",
};

function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ลูกค้า (CRM)</h1>
        <p className="text-sm text-muted-foreground mt-1">รายชื่อลูกค้าทั้งหมด แยกตาม Tier</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div
            key={c.id}
            className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{c.company ?? c.name}</div>
                {c.company && <div className="text-xs text-muted-foreground">{c.name}</div>}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 ${tierColor[c.tier]}`}
              >
                {c.tier}
              </span>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              {c.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5" /> {c.taxId ?? "—"}
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5" /> {c.phone}
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5" /> {c.email}
                </div>
              )}
              {c.address && (
                <div className="text-[11px] pt-2 border-t border-border mt-2 leading-relaxed">
                  {c.address}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
