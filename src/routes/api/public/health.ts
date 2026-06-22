import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(
          { ok: true, service: "wpall-home-decor", timestamp: new Date().toISOString() },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
