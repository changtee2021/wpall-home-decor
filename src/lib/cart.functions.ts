import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enforceUserRateLimit } from "@/lib/rate-limit.server";
import type { ShopCart, ShopCartItem } from "@/lib/cart.types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CartItemInput = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string().min(1).max(200),
  config: z.record(z.string(), z.any()),
  qty: z.number().int().min(1).max(999),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
  note: z.string().max(500).optional(),
});

function mapItem(row: {
  id: string;
  product_id: string | null;
  product_name: string;
  config: unknown;
  qty: number;
  unit_price: number;
  line_total: number;
  note: string | null;
}): ShopCartItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    config: (row.config ?? {}) as Record<string, unknown>,
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    note: row.note,
  };
}

async function resolveCartId(userId: string | null, sessionId: string | null): Promise<string> {
  if (userId) {
    const { data: existing } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await supabaseAdmin
      .from("carts")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return created.id;
  }
  if (!sessionId || !UUID_RE.test(sessionId)) throw new Error("Invalid cart session");
  const { data: existing } = await supabaseAdmin
    .from("carts")
    .select("id")
    .eq("session_id", sessionId)
    .is("user_id", null)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabaseAdmin
    .from("carts")
    .insert({ session_id: sessionId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

async function loadCart(cartId: string): Promise<ShopCart> {
  const { data: items, error } = await supabaseAdmin
    .from("cart_items")
    .select("*")
    .eq("cart_id", cartId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return { id: cartId, items: (items ?? []).map(mapItem) };
}

export const getCart = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await enforceUserRateLimit(context.userId ?? data.sessionId, "cart", 60);
    const cartId = await resolveCartId(context.userId, data.sessionId ?? null);
    return loadCart(cartId);
  });

export const addCartItem = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input) =>
    z.object({ sessionId: z.string().optional(), item: CartItemInput }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await enforceUserRateLimit(context.userId ?? data.sessionId, "cart", 60);
    const cartId = await resolveCartId(context.userId, data.sessionId ?? null);
    const { error } = await supabaseAdmin.from("cart_items").insert({
      cart_id: cartId,
      product_id: data.item.productId,
      product_name: data.item.productName,
      config: data.item.config,
      qty: data.item.qty,
      unit_price: data.item.unitPrice,
      line_total: data.item.lineTotal,
      note: data.item.note ?? null,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("carts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", cartId);
    return loadCart(cartId);
  });

export const updateCartItem = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        sessionId: z.string().optional(),
        itemId: z.string().uuid(),
        qty: z.number().int().min(1).max(999).optional(),
        unitPrice: z.number().min(0).optional(),
        lineTotal: z.number().min(0).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await enforceUserRateLimit(context.userId ?? data.sessionId, "cart", 60);
    const cartId = await resolveCartId(context.userId, data.sessionId ?? null);
    const patch: Record<string, unknown> = {};
    if (data.qty != null) patch.qty = data.qty;
    if (data.unitPrice != null) patch.unit_price = data.unitPrice;
    if (data.lineTotal != null) patch.line_total = data.lineTotal;
    const { error } = await supabaseAdmin
      .from("cart_items")
      .update(patch)
      .eq("id", data.itemId)
      .eq("cart_id", cartId);
    if (error) throw new Error(error.message);
    return loadCart(cartId);
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input) =>
    z.object({ sessionId: z.string().optional(), itemId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await enforceUserRateLimit(context.userId ?? data.sessionId, "cart", 60);
    const cartId = await resolveCartId(context.userId, data.sessionId ?? null);
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", data.itemId)
      .eq("cart_id", cartId);
    if (error) throw new Error(error.message);
    return loadCart(cartId);
  });

export const clearCartServer = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await enforceUserRateLimit(context.userId ?? data.sessionId, "cart", 60);
    const cartId = await resolveCartId(context.userId, data.sessionId ?? null);
    const { error } = await supabaseAdmin.from("cart_items").delete().eq("cart_id", cartId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Merge guest session cart into logged-in user cart after login */
export const mergeGuestCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(data.sessionId)) return { ok: true, merged: 0 };
    const { data: guestCart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("session_id", data.sessionId)
      .is("user_id", null)
      .maybeSingle();
    if (!guestCart?.id) return { ok: true, merged: 0 };

    const userCartId = await resolveCartId(context.userId, null);
    const { data: guestItems } = await supabaseAdmin
      .from("cart_items")
      .select("*")
      .eq("cart_id", guestCart.id);
    if (!guestItems?.length) {
      await supabaseAdmin.from("carts").delete().eq("id", guestCart.id);
      return { ok: true, merged: 0 };
    }

    const inserts = guestItems.map((i) => ({
      cart_id: userCartId,
      product_id: i.product_id,
      product_name: i.product_name,
      config: i.config,
      qty: i.qty,
      unit_price: i.unit_price,
      line_total: i.line_total,
      note: i.note,
    }));
    const { error } = await supabaseAdmin.from("cart_items").insert(inserts);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("carts").delete().eq("id", guestCart.id);
    return { ok: true, merged: guestItems.length };
  });
