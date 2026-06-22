import { createFileRoute } from "@tanstack/react-router";
import { handleC2C2PWebhook } from "@/lib/c2c2p.server";

export const Route = createFileRoute("/api/public/c2c2p-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          body = await request.json();
        } else {
          body = await request.text();
        }
        const ok = await handleC2C2PWebhook(body);
        return Response.json({ ok }, { status: ok ? 200 : 400 });
      },
    },
  },
});
