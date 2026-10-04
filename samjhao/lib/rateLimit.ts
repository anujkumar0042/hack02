/**
 * In-memory IP rate limiter for Samjhao API routes.
 * Protects Gemini API quota during live hackathon demos by limiting requests per IP.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Global store across requests within the Node.js server instance
const rateLimitStore = new Map<string, RateLimitRecord>();

const DEFAULT_MAX_REQUESTS = 15; // 15 requests per minute
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * Checks whether a given IP address has exceeded the rate limit.
 * Cleans up old timestamps automatically.
 */
export function checkRateLimit(
  ip: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(ip) || { timestamps: [] };

  // Filter out timestamps older than the active window
  const activeTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (activeTimestamps.length >= maxRequests) {
    const oldestTimestamp = activeTimestamps[0];
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  // Record this request
  activeTimestamps.push(now);
  rateLimitStore.set(ip, { timestamps: activeTimestamps });

  // Periodic cleanup if store grows large
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      const valid = value.timestamps.filter((ts) => ts > windowStart);
      if (valid.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, { timestamps: valid });
      }
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - activeTimestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Extracts the client IP from standard Next.js request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
