/**
 * Distributed rate limiting via Upstash Redis REST API.
 * Falls back to in-memory sliding window when UPSTASH_* env vars are unset (dev/local).
 */

type RateLimitResult = { allowed: boolean; remaining: number };

const memoryStore = new Map<string, number[]>();

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (memoryStore.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    memoryStore.set(key, recent);
    return { allowed: false, remaining: 0 };
  }
  recent.push(now);
  memoryStore.set(key, recent);
  return { allowed: true, remaining: Math.max(0, limit - recent.length) };
}

async function upstashRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify([
      ["INCR", bucket],
      ["EXPIRE", bucket, windowSec],
    ]),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result: number }[];
  const count = json[0]?.result ?? 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000));
  const upstash = await upstashRateLimit(opts.key, opts.limit, windowSec);
  if (upstash) return upstash;
  return memoryRateLimit(opts.key, opts.limit, opts.windowMs);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function enforceRateLimit(opts: {
  request?: Request;
  keyPrefix: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const result = await checkRateLimit({
    key: `${opts.keyPrefix}:${opts.identifier}`,
    limit: opts.limit,
    windowMs: opts.windowMs,
  });
  if (!result.allowed) {
    throw new Error("Too many requests");
  }
}

export async function enforceUserRateLimit(
  userId: string | null | undefined,
  keyPrefix: string,
  limit: number,
  windowMs = 60_000,
): Promise<void> {
  await enforceRateLimit({
    keyPrefix,
    identifier: userId ?? "anon",
    limit,
    windowMs,
  });
}
