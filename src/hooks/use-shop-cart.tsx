import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getCartSessionId, clearCartSessionId } from "@/lib/cart-session";
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCartServer,
  mergeGuestCart,
} from "@/lib/cart.functions";
import type { ShopCartItem } from "@/lib/cart.types";
import { useEffect } from "react";

const CART_KEY = "shop-cart";

export function useShopCart() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sessionId = typeof window !== "undefined" ? getCartSessionId() : "";

  const fetchCart = useServerFn(getCart);
  const addItemFn = useServerFn(addCartItem);
  const updateItemFn = useServerFn(updateCartItem);
  const removeItemFn = useServerFn(removeCartItem);
  const clearFn = useServerFn(clearCartServer);
  const mergeFn = useServerFn(mergeGuestCart);

  const query = useQuery({
    queryKey: [CART_KEY, user?.id ?? sessionId],
    queryFn: () => fetchCart({ data: { sessionId: user ? undefined : sessionId } }),
  });

  useEffect(() => {
    if (!user || !sessionId) return;
    mergeFn({ data: { sessionId } })
      .then(() => {
        clearCartSessionId();
        qc.invalidateQueries({ queryKey: [CART_KEY] });
      })
      .catch(() => {});
  }, [user?.id]);

  const invalidate = () => qc.invalidateQueries({ queryKey: [CART_KEY] });

  const addItem = useMutation({
    mutationFn: (item: Omit<ShopCartItem, "id">) =>
      addItemFn({
        data: {
          sessionId: user ? undefined : sessionId,
          item: {
            productId: item.productId,
            productName: item.productName,
            config: item.config,
            qty: item.qty,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            note: item.note ?? undefined,
          },
        },
      }),
    onSuccess: invalidate,
  });

  const updateQty = useMutation({
    mutationFn: ({
      itemId,
      qty,
      unitPrice,
      lineTotal,
    }: {
      itemId: string;
      qty: number;
      unitPrice: number;
      lineTotal: number;
    }) =>
      updateItemFn({
        data: {
          sessionId: user ? undefined : sessionId,
          itemId,
          qty,
          unitPrice,
          lineTotal,
        },
      }),
    onSuccess: invalidate,
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) =>
      removeItemFn({ data: { sessionId: user ? undefined : sessionId, itemId } }),
    onSuccess: invalidate,
  });

  const clearCart = useMutation({
    mutationFn: () => clearFn({ data: { sessionId: user ? undefined : sessionId } }),
    onSuccess: invalidate,
  });

  const items = query.data?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return {
    items,
    subtotal,
    itemCount,
    isLoading: query.isLoading,
    addItem,
    updateQty,
    removeItem,
    clearCart,
    refetch: query.refetch,
  };
}
