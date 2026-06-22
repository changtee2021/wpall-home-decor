import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Database } from "lucide-react";
import { getMySchemaUsage } from "@/lib/schema-usage.functions";
import { portalInfraUrl } from "@/lib/portal-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingHint } from "@/components/loading";

const PORTAL_INFRA_URL = portalInfraUrl();

export function SchemaUsageWidget() {
  const fn = useServerFn(getMySchemaUsage);
  const { data, isLoading } = useQuery({
    queryKey: ["schema-usage"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  const pct = data?.pct ?? 0;
  const level =
    pct > 90 ? "text-destructive" : pct >= 70 ? "text-amber-600" : "text-muted-foreground";

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Database className="h-4 w-4" />
          Supabase schema ({data?.schemaName ?? "…"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <LoadingHint label="กำลังโหลด usage…" />
          </div>
        ) : (
          <>
            <div className="flex justify-between text-xs">
              <span className={level}>{pct.toFixed(1)}% ของ quota DB</span>
              <span className="tabular-nums text-muted-foreground">
                {(data.databaseBytes / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
            {data.topTable ? (
              <p className="text-[10px] text-muted-foreground">ตารางใหญ่สุด: {data.topTable}</p>
            ) : null}
            <a
              href={PORTAL_INFRA_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-primary underline"
            >
              ดูทุกแอปใน WP GROUP Portal →
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
