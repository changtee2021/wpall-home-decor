import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingFade } from "@/components/loading/loading-fade";
import { LoadingHint } from "@/components/loading/loading-hint";
import { cn } from "@/lib/utils";

function Sk({ className }: { className?: string }) {
  return <Skeleton className={className} />;
}

function TitleBlock() {
  return (
    <div className="space-y-2">
      <Sk className="h-8 w-48" />
      <Sk className="h-4 w-64 max-w-full" />
    </div>
  );
}

export function PageSkeleton({
  cards = 3,
  className,
  label,
}: {
  cards?: number;
  className?: string;
  label?: string;
}) {
  return (
    <LoadingFade className={cn("space-y-5 p-4 sm:p-6", className)}>
      <TitleBlock />
      {Array.from({ length: cards }).map((_, i) => (
        <Sk key={i} className="h-28 rounded-2xl" />
      ))}
      {label ? <LoadingHint label={label} /> : null}
    </LoadingFade>
  );
}

export function TablePageSkeleton({
  rows = 6,
  className,
  label,
}: {
  rows?: number;
  className?: string;
  label?: string;
}) {
  return (
    <LoadingFade className={cn("space-y-5 p-4 sm:p-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <TitleBlock />
        <Sk className="h-10 w-32 rounded-full shrink-0" />
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
        <Sk className="h-11 rounded-none" />
        {Array.from({ length: rows }).map((_, i) => (
          <Sk key={i} className="h-14 rounded-none border-t border-border" />
        ))}
      </div>
      {label ? <LoadingHint label={label} /> : null}
    </LoadingFade>
  );
}

export function FormPageSkeleton({
  fields = 5,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <LoadingFade className={cn("space-y-5 max-w-lg", className)}>
      <TitleBlock />
      <div className="rounded-2xl border border-border p-5 space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Sk className="h-3 w-20" />
            <Sk className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Sk className="h-11 w-full rounded-xl" />
      </div>
    </LoadingFade>
  );
}

export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <LoadingFade
      className={cn(
        "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Sk className="aspect-square rounded-2xl" />
          <Sk className="h-4 w-full" />
          <Sk className="h-5 w-20" />
        </div>
      ))}
    </LoadingFade>
  );
}

export function CardListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <LoadingFade className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Sk key={i} className="h-24 rounded-2xl" />
      ))}
    </LoadingFade>
  );
}

export function AccountSidebarSkeleton() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col rounded-2xl border border-border p-4 space-y-4 self-start">
      <div className="flex items-center gap-3">
        <Sk className="size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Sk className="h-4 w-24" />
          <Sk className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Sk className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Sk className="h-4 w-full" />
          <Sk className="h-3 w-20" />
        </div>
      </div>
      <Sk className="h-14 rounded-xl" />
      <div className="space-y-1 pt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Sk key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    </aside>
  );
}

export function AccountLayoutSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sk className="h-14 rounded-none shrink-0" />
      <div className="flex-1 flex max-w-screen-2xl w-full mx-auto px-4 sm:px-6 gap-6 py-4">
        <AccountSidebarSkeleton />
        <main className="flex-1 min-w-0 space-y-5">{children ?? <AccountHubSkeleton />}</main>
      </div>
    </div>
  );
}

export function AccountHubSkeleton() {
  return (
    <LoadingFade className="space-y-5 max-w-screen-lg w-full mx-auto">
      <Sk className="h-36 rounded-3xl" />
      <Sk className="h-44 rounded-3xl" />
      <div className="rounded-2xl border border-border p-4 space-y-3">
        <Sk className="h-5 w-28" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Sk key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border p-4 space-y-3">
        <Sk className="h-5 w-28" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 py-2">
              <Sk className="size-12 rounded-2xl" />
              <Sk className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
      <LoadingHint label="กำลังโหลดบัญชี..." />
    </LoadingFade>
  );
}

export function AccountPageSkeleton({
  variant = "cards",
  className,
}: {
  variant?: "cards" | "form" | "table" | "grid";
  className?: string;
}) {
  return (
    <LoadingFade className={cn("space-y-5 max-w-screen-lg w-full mx-auto", className)}>
      <div className="space-y-2">
        <Sk className="h-8 w-40" />
        <Sk className="h-4 w-56 max-w-full" />
      </div>
      {variant === "form" && <FormPageSkeleton fields={4} className="p-0" />}
      {variant === "table" && <TablePageSkeleton rows={5} className="p-0" />}
      {variant === "grid" && <ProductGridSkeleton count={4} />}
      {variant === "cards" && <CardListSkeleton count={4} />}
    </LoadingFade>
  );
}

