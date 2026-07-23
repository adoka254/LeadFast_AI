import { createHash } from 'node:crypto';

const windows = new Map<string, number[]>();

function normalizeIp(value: string | null): string {
  if (!value) return 'unknown';
  return value.split(',')[0].trim();
}

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return normalizeIp(forwardedFor);

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export function checkRateLimit(request: Request, options: RateLimitOptions = {}) {
  const { windowMs = 60_000, maxRequests = 10 } = options;
  const ip = getClientIdentifier(request);
  const key = createHash('sha256').update(ip).digest('hex');
  const now = Date.now();
  const existing = windows.get(key) || [];

  const recent = existing.filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  windows.set(key, recent);

  const allowed = recent.length <= maxRequests;
  const retryAfter = allowed ? 0 : Math.ceil((recent[0] + windowMs - now) / 1000);

  return { allowed, retryAfter, key };
}
