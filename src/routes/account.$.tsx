import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/errors/not-found-page";
import { AccountLayout } from "@/components/layout/account-layout";

export const Route = createFileRoute("/account/$")({
  component: AccountCatchAll,
});

function AccountCatchAll() {
  return (
    <AccountLayout>
      <NotFoundPage
        title="ไม่พบหน้าในบัญชีของคุณ"
        description="ลิงก์อาจไม่ถูกต้องหรือถูกย้ายแล้ว"
        backTo={{ label: "กลับบัญชีของฉัน", to: "/account" }}
        compact
      />
    </AccountLayout>
  );
}
