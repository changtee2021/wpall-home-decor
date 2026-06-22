/** Shared Supabase ERP project — WP GROUP */
export const ERP_PROJECT_ID = "erpzxusskbtdxvqadwxv";

export const SUPABASE_SCHEMA =
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_SCHEMA as string | undefined)) ||
  (typeof process !== "undefined" ? process.env.SUPABASE_SCHEMA : undefined) ||
  "wpall_home_decor";

export const APP_SLUG = "wpall-home-decor";
