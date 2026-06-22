import { createFileRoute } from "@tanstack/react-router";
import { AppErrorPage } from "@/components/errors/app-error-page";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { AccountLayout } from "@/components/layout/account-layout";
import { appPublicUrl } from "@/lib/app-public-url";

const ACCOUNT_TITLE = "บัญชีของฉัน · WP ALL";
const ACCOUNT_DESC =
  "จัดการโปรไฟล์ Wallet ออเดอร์ ที่อยู่จัดส่ง คูปอง และการแจ้งเตือนของสมาชิก WP ALL";

export const Route = createFileRoute("/account")({
  head: () => {
    const url = `${appPublicUrl()}/account`;
    return {
      meta: [
        { title: ACCOUNT_TITLE },
        { name: "description", content: ACCOUNT_DESC },
        { name: "robots", content: "noindex,follow" },
        { property: "og:title", content: ACCOUNT_TITLE },
        { property: "og:description", content: ACCOUNT_DESC },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AccountLayoutRoute,
  notFoundComponent: AccountNotFound,
  errorComponent: AccountError,
});

function AccountLayoutRoute() {
  return <AccountLayout />;
}

function AccountNotFound() {
  return (
    <AccountLayout>
      <NotFoundPage
        title="ไม่พบหน้าในบัญชีของคุณ"
        description="เมนูที่คุณเปิดอาจไม่มีอยู่แล้ว ลองกลับไปหน้าบัญชีหลัก"
        backTo={{ label: "กลับบัญชีของฉัน", to: "/account" }}
        compact
      />
    </AccountLayout>
  );
}

function AccountError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <AccountLayout>
      <AppErrorPage error={error} reset={reset} reportBoundary="account_layout_error" compact />
    </AccountLayout>
  );
}
