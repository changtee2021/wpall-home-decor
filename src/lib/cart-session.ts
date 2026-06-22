const SESSION_KEY = "wpall_cart_session";

/** Stable guest cart session id (UUID v4) stored in localStorage */
export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function clearCartSessionId(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}
