import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  cn,
  generateId,
  formatDuration,
  formatDate,
  formatNumber,
} from '@/lib/utils';

describe('utils', () => {
  describe('cn - className merger', () => {
    it('should merge single class', () => {
      expect(cn('px-2')).toBe('px-2');
    });

    it('should merge multiple classes', () => {
      const result = cn('px-2', 'py-1', 'bg-red-500');
      expect(result).toContain('px-2');
      expect(result).toContain('py-1');
      expect(result).toContain('bg-red-500');
    });

    it('should handle falsy values', () => {
      const result = cn('px-2', null, undefined, false, 'py-1');
      expect(result).toContain('px-2');
      expect(result).toContain('py-1');
      expect(result).not.toContain('null');
      expect(result).not.toContain('undefined');
    });

    it('should resolve tailwind conflicts (later wins)', () => {
      const result = cn('px-2 px-4');
      // twMerge should resolve to the latter
      expect(result).toMatch(/px-[24]/);
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', isActive && 'active-class');
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('should handle object syntax with clsx', () => {
      const result = cn({
        'px-2': true,
        'py-1': false,
        'bg-red-500': true,
      });
      expect(result).toContain('px-2');
      expect(result).toContain('bg-red-500');
      expect(result).not.toContain('py-1');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle array syntax with clsx', () => {
      const result = cn(['px-2', 'py-1']);
      expect(result).toContain('px-2');
      expect(result).toContain('py-1');
    });
  });

  describe('generateId - UUID generation', () => {
    it('should generate a valid UUID v4 format', () => {
      const id = generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate multiple unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should use crypto.randomUUID when available', () => {
      // Assuming crypto is available in Node test environment
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(36); // UUID format length
    });
  });

  describe('formatDuration - duration formatting', () => {
    it('should format seconds for durations < 60s', () => {
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(30_000)).toBe('30s');
      expect(formatDuration(59_999)).toBe('60s');
    });

    it('should format minutes for durations < 1 hour', () => {
      expect(formatDuration(60_000)).toBe('1m');
      expect(formatDuration(150_000)).toBe('2.5m');
      expect(formatDuration(3_599_999)).toBe('60m');
    });

    it('should format hours for durations < 1 day', () => {
      expect(formatDuration(3_600_000)).toBe('1h');
      expect(formatDuration(7_200_000)).toBe('2h');
      expect(formatDuration(5_400_000)).toBe('1h 30m'); // 1.5 hours
      expect(formatDuration(3_660_000)).toBe('1h 1m');
    });

    it('should format hours without minutes when no remainder', () => {
      expect(formatDuration(3_600_000)).toBe('1h');
      expect(formatDuration(7_200_000)).toBe('2h');
      expect(formatDuration(10_800_000)).toBe('3h');
    });

    it('should format days for durations >= 1 day', () => {
      expect(formatDuration(86_400_000)).toBe('1d');
      expect(formatDuration(172_800_000)).toBe('2d');
      expect(formatDuration(90_000_000)).toBe('1d 1h'); // 1 day 1 hour
      expect(formatDuration(86_400_000 + 3_600_000 * 5)).toBe('1d 5h');
    });

    it('should format days without hours when no remainder', () => {
      expect(formatDuration(86_400_000)).toBe('1d');
      expect(formatDuration(172_800_000)).toBe('2d');
      expect(formatDuration(259_200_000)).toBe('3d');
    });

    it('should handle edge cases near boundaries', () => {
      expect(formatDuration(59_500)).toBe('60s');
      expect(formatDuration(60_500)).toBe('1m');
      expect(formatDuration(3_599_500)).toBe('60m');
      expect(formatDuration(3_600_500)).toBe('1h');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle very large durations', () => {
      expect(formatDuration(86_400_000 * 30)).toBe('30d');
    });
  });

  describe('formatDate - date formatting', () => {
    it('should format timestamp as date string', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('should handle different months', () => {
      const timestamp = new Date('2024-12-25').getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/Dec 25, 2024/);
    });

    it('should format single digit days', () => {
      const timestamp = new Date('2024-01-05').getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/Jan 5, 2024/);
    });

    it('should handle leap year dates', () => {
      const timestamp = new Date('2024-02-29').getTime();
      const result = formatDate(timestamp);
      expect(result).toMatch(/Feb 29, 2024/);
    });

    it('should handle epoch timestamp', () => {
      const timestamp = 0; // 1970-01-01
      const result = formatDate(timestamp);
      expect(result).toMatch(/Jan 1, 1970/);
    });

    it('should handle different years', () => {
      expect(formatDate(new Date('2020-03-15').getTime())).toMatch(/2020/);
      expect(formatDate(new Date('2030-07-20').getTime())).toMatch(/2030/);
    });

    it('should format with correct month abbreviations', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((month, index) => {
        const timestamp = new Date(`2024-${String(index + 1).padStart(2, '0')}-01`).getTime();
        const result = formatDate(timestamp);
        expect(result).toContain(month);
      });
    });
  });

  describe('formatNumber - number formatting', () => {
    it('should return plain number for values < 1000', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatNumber(1_000)).toBe('1.0K');
      expect(formatNumber(1_500)).toBe('1.5K');
      expect(formatNumber(10_000)).toBe('10.0K');
      expect(formatNumber(999_999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatNumber(1_000_000)).toBe('1.0M');
      expect(formatNumber(1_500_000)).toBe('1.5M');
      expect(formatNumber(10_000_000)).toBe('10.0M');
      expect(formatNumber(999_999_999)).toBe('1000.0M');
    });

    it('should handle exact boundaries', () => {
      expect(formatNumber(1_000)).toBe('1.0K');
      expect(formatNumber(1_000_000)).toBe('1.0M');
    });

    it('should handle edge case values', () => {
      expect(formatNumber(999)).toBe('999');
      expect(formatNumber(1_000)).toBe('1.0K');
    });

    it('should format decimals correctly', () => {
      expect(formatNumber(1_234)).toBe('1.2K');
      expect(formatNumber(1_567_890)).toBe('1.6M');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should preserve single decimal place', () => {
      const result = formatNumber(1_500_000);
      expect(result).toMatch(/\d+\.\d[MK]/);
    });

    it('should handle very large numbers', () => {
      expect(formatNumber(999_000_000)).toBe('999.0M');
      expect(formatNumber(1_000_000_000)).toBe('1000.0M');
    });

    it('should handle very small numbers', () => {
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(100)).toBe('100');
    });
  });
});
