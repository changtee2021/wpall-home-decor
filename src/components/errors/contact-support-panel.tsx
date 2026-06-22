import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MessageCircle, Phone } from "lucide-react";
import { useSiteContact } from "@/hooks/use-site-contact";
import { Button } from "@/components/ui/button";

interface ContactSupportPanelProps {
  heading?: string;
  showContactPageLink?: boolean;
}

export function ContactSupportPanel({
  heading = "ต้องการความช่วยเหลือ?",
  showContactPageLink = true,
}: ContactSupportPanelProps) {
  const { contact } = useSiteContact();

  const channels = [
    contact.phone
      ? {
          key: "phone",
          label: "โทรศัพท์",
          value: contact.phone,
          href: `tel:${contact.phone.replace(/\s/g, "")}`,
          icon: Phone,
        }
      : null,
    {
      key: "email",
      label: "อีเมล",
      value: contact.email,
      href: `mailto:${contact.email}`,
      icon: Mail,
    },
    contact.line_url
      ? {
          key: "line",
          label: "LINE",
          value: "แชทกับเรา",
          href: contact.line_url,
          icon: MessageCircle,
        }
      : null,
    contact.facebook_url
      ? {
          key: "facebook",
          label: "Facebook",
          value: "ส่งข้อความ",
          href: contact.facebook_url,
          icon: Facebook,
        }
      : null,
    contact.instagram_url
      ? {
          key: "instagram",
          label: "Instagram",
          value: "DM เรา",
          href: contact.instagram_url,
          icon: Instagram,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;

  return (
    <div className="space-y-4 text-left">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
        {contact.contact_note && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {contact.contact_note}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {channels.map(({ key, label, value, href, icon: Icon }) => (
          <a
            key={key}
            href={href}
            target={key === "phone" || key === "email" ? undefined : "_blank"}
            rel={key === "phone" || key === "email" ? undefined : "noreferrer"}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-background/80 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-accent/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <span className="block truncate text-sm font-medium text-foreground">{value}</span>
            </span>
          </a>
        ))}
      </div>
      {showContactPageLink && (
        <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
          <Link to="/contact">ไปหน้าติดต่อเรา</Link>
        </Button>
      )}
    </div>
  );
}
