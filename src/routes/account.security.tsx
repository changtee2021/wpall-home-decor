import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AccountPageShell } from "@/components/layout/account-page-shell";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { AccountPageSkeleton, PageSkeleton, FormPageSkeleton } from "@/components/loading";

export const Route = createFileRoute("/account/security")({
  head: () => ({ meta: [{ title: "ความปลอดภัย · WP ALL" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <AccountPageSkeleton variant="form" />;
  if (!user) return <Navigate to="/login" replace />;

  const submit = async () => {
    if (password.length < 8) return toast.error("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (password !== confirm) return toast.error("รหัสผ่านไม่ตรงกัน");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("เปลี่ยนรหัสผ่านเรียบร้อย");
      setPassword("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPageShell
      title="ความปลอดภัย"
      description={`เปลี่ยนรหัสผ่านสำหรับ ${user.email ?? user.phone ?? "บัญชีของคุณ"}`}
      icon={<Shield className="size-6 text-primary" />}
    >
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 max-w-md">
        <label className="block text-sm">
          <span className="text-muted-foreground">รหัสผ่านใหม่</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-border bg-background min-h-[44px]"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">ยืนยันรหัสผ่าน</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-border bg-background min-h-[44px]"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          บันทึกรหัสผ่านใหม่
        </button>
      </div>
    </AccountPageShell>
  );
}
