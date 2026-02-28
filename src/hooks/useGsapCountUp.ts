'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Parse a display value like "1,234", "45.2%", "12 wiad." into its numeric core.
 * Reused from StatsGrid pattern.
 */
function parseDisplayValue(value: string): {
  number: number;
  prefix: string;
  suffix: string;
  decimals: number;
} | null {
  const match = value.match(/^([^0-9]*)([0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
  if (!match) return null;

  const prefix = match[1];
  const numStr = match[2].replace(/,/g, '');
  const suffix = match[3];
  const number = parseFloat(numStr);

  if (isNaN(number)) return null;

  const dotIndex = match[2].indexOf('.');
  const decimals = dotIndex >= 0 ? match[2].length - dotIndex - 1 : 0;

  return { number, prefix, suffix, decimals };
}

/**
 * Re-format a number to match the original display format (commas, decimals, etc.)
 */
function formatAnimatedValue(
  current: number,
  decimals: number,
  prefix: string,
  suffix: string,
): string {
  let formatted: string;
  if (decimals > 0) {
    formatted = current.toFixed(decimals);
  } else {
    formatted = Math.round(current).toLocaleString('en-US');
  }
  return `${prefix}${formatted}${suffix}`;
}

/**
 * GSAP-compatible count-up hook. Uses RAF with ease-out quadratic (power2.out).
 * Triggered by ScrollTrigger onEnter (external trigger via `start()` callback).
 *
 * @param displayValue - The formatted target value (e.g. "1,234", "45.2%")
 * @param duration - Animation duration in ms (default 800)
 * @returns [currentDisplayValue, startAnimation]
 */
export function useGsapCountUp(
  displayValue: string,
  duration = 2200,
): [string, () => void] {
  const parsed = parseDisplayValue(displayValue);
  const [current, setCurrent] = useState(displayValue);
  const started = useRef(false);
  const rafId = useRef<number>(0);

  const start = useCallback(() => {
    if (started.current || !parsed) return;
    started.current = true;

    const startTime = performance.now();
    const target = parsed.number;

    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out quadratic (power2.out)
      const eased = 1 - Math.pow(1 - progress, 2);
      const value = target * eased;
      setCurrent(formatAnimatedValue(value, parsed!.decimals, parsed!.prefix, parsed!.suffix));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      }
    }

    // Delay start so card is partially visible before numbers roll
    setTimeout(() => {
      rafId.current = requestAnimationFrame(step);
    }, 300);
  }, [parsed, duration]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return [started.current ? current : displayValue, start];
}
