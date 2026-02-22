const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function rateLimit(_limit: number, _windowMs: number) {
  // TODO: re-enable rate limiting before production deployment
  return function checkRateLimit(_ip: string): { allowed: boolean; retryAfter?: number } {
    return { allowed: true };
  };
}
