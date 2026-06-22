import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/account/wallet")({
  component: WalletLayout,
});

function WalletLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return <Outlet key={pathname} />;
}
