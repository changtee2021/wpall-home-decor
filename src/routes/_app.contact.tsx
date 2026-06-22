import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { companyEmail } from "@/lib/company";
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contact")({
  head: () => ({
    meta: [
      { title: "ติดต่อเรา · WP ALL" },
      {
        name: "description",
        content: "ช่องทางติดต่อ WP ALL สอบถามสินค้า สั่งทำพิเศษ และบริการวัด-ติดตั้ง",
      },
      { property: "og:title", content: "ติดต่อเรา · WP ALL" },
    ],
  }),
  component: ContactPage,
});

interface SiteRow {
  brand_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  facebook_url: string | null;
  line_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  contact_note: string | null;
}

function ContactPage() {
  const [s, setS] = useState<SiteRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .eq("key", "main")
      .maybeSingle()
      .then(({ data }) => setS((data ?? null) as SiteRow | null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, message }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? "ส่งข้อความไม่สำเร็จ");
        return;
      }
      toast.success("ส่งข้อความแล้ว เราจะติดต่อกลับโดยเร็ว");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSending(false);
    }
  };

  const contactEmail = companyEmail(s?.email);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header>
        <h1 className="text-3xl font-bold">ติดต่อเรา</h1>
        {s?.contact_note && <p className="text-muted-foreground mt-2 text-sm">{s.contact_note}</p>}
      </header>
      <div className="bg-card border border-border rounded-2xl p-6 space-y-3 text-sm">
        {s?.phone && <Row icon={Phone} label="โทรศัพท์" value={s.phone} href={`tel:${s.phone}`} />}
        <Row icon={Mail} label="อีเมล" value={contactEmail} href={`mailto:${contactEmail}`} />
        {s?.address && <Row icon={MapPin} label="ที่อยู่" value={s.address} />}
        {s?.line_url && (
          <Row icon={MessageCircle} label="LINE" value={s.line_url} href={s.line_url} />
        )}
        {s?.facebook_url && (
          <Row icon={Facebook} label="Facebook" value={s.facebook_url} href={s.facebook_url} />
        )}
        {s?.instagram_url && (
          <Row icon={Instagram} label="Instagram" value={s.instagram_url} href={s.instagram_url} />
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-base">ส่งข้อความถึงเรา</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="ชื่อ" value={name} onChange={setName} required />
          <Field label="อีเมล" type="email" value={email} onChange={setEmail} required />
          <Field label="โทรศัพท์ (ไม่บังคับ)" value={phone} onChange={setPhone} />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">ข้อความ</span>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Send className="size-4" />
            {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          หรืออีเมลโดยตรงที่{" "}
          <a href={`mailto:${contactEmail}`} className="text-primary underline">
            {contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
      />
    </label>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium break-words">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block hover:bg-accent/40 -mx-2 px-2 py-1 rounded-lg"
    >
      {content}
    </a>
  ) : (
    content
  );
}
