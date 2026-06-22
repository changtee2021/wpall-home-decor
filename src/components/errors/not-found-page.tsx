import { Link } from "@tanstack/react-router";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSupportPanel } from "@/components/errors/contact-support-panel";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

interface NotFoundPageProps {
  title?: string;
  description?: string;
  backTo?: { label: string; to: string };
  showContact?: boolean;
  compact?: boolean;
}

export function NotFoundPage({
  title = "ไม่พบหน้าที่คุณต้องการ",
  description = "ลิงก์อาจหมดอายุ ถูกย้าย หรือพิมพ์ URL ไม่ถูกต้อง ลองกลับหน้าหลักหรือค้นหาสินค้าต่อได้เลย",
  backTo,
  showContact = true,
  compact = false,
}: NotFoundPageProps) {
  return (
    <ErrorPageShell
      code="404"
      variant="404"
      title={title}
      description={description}
      compact={compact}
      actions={
        <>
          <Button asChild className="min-h-11 w-full sm:w-auto">
            <Link to="/">
              <Home className="size-4" />
              กลับหน้าหลัก
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link to="/products">
              <Search className="size-4" />
              ดูสินค้าทั้งหมด
            </Link>
          </Button>
          {backTo && (
            <Button asChild variant="ghost" className="min-h-11 w-full sm:w-auto">
              <Link to={backTo.to}>{backTo.label}</Link>
            </Button>
          )}
        </>
      }
      footer={showContact ? <ContactSupportPanel /> : undefined}
    />
  );
}
