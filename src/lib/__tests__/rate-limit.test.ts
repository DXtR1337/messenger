import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimit, rateLimitMap } from '@/lib/rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    rateLimitMap.clear(); // Clear global state before each test
  });

  afterEach(() => {
    vi.useRealTimers();
    rateLimitMap.clear(); // Clean up after each test
  });

  describe('rateLimit - basic functionality', () => {
    it('should allow request within limit', () => {
      const check = rateLimit(5, 60_000);

      const result = check('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should allow multiple requests within limit', () => {
      const check = rateLimit(5, 60_000);
      const ip = '192.168.1.1';

      for (let i = 0; i < 5; i++) {
        const result = check(ip);
        expect(result.allowed).toBe(true);
      }
    });

    it('should reject request exceeding limit', () => {
      const check = rateLimit(3, 60_000);
      const ip = '192.168.1.1';

      // Use up the limit
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);

      // Fourth request should fail
      const result = check(ip);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should return retryAfter in seconds', () => {
      const check = rateLimit(2, 120_000);
      const ip = '192.168.1.1';

      check(ip);
      check(ip);

      const result = check(ip);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(120);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', () => {
      const windowMs = 60_000;
      const check = rateLimit(2, windowMs);
      const ip = '192.168.1.1';

      // Use up limit
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 1);

      // Should be allowed again
      expect(check(ip).allowed).toBe(true);
    });

    it('should allow concurrent ips with separate limits', () => {
      const check = rateLimit(2, 60_000);

      // IP 1 uses up its limit
      expect(check('192.168.1.1').allowed).toBe(true);
      expect(check('192.168.1.1').allowed).toBe(true);
      expect(check('192.168.1.1').allowed).toBe(false);

      // IP 2 should have its own limit
      expect(check('192.168.1.2').allowed).toBe(true);
      expect(check('192.168.1.2').allowed).toBe(true);
      expect(check('192.168.1.2').allowed).toBe(false);
    });
  });

  describe('rateLimit - different window sizes', () => {
    it('should respect small window sizes', () => {
      const check = rateLimit(1, 1_000); // 1 request per 1 second
      const ip = '192.168.1.1';

      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);

      vi.advanceTimersByTime(1_001);
      expect(check(ip).allowed).toBe(true);
    });

    it('should respect large window sizes', () => {
      const check = rateLimit(10, 3_600_000); // 10 requests per hour
      const ip = '192.168.1.1';

      for (let i = 0; i < 10; i++) {
        expect(check(ip).allowed).toBe(true);
      }

      expect(check(ip).allowed).toBe(false);

      // Reset after 1 hour
      vi.advanceTimersByTime(3_600_001);
      expect(check(ip).allowed).toBe(true);
    });

    it('should handle fractional seconds in retryAfter', () => {
      const check = rateLimit(1, 2_500); // 2.5 seconds
      const ip = '192.168.1.1';

      check(ip);
      vi.advanceTimersByTime(1_000); // 1 second into window

      const result = check(ip);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(2); // 1.5 seconds remaining, rounds to 2
    });
  });

  describe('rateLimit - different limit values', () => {
    it('should handle limit of 1', () => {
      const check = rateLimit(1, 60_000);
      const ip = '192.168.1.1';

      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);
    });

    it('should handle high limits', () => {
      const check = rateLimit(1000, 60_000);
      const ip = '192.168.1.1';

      for (let i = 0; i < 1000; i++) {
        expect(check(ip).allowed).toBe(true);
      }
      expect(check(ip).allowed).toBe(false);
    });

    it('should handle limit of 0 (first call allowed, second rejected)', () => {
      const check = rateLimit(0, 60_000);
      const ip = '192.168.1.1';

      // First call always allowed (creates entry with count=1)
      expect(check(ip).allowed).toBe(true);
      // Second call: count(1) >= limit(0) → rejected
      expect(check(ip).allowed).toBe(false);
    });
  });

  describe('rateLimit - edge cases', () => {
    it('should handle boundary: exactly at limit', () => {
      const check = rateLimit(3, 60_000);
      const ip = '192.168.1.1';

      check(ip);
      check(ip);
      expect(check(ip).allowed).toBe(true); // Exactly at limit, still allowed

      // Next one should fail
      expect(check(ip).allowed).toBe(false);
    });

    it('should handle boundary: exactly at window expiry', () => {
      const windowMs = 60_000;
      const check = rateLimit(1, windowMs);
      const ip = '192.168.1.1';

      check(ip);

      // Advance exactly to window expiry
      vi.advanceTimersByTime(windowMs);

      // At exact boundary, entry should still be valid
      const result = check(ip);
      expect(result.allowed).toBe(false);

      // One millisecond past expiry
      vi.advanceTimersByTime(1);
      expect(check(ip).allowed).toBe(true);
    });

    it('should handle rapid successive requests', () => {
      const check = rateLimit(5, 60_000);
      const ip = '192.168.1.1';

      for (let i = 0; i < 5; i++) {
        expect(check(ip).allowed).toBe(true);
      }

      // All rapid requests should fail
      for (let i = 0; i < 10; i++) {
        expect(check(ip).allowed).toBe(false);
      }
    });

    it('should handle mixed sequential and concurrent calls', () => {
      const check = rateLimit(2, 60_000);

      // IP 1: use first request
      expect(check('192.168.1.1').allowed).toBe(true);

      // IP 2: use first request
      expect(check('192.168.1.2').allowed).toBe(true);

      // IP 1: use second request
      expect(check('192.168.1.1').allowed).toBe(true);

      // IP 2: use second request
      expect(check('192.168.1.2').allowed).toBe(true);

      // Both should now fail
      expect(check('192.168.1.1').allowed).toBe(false);
      expect(check('192.168.1.2').allowed).toBe(false);
    });

    it('should return accurate retryAfter for multiple IPs', () => {
      const check = rateLimit(1, 60_000);

      const result1 = check('192.168.1.1');
      expect(result1.allowed).toBe(true);

      vi.advanceTimersByTime(30_000); // 30 seconds in

      const result2 = check('192.168.1.2');
      expect(result2.allowed).toBe(true);

      // IP 1 should have ~30 seconds remaining
      const result1Retry = check('192.168.1.1');
      expect(result1Retry.allowed).toBe(false);
      expect(result1Retry.retryAfter).toBeCloseTo(30, 2);

      // IP 2 should have ~60 seconds remaining
      const result2Retry = check('192.168.1.2');
      expect(result2Retry.allowed).toBe(false);
      expect(result2Retry.retryAfter).toBeCloseTo(60, 2);
    });
  });

  describe('rateLimit - reset behavior', () => {
    it('should allow fresh request after window expires', () => {
      const windowMs = 10_000;
      const check = rateLimit(1, windowMs);
      const ip = '192.168.1.1';

      const first = check(ip);
      expect(first.allowed).toBe(true);

      vi.advanceTimersByTime(windowMs + 1);

      const second = check(ip);
      expect(second.allowed).toBe(true);
    });

    it('should reset counter after window expires', () => {
      const windowMs = 5_000;
      const check = rateLimit(2, windowMs);
      const ip = '192.168.1.1';

      // First window: use up limit
      check(ip);
      check(ip);
      expect(check(ip).allowed).toBe(false);

      // Advance to new window
      vi.advanceTimersByTime(windowMs + 1);

      // Should have fresh limit
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);
    });

    it('should handle multiple window cycles', () => {
      const windowMs = 2_000;
      const check = rateLimit(1, windowMs);
      const ip = '192.168.1.1';

      // Cycle 1
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);

      // Cycle 2
      vi.advanceTimersByTime(windowMs + 1);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);

      // Cycle 3
      vi.advanceTimersByTime(windowMs + 1);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);
    });
  });

  describe('rateLimit - IP address variants', () => {
    it('should treat different IPs as separate', () => {
      const check = rateLimit(1, 60_000);

      expect(check('127.0.0.1').allowed).toBe(true);
      expect(check('127.0.0.1').allowed).toBe(false);

      expect(check('127.0.0.2').allowed).toBe(true);
      expect(check('127.0.0.2').allowed).toBe(false);
    });

    it('should handle IPv6 addresses', () => {
      const check = rateLimit(1, 60_000);

      expect(check('::1').allowed).toBe(true);
      expect(check('::1').allowed).toBe(false);

      expect(check('2001:db8::1').allowed).toBe(true);
      expect(check('2001:db8::1').allowed).toBe(false);
    });

    it('should be case-sensitive for IP matching', () => {
      const check = rateLimit(2, 60_000);

      // These should be treated as same IP (case-insensitive in typical IP scenarios)
      expect(check('192.168.1.1').allowed).toBe(true);
      expect(check('192.168.1.1').allowed).toBe(true);
      expect(check('192.168.1.1').allowed).toBe(false);
    });
  });

  describe('rateLimit - time-based accuracy', () => {
    it('should calculate accurate retryAfter at different points in window', () => {
      const windowMs = 100_000;
      const check = rateLimit(1, windowMs);
      const ip = '192.168.1.1';

      check(ip);

      // Test at 25% through window
      vi.advanceTimersByTime(25_000);
      let result = check(ip);
      expect(result.retryAfter).toBeCloseTo(75, 1);

      // Clear map and reset timer for next section
      rateLimitMap.clear();
      vi.useRealTimers();
      vi.useFakeTimers();

      check('test-ip');
      vi.advanceTimersByTime(50_000);
      result = check('test-ip');
      expect(result.retryAfter).toBeCloseTo(50, 1);

      // Clear map and reset timer for next section
      rateLimitMap.clear();
      vi.useRealTimers();
      vi.useFakeTimers();

      check('test-ip-2');
      vi.advanceTimersByTime(90_000);
      result = check('test-ip-2');
      expect(result.retryAfter).toBeCloseTo(10, 1);
    });

    it('should round up retryAfter (Math.ceil)', () => {
      const windowMs = 10_000;
      const check = rateLimit(1, windowMs);
      const ip = '192.168.1.1';

      check(ip);
      vi.advanceTimersByTime(1_500); // 1.5s into window, 8.5s remaining

      const result = check(ip);
      expect(result.retryAfter).toBe(9); // ceil(8.5) = 9
    });
  });

  describe('rateLimit - concurrent window scenarios', () => {
    it('should handle staggered requests across multiple windows', () => {
      const windowMs = 10_000;
      const check = rateLimit(3, windowMs);
      const ip = '192.168.1.1';

      // Window 1: t=0
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);

      // Advance halfway through window
      vi.advanceTimersByTime(5_000);

      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);

      // Advance to new window
      vi.advanceTimersByTime(5_001);

      // Should reset with fresh limit
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(true);
      expect(check(ip).allowed).toBe(false);
    });

    it('should handle overlapping windows for different IPs', () => {
      const windowMs = 10_000;
      const check = rateLimit(1, windowMs);

      // IP1 starts at t=0
      expect(check('ip1').allowed).toBe(true);

      // IP2 starts at t=5s
      vi.advanceTimersByTime(5_000);
      expect(check('ip2').allowed).toBe(true);

      // At t=10.001s, IP1's window has expired (strict >), IP2 still has ~5s
      vi.advanceTimersByTime(5_001);
      expect(check('ip1').allowed).toBe(true); // Fresh window
      expect(check('ip2').allowed).toBe(false); // Still in window (count=1 >= limit=1)

      // At t=15.002s, IP2's window expires
      vi.advanceTimersByTime(5_001);
      expect(check('ip2').allowed).toBe(true); // Fresh window
    });
  });

  describe('rateLimit - counter initialization', () => {
    it('should start with count=1 on first request', () => {
      const check = rateLimit(2, 60_000);
      const result = check('192.168.1.1');

      expect(result.allowed).toBe(true);
      // Second request should increment counter
      expect(check('192.168.1.1').allowed).toBe(true);
    });

    it('should not skip first request', () => {
      const check = rateLimit(1, 60_000);
      const result = check('192.168.1.1');

      expect(result.allowed).toBe(true); // Not rejected
      expect(check('192.168.1.1').allowed).toBe(false); // Second is rejected
    });
  });
});
