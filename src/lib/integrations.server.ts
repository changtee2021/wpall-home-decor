/** Pause cross-app webhooks during ERP migration without throwing. */
export function integrationsEnabled(): boolean {
  const v = process.env.INTEGRATIONS_ENABLED;
  if (v === undefined || v === "") return true;
  return v !== "false" && v !== "0";
}

export const INTEGRATION_FETCH_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = INTEGRATION_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
