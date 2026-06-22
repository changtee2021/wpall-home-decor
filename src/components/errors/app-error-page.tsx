import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSupportPanel } from "@/components/errors/contact-support-panel";
import { ErrorPageShell } from "@/components/errors/error-page-shell";
import { localizeUserFacingError } from "@/lib/locale";

interface AppErrorPageProps {
  error: Error;
  reset?: () => void;
  title?: string;
  description?: string;
  code?: string;
  variant?: "500" | "403" | "generic";
  reportBoundary?: string;
  showContact?: boolean;
  compact?: boolean;
}

function friendlyMessage(error: Error): string {
  return localizeUserFacingError(error.message);
}

export function AppErrorPage({
  error,
  reset,
  title = "เกิดข้อผิดพลาด",
  description,
  code = "500",
  variant = "500",
  reportBoundary = "app_error_page",
  showContact = true,
  compact = false,
}: AppErrorPageProps) {
  const router = useRouter();

  const handleRetry = () => {
    router.invalidate();
    reset?.();
  };

  return (
    <ErrorPageShell
      code={code}
      variant={variant}
      title={title}
      description={description ?? friendlyMessage(error)}
      compact={compact}
      icon={
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-8" />
        </div>
      }
      actions={
        <>
          {reset && (
            <Button onClick={handleRetry} className="min-h-11 w-full sm:w-auto">
              <RotateCcw className="size-4" />
              ลองอีกครั้ง
            </Button>
          )}
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link to="/">
              <Home className="size-4" />
              กลับหน้าหลัก
            </Link>
          </Button>
        </>
      }
      footer={showContact ? <ContactSupportPanel heading="แจ้งปัญหากับทีมงาน" /> : undefined}
    />
  );
}
