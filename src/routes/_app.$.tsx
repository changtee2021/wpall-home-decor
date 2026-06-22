import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/errors/not-found-page";

/** Catch unmatched storefront URLs (e.g. /unknown-page) with header/footer + contact. */
export const Route = createFileRoute("/_app/$")({
  component: StorefrontCatchAll,
});

function StorefrontCatchAll() {
  return (
    <NotFoundPage description="ไม่พบหน้านี้ในร้านค้า WP ALL ลองกลับหน้าหลักหรือค้นหาสินค้าที่ต้องการ" />
  );
}
