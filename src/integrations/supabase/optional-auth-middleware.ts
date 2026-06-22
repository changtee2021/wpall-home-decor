import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SCHEMA } from "@/lib/erp-config";
import type { Database } from "./types";

function createAuthedClient(token: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    db: { schema: SUPABASE_SCHEMA },
  });
}

/** Auth optional — sets userId when Bearer token present, else null */
export const optionalSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    if (!token) {
      const anon = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        db: { schema: SUPABASE_SCHEMA },
      });
      return next({ context: { supabase: anon, userId: null as string | null, claims: null } });
    }

    const supabase = createAuthedClient(token);
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized: Invalid token");
    }
    return next({
      context: { supabase, userId: data.claims.sub as string, claims: data.claims },
    });
  },
);
