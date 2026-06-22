import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appPublicUrl } from "@/lib/app-public-url";
import { AuthCardShell } from "@/components/auth/auth-form";
import { completeOAuthCallback, syncGoogleProfile } from "@/lib/auth-google";
import { completeClientSignIn } from "@/lib/auth-post-login";
import { mapAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth/callback")({
  head: () => {
    const url = `${appPublicUrl()}/auth/callback`;
    return {
      meta: [
        { title: "กำลังเข้าสู่ระบบ · WP ALL" },
        { name: "robots", content: "noindex,nofollow" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [failMessage, setFailMessage] = useState("");
  const [done, setDone] = useState(false);
  const [destination, setDestination] = useState("/");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { user, error } = await completeOAuthCallback();
      if (cancelled) return;

      if (error || !user) {
        setFailMessage(error ? mapAuthError(error).formError : "ไม่พบเซสชันหลังเข้าสู่ระบบ");
        setFailed(true);
        return;
      }

      await syncGoogleProfile(user);
      const path = await completeClientSignIn(user);
      if (cancelled) return;

      setDestination(path);
      setDone(true);
      toast.success("เข้าสู่ระบบด้วย Google สำเร็จ");

      setTimeout(() => {
        void router.history.replace(path);
      }, 400);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (failed) {
    return (
      <AuthCardShell title="เข้าสู่ระบบไม่สำเร็จ" subtitle="ไม่สามารถยืนยันตัวตนจาก Google ได้">
        <p className="text-sm text-muted-foreground text-center mb-4">
          {failMessage || "ลองใหม่อีกครั้ง หรือเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน"}
        </p>
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
          <button
            type="button"
            className="text-primary font-semibold hover:underline"
            onClick={() => void navigate({ to: "/login" })}
          >
            ลอง Google อีกครั้ง
          </button>
          <Link to="/" className="text-muted-foreground hover:underline text-xs">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </AuthCardShell>
    );
  }

  if (done) {
    return (
      <AuthCardShell title="สำเร็จ!" subtitle="ยินดีต้อนรับสู่ WP ALL">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            กำลังพาไป{destination === "/" ? "หน้าหลัก" : "หน้าที่คุณต้องการ"}...
          </p>
        </div>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell title="กำลังเข้าสู่ระบบ" subtitle="กรุณารอสักครู่...">
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">กำลังยืนยันบัญชี Google ของคุณ</p>
      </div>
    </AuthCardShell>
  );
}
