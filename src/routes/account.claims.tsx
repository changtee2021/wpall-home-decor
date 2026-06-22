import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Button } from "@/components/ui/button";
import { listMyClaims, type ClaimRow } from "@/lib/claims.functions";
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS } from "@/lib/claims.constants";
import { ISSUE_TYPE_LABELS } from "@/lib/claims.constants";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/claims")({
  head: () => ({ meta: [{ title: "เคลมสินค้า · WP ALL" }] }),
  component: AccountClaimsPage,
});

function AccountClaimsPage() {
  const { user, loading } = useAuth();
  const listFn = useServerFn(listMyClaims);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    listFn()
      .then(setRows)
      .finally(() => setFetching(false));
  }, [user, listFn]);

  if (loading || fetching) return <AccountPageSkeleton variant="table" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AccountPageShell
      title="เคลมสินค้า"
      description="แจ้งปัญหา / เคลมประกันหลังรับสินค้า"
      icon={<ShieldAlert className="size-6 text-orange-500" />}
    >
      <div className="flex justify-end">
        <Button asChild size="sm" className="min-h-11">
          <Link to="/account/claims/new">
            <Plus className="mr-1.5 h-4 w-4" /> แจ้งเคลมใหม่
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีรายการเคลม —{" "}
          <Link to="/account/claims/new" className="text-primary font-semibold hover:underline">
            ส่งคำขอแรก
          </Link>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {rows.map((c) => (
              <Link
                key={c.id}
                to="/account/claims/$id"
                params={{ id: c.id }}
                className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-colors min-h-[44px]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.claim_number}</p>
                    <p className="text-sm mt-0.5">{c.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ISSUE_TYPE_LABELS[c.issue_type] ?? c.issue_type} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${CLAIM_STATUS_COLORS[c.status] ?? "bg-muted"}`}
                  >
                    {CLAIM_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">เลขที่เคลม</th>
                    <th className="p-4">สินค้า</th>
                    <th className="p-4">ประเภท</th>
                    <th className="p-4">สถานะ</th>
                    <th className="p-4">วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                      <td className="p-4">
                        <Link
                          to="/account/claims/$id"
                          params={{ id: c.id }}
                          className="font-semibold text-primary hover:underline"
                        >
                          {c.claim_number}
                        </Link>
                      </td>
                      <td className="p-4">{c.product_name}</td>
                      <td className="p-4 text-muted-foreground">
                        {ISSUE_TYPE_LABELS[c.issue_type] ?? c.issue_type}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${CLAIM_STATUS_COLORS[c.status] ?? "bg-muted"}`}
                        >
                          {CLAIM_STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {new Date(c.created_at).toLocaleDateString("th-TH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AccountPageShell>
  );
}
