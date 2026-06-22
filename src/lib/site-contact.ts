import { companyEmail, COMPANY_EMAIL } from "@/lib/company";

/** Public contact fields from site_settings (key = main). */
export interface SiteContact {
  brand_name: string;
  phone: string | null;
  email: string;
  address: string | null;
  facebook_url: string | null;
  line_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  contact_note: string | null;
}

export const DEFAULT_SITE_CONTACT: SiteContact = {
  brand_name: "WP ALL",
  phone: null,
  email: COMPANY_EMAIL,
  address: null,
  facebook_url: null,
  line_url: null,
  instagram_url: null,
  tiktok_url: null,
  contact_note: null,
};

export function normalizeSiteContact(row: Partial<SiteContact> | null | undefined): SiteContact {
  if (!row) return DEFAULT_SITE_CONTACT;
  return {
    brand_name: row.brand_name?.trim() || DEFAULT_SITE_CONTACT.brand_name,
    phone: row.phone?.trim() || null,
    email: companyEmail(row.email),
    address: row.address?.trim() || null,
    facebook_url: row.facebook_url?.trim() || null,
    line_url: row.line_url?.trim() || null,
    instagram_url: row.instagram_url?.trim() || null,
    tiktok_url: row.tiktok_url?.trim() || null,
    contact_note: row.contact_note?.trim() || null,
  };
}

export const SITE_CONTACT_SELECT =
  "brand_name,phone,email,address,facebook_url,line_url,instagram_url,tiktok_url,contact_note";
