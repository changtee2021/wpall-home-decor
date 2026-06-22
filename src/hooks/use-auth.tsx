import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tier";

export type AppRole = "customer" | "admin";

export interface AuthProfile {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  tier: Tier;
  total_spent: number;
  order_count: number;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: AuthProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string | undefined) => {
    if (!uid) {
      setRole(null);
      setProfile(null);
      return;
    }
    try {
      const [rolesRes, profRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase
          .from("profiles")
          .select("full_name,phone,address,email,tier,total_spent,order_count")
          .eq("id", uid)
          .maybeSingle(),
      ]);
      const r = (rolesRes.data ?? []).map((x) => x.role as AppRole);
      setRole(r.includes("admin") ? "admin" : r.includes("customer") ? "customer" : null);
      setProfile(profRes.data ? (profRes.data as AuthProfile) : null);
    } catch {
      setRole(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => {
        void loadUserData(s?.user?.id);
      }, 0);
    });

    void (async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) =>
          window.setTimeout(() => resolve(null), 8000),
        );
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        if (cancelled) return;
        const session = result && "data" in result ? result.data.session : null;
        setSession(session);
        await loadUserData(session?.user?.id);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        role,
        profile,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
        refresh: async () => {
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          await loadUserData(data.session?.user?.id);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
