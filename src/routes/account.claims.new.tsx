import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert } from "lucide-react";
import { attachClaimImages, createClaim, ISSUE_TYPES } from "@/lib/claims.functions";
import { ISSUE_TYPE_LABELS } from "@/lib/claims.constants";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/claims/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
  }),
  head: () => ({ meta: [{ title: "แจ้งเคลมใหม่ · WP ALL" }] }),
  component: NewClaimPage,
});

function NewClaimPage() {
  const { user, profile, loading } = useAuth();
  const { orderId: orderIdFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const createFn = useServerFn(createClaim);
  const attachFn = useServerFn(attachClaimImages);

  const [productName, setProductName] = useState("");
  const [issueType, setIssueType] = useState<(typeof ISSUE_TYPES)[number]>("defect");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  useEffect(() => {
    if (!orderIdFromSearch || !user) return;
    setOrderId(orderIdFromSearch);
    supabase
      .from("orders")
      .select("order_number")
      .eq("id", orderIdFromSearch)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.order_number) setProductName((prev) => prev || `ออเดอร์ ${data.order_number}`);
      });
  }, [orderIdFromSearch, user]);

  if (loading) return <AccountPageSkeleton variant="form" />;
  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error("กรุณาอธิบายปัญหาอย่างน้อย 10 ตัวอักษร");
      return;
    }
    setBusy(true);
    try {
      const claim = await createFn({
        data: {
          productName: productName.trim(),
          issueType,
          description: description.trim(),
          orderId: orderId.trim() || null,
          customerPhone: phone.trim() || undefined,
        },
      });

      const paths: string[] = [];
      for (const file of files.slice(0, 5)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${claim.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("claim-media").upload(path, file, {
          upsert: false,
        });
        if (!upErr) paths.push(path);
      }
      if (paths.length) await attachFn({ data: { claimId: claim.id, paths } });

      toast.success("ส่งคำขอเคลมแล้ว");
      navigate({ to: "/account/claims/$id", params: { id: claim.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPageShell
      title="แจ้งเคลมสินค้า"
      backTo="/account/claims"
      backLabel="รายการเคลม"
      icon={<ShieldAlert className="size-6 text-orange-500" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="space-y-1">
          <Label htmlFor="product">ชื่อสินค้า / รุ่น</Label>
          <Input
            id="product"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="เช่น ม่าน Blackout 2.5x2.6m"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="issue">ประเภทปัญหา</Label>
          <select
            id="issue"
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as (typeof ISSUE_TYPES)[number])}
          >
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {ISSUE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="order">เลขออเดอร์ (ถ้ามี)</Label>
          <Input
            id="order"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="UUID หรือ WP-20260616-0001"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">เบอร์ติดต่อ</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812345678"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="desc">รายละเอียดปัญหา</Label>
          <Textarea
            id="desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายอาการ วันที่รับสินค้า ฯลฯ"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="photos">รูปประกอบ (สูงสุด 5 รูป)</Label>
          <Input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>
        <Button type="submit" className="w-full min-h-11" disabled={busy}>
          {busy ? "กำลังส่ง..." : "ส่งคำขอเคลม"}
        </Button>
      </form>
    </AccountPageShell>
  );
}
