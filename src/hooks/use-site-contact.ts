import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SITE_CONTACT,
  normalizeSiteContact,
  SITE_CONTACT_SELECT,
  type SiteContact,
} from "@/lib/site-contact";

export function useSiteContact() {
  const [contact, setContact] = useState<SiteContact>(DEFAULT_SITE_CONTACT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_settings")
      .select(SITE_CONTACT_SELECT)
      .eq("key", "main")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setContact(normalizeSiteContact(data as Partial<SiteContact> | null));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { contact, loading };
}
