import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { companyEmail } from "@/lib/company";
import { Facebook, Instagram, MessageCircle, Phone, Mail, MapPin } from "lucide-react";

interface SiteSettings {
  brand_name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  facebook_url: string | null;
  line_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
}

export function SiteFooter() {
  const [s, setS] = useState<SiteSettings | null>(null);
  useEffect(() => {
    supabase
      .from("site_settings")
      .select(
        "brand_name,tagline,phone,email,address,facebook_url,line_url,instagram_url,tiktok_url",
      )
      .eq("key", "main")
      .maybeSingle()
      .then(({ data }) => setS((data ?? null) as SiteSettings | null));
  }, []);

  const brand = s?.brand_name ?? "WP ALL";
  const contactEmail = companyEmail(s?.email);

  return (
    <footer className="hidden lg:block border-t border-border bg-card mt-10">
      <div className="max-w-screen-2xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-bold text-base">{brand}</div>
          {s?.tagline && <div className="text-muted-foreground text-xs mt-1">{s.tagline}</div>}
          <div className="flex gap-2 mt-3">
            {s?.facebook_url && (
              <a
                href={s.facebook_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="size-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground"
              >
                <Facebook className="size-4" />
              </a>
            )}
            {s?.line_url && (
              <a
                href={s.line_url}
                target="_blank"
                rel="noreferrer"
                aria-label="LINE"
                className="size-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground"
              >
                <MessageCircle className="size-4" />
              </a>
            )}
            {s?.instagram_url && (
              <a
                href={s.instagram_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="size-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground"
              >
                <Instagram className="size-4" />
              </a>
            )}
          </div>
        </div>
        <div>
          <div className="font-semibold mb-2">เมนู</div>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link to="/products" className="hover:text-foreground">
                สินค้าทั้งหมด
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                เกี่ยวกับเรา
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                ติดต่อเรา
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">บัญชี</div>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link to="/account" className="hover:text-foreground">
                โปรไฟล์
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-foreground">
                ออเดอร์ของฉัน
              </Link>
            </li>
            <li>
              <Link to="/account/wallet" className="hover:text-foreground">
                กระเป๋าเงิน
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-2">ติดต่อ</div>
          <ul className="space-y-1.5 text-muted-foreground">
            {s?.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-3.5" /> {s.phone}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <a href={`mailto:${contactEmail}`} className="hover:text-foreground">
                {contactEmail}
              </a>
            </li>
            {s?.address && (
              <li className="flex gap-2">
                <MapPin className="size-3.5 mt-0.5 shrink-0" />{" "}
                <span className="text-xs">{s.address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {brand}. All rights reserved.
      </div>
    </footer>
  );
}
