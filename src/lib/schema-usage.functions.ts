import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APP_SLUG, SUPABASE_SCHEMA } from "@/lib/erp-config";

const INFRA_SCHEMA = "infra";
const GB = 1024 ** 3;
const DEFAULT_LIMIT = 8 * GB;

export type SchemaUsageSummary = {
  appSlug: string;
  schemaName: string;
  databaseBytes: number;
  databaseLimitBytes: number;
  tableCount: number;
  topTable: string | null;
  capturedAt: string | null;
  pct: number;
};

export const getMySchemaUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .schema(INFRA_SCHEMA)
      .from("schema_usage_snapshots")
      .select("database_bytes, table_count, top_table_name, captured_at")
      .eq("app_slug", APP_SLUG)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        appSlug: APP_SLUG,
        schemaName: SUPABASE_SCHEMA,
        databaseBytes: 0,
        databaseLimitBytes: DEFAULT_LIMIT,
        tableCount: 0,
        topTable: null,
        capturedAt: null,
        pct: 0,
      } satisfies SchemaUsageSummary;
    }

    const dbBytes = (data?.database_bytes as number | undefined) ?? 0;
    return {
      appSlug: APP_SLUG,
      schemaName: SUPABASE_SCHEMA,
      databaseBytes: dbBytes,
      databaseLimitBytes: DEFAULT_LIMIT,
      tableCount: (data?.table_count as number | undefined) ?? 0,
      topTable: (data?.top_table_name as string | null) ?? null,
      capturedAt: (data?.captured_at as string | null) ?? null,
      pct: DEFAULT_LIMIT > 0 ? Math.min(100, (dbBytes / DEFAULT_LIMIT) * 100) : 0,
    } satisfies SchemaUsageSummary;
  });
