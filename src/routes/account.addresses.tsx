import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Plus, MapPin, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/addresses")({
  head: () => ({ meta: [{ title: "ที่อยู่จัดส่ง · WP ALL" }] }),
  component: AddressesPage,
});

interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  district: string | null;
  province: string;
  postal_code: string;
  is_default: boolean;
}

const EMPTY: Omit<Address, "id"> = {
  recipient_name: "",
  phone: "",
  line1: "",
  line2: "",
  district: "",
  province: "",
  postal_code: "",
  is_default: false,
};

function AddressesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Partial<Address> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Address[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing || !user) return;
    if (
      !editing.recipient_name ||
      !editing.phone ||
      !editing.line1 ||
      !editing.province ||
      !editing.postal_code
    ) {
      return toast.error("กรอกข้อมูลให้ครบ");
    }
    if (!/^\d{5}$/.test(editing.postal_code.trim())) {
      return toast.error("รหัสไปรษณีย์ต้อง 5 หลัก");
    }
    if (editing.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    const insertPayload = {
      user_id: user.id,
      recipient_name: editing.recipient_name,
      phone: editing.phone,
      line1: editing.line1,
      line2: editing.line2 ?? null,
      district: editing.district ?? null,
      province: editing.province,
      postal_code: editing.postal_code,
      is_default: editing.is_default ?? false,
    };
    const { error } = editing.id
      ? await supabase.from("addresses").update(insertPayload).eq("id", editing.id)
      : await supabase.from("addresses").insert(insertPayload);
    if (error) return toast.error(error.message);
    toast.success("บันทึกแล้ว");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("ลบที่อยู่นี้?")) return;
    await supabase.from("addresses").delete().eq("id", id);
    load();
  };

  const setDefault = async (id: string) => {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  };

  if (loading) return <AccountPageSkeleton variant="cards" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <AccountPageShell title="ที่อยู่จัดส่ง" icon={<MapPin className="size-6 text-emerald-600" />}>
        <div className="flex justify-end -mt-2">
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-bold min-h-[44px]"
          >
            <Plus className="size-4" /> เพิ่มที่อยู่
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
            <MapPin className="size-10 mx-auto mb-2 opacity-40" /> ยังไม่มีที่อยู่
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
                <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{a.recipient_name}</span>
                    <span className="text-sm text-muted-foreground">{a.phone}</span>
                    {a.is_default && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        เริ่มต้น
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    {a.district ? `, ${a.district}` : ""}, {a.province} {a.postal_code}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!a.is_default && (
                    <button
                      onClick={() => setDefault(a.id)}
                      title="ตั้งเริ่มต้น"
                      className="p-1.5 hover:text-primary"
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(a)}
                    title="แก้ไข"
                    className="p-1.5 hover:text-primary"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    title="ลบ"
                    className="p-1.5 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AccountPageShell>

      {editing && (
        <div
          onClick={() => setEditing(null)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-3xl p-5 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold">
              {editing.id ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}
            </h2>
            {[
              ["recipient_name", "ชื่อผู้รับ *"],
              ["phone", "เบอร์โทร *"],
              ["line1", "ที่อยู่ *"],
              ["line2", "อาคาร/หมู่บ้าน (ถ้ามี)"],
              ["district", "เขต/อำเภอ"],
              ["province", "จังหวัด *"],
              ["postal_code", "รหัสไปรษณีย์ *"],
            ].map(([k, label]) => (
              <input
                key={k}
                placeholder={label}
                value={((editing as Record<string, unknown>)[k] as string) ?? ""}
                onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm"
                maxLength={k === "postal_code" ? 5 : 200}
              />
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_default ?? false}
                onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
              />
              ตั้งเป็นที่อยู่เริ่มต้น
            </label>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={save}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