export function WalletPageSkeleton() {
  return (
    <LoadingFade className="space-y-5 max-w-screen-lg w-full mx-auto">
      <div className="space-y-2">
        <Sk className="h-8 w-40" />
      </div>
      <Sk className="h-44 rounded-3xl" />
      <div className="flex gap-2">
        <Sk className="h-11 w-28 rounded-full" />
        <Sk className="h-11 w-28 rounded-full" />
      </div>
      <CardListSkeleton count={4} />
      <LoadingHint label="กำลังโหลดกระเป๋าเงิน..." />
    </LoadingFade>
  );
}

export function OrdersListSkeleton() {
  return (
    <LoadingFade className="space-y-6">
      <TitleBlock />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Sk key={i} className="h-10 w-20 rounded-full shrink-0" />
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Sk key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Sk key={i} className="h-14 rounded-none border-t border-border first:border-t-0" />
        ))}
      </div>
      <LoadingHint label="กำลังโหลดออเดอร์..." />
    </LoadingFade>
  );
}

export function OrderDetailSkeleton() {
  return (
    <LoadingFade className="space-y-6">
      <div className="flex justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Sk className="h-8 w-48" />
          <Sk className="h-4 w-36" />
        </div>
        <Sk className="h-8 w-24 rounded-full shrink-0" />
      </div>
      <Sk className="h-20 rounded-2xl" />
      <div className="flex gap-2 flex-wrap">
        <Sk className="h-11 w-32 rounded-xl" />
        <Sk className="h-11 w-36 rounded-xl" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Sk className="h-36 rounded-2xl" />
        <Sk className="h-36 rounded-2xl" />
      </div>
      <Sk className="h-48 rounded-2xl" />
      <LoadingHint label="กำลังโหลดรายละเอียด..." />
    </LoadingFade>
  );
}

export function CartSkeleton() {
  return (
    <LoadingFade className="space-y-6 max-w-screen-lg mx-auto px-4 sm:px-6 py-6">
      <Sk className="h-8 w-40" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-border p-4">
          <Sk className="size-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-3/4" />
            <Sk className="h-4 w-24" />
            <Sk className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      ))}
      <Sk className="h-40 rounded-2xl" />
      <LoadingHint label="กำลังโหลดตะกร้า..." />
    </LoadingFade>
  );
}

export function CheckoutSkeleton() {
  return (
    <LoadingFade className="grid lg:grid-cols-2 gap-6 max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
      <div className="space-y-4">
        <Sk className="h-8 w-32" />
        <Sk className="h-32 rounded-2xl" />
        <Sk className="h-48 rounded-2xl" />
      </div>
      <div className="space-y-4">
        <Sk className="h-56 rounded-2xl" />
        <Sk className="h-12 rounded-full" />
      </div>
      <LoadingHint label="กำลังเตรียมชำระเงิน..." className="lg:col-span-2" />
    </LoadingFade>
  );
}

export function QuotationSkeleton() {
  return (
    <LoadingFade className="space-y-4 max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-between">
        <Sk className="h-5 w-32" />
        <div className="flex gap-2">
          <Sk className="h-10 w-24 rounded-xl" />
          <Sk className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <Sk className="h-16 rounded-2xl" />
      <Sk className="h-[480px] rounded-3xl" />
      <LoadingHint label="กำลังโหลดเอกสาร..." />
    </LoadingFade>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <LoadingFade className="space-y-6">
      <TitleBlock />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Sk key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Sk className="h-64 rounded-2xl" />
        <Sk className="h-64 rounded-2xl" />
      </div>
      <LoadingHint label="กำลังโหลดแดชบอร์ด..." />
    </LoadingFade>
  );
}

export function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Sk className="size-12 rounded-full" />
      <LoadingHint label="กำลังตรวจสอบบัญชี..." />
    </div>
  );
}

export function PaymentPageSkeleton() {
  return (
    <LoadingFade className="max-w-md mx-auto space-y-5">
      <Sk className="h-5 w-28" />
      <TitleBlock />
      <Sk className="h-64 rounded-2xl" />
      <Sk className="h-40 rounded-2xl" />
      <LoadingHint label="กำลังโหลด..." />
    </LoadingFade>
  );
}

export function InlineTableLoading({ colSpan = 1, label }: { colSpan?: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8">
        <LoadingHint label={label} size="md" />
      </td>
    </tr>
  );
}

export const AdminPageSkeleton = TablePageSkeleton;
