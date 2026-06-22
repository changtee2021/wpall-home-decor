import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/account/wallet")({
  component: WalletLayout,
});

function WalletLayout() {
  return <Outlet />;
}
