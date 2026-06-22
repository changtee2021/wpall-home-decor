import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** Legacy custom configurator → redirect to modern product detail */
export const Route = createFileRoute("/_app/custom/$productId")({
  component: CustomRedirect,
});

function CustomRedirect() {
  const { productId } = Route.useParams();
  const navigate = Route.useNavigate();

  useEffect(() => {
    navigate({ to: "/products/$id", params: { id: productId }, replace: true });
  }, [productId, navigate]);

  return <Navigate to="/products/$id" params={{ id: productId }} replace />;
}
