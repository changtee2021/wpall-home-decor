import { createFileRoute } from "@tanstack/react-router";
import { isC2C2PConfigured } from "@/lib/c2c2p.server";

export const Route = createFileRoute("/api/public/c2c2p-status")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(
          { enabled: isC2C2PConfigured() },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
