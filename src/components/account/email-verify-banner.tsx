import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import {
  clearEmailVerifyReminder,
  resendEmailVerification,
  shouldShowEmailVerifyReminder,
} from "@/lib/auth-email-verify";
import { mapAuthError } from "@/lib/auth-errors";

type EmailVerifyBannerProps = {
  user: User;
  onDismiss?: () => void;
  className?: string;
};

export function EmailVerifyBanner({ user, onDismiss, className = "" }: EmailVerifyBannerProps) {
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden || !shouldShowEmailVerifyReminder(user)) return null;

  const email = user.email ?? "";

  const handleResend = async () => {
    if (!email || busy) return;
    setBusy(true);
    const { error } = await resendEmailVerification(email);
    setBusy(false);
    if (error) {
      toast.error(mapAuthError(error).formError);
      return;
    }
    toast.success("ส่งอีเมลยืนยันแล้ว — กรุณาตรวจสอบกล่องจดหมาย");
  };

  const handleDismiss = async () => {
    setHidden(true);
    await clearEmailVerifyReminder();
    onDismiss?.();
  };

  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-4 sm:px-5 ${className}`}
      role="status"
    >
      <div className="flex gap-3">
        <div className="size-10 shrink-0 rounded-xl bg-white/80 border border-amber-200 flex items-center justify-center">
          <Mail className="size-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-amber-950">ยืนยันอีเมลของคุณ</p>
            <button
              type="button"
              onClick={() => void handleDismiss()}
              className="shrink-0 rounded-lg p-1 text-amber-700/70 hover:bg-amber-100 hover:text-amber-900"
              aria-label="ปิดแจ้งเตือน"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-sm text-amber-900/80 leading-relaxed">
            คุณใช้งานได้ทันทีแล้ว — แต่แนะนำให้ยืนยันอีเมล
            {email ? (
              <>
                {" "}
                <span className="font-medium break-all">({email})</span>
              </>
            ) : null}{" "}
            เพื่อความปลอดภัยและรับการแจ้งเตือนสำคัญ
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={busy || !email}
              className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50 min-h-[36px]"
            >
              {busy ? "กำลังส่ง..." : "ส่งอีเมลยืนยันอีกครั้ง"}
            </button>
            <Link
              to="/verify-email"
              search={{ email }}
              className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white/70 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-white min-h-[36px]"
            >
              วิธียืนยันอีเมล
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
