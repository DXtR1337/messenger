'use client';

/**
 * Shared chart configuration for all Recharts components.
 * Centralizes tooltip, axis, grid, and color config to ensure visual consistency.
 */

import { useState, useEffect } from 'react';

export const CHART_HEIGHT = 260;

/** Responsive chart height — scales with viewport width (200–380px range) */
export function useChartHeight(base = 260): number {
  const [h, setH] = useState(base);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      setH(Math.round(Math.min(Math.max(vw * 0.18, 200), 380)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return h;
}

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#111111',
  border: '1px solid #1a1a1a',
  borderRadius: 8,
  fontSize: 12,
  color: '#fafafa',
};

export const CHART_TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: '#888888',
  marginBottom: 4,
};

export const CHART_AXIS_TICK = {
  fill: '#555555',
  fontSize: 10,
  fontFamily: 'var(--font-jetbrains-mono), monospace',
};

export const CHART_GRID_PROPS = {
  strokeDasharray: '0',
  stroke: 'rgba(255,255,255,0.04)',
  vertical: false as const,
};

export const PERSON_COLORS_HEX = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444'] as const;

export const MONTHS_PL = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru',
] as const;

/** Returns true when viewport width < 640px. Updates on resize. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return mobile;
}

/** Responsive YAxis width — 30 on mobile, 40 on tablet, 50 on desktop. */
export function useAxisWidth(): number {
  const [w, setW] = useState(50);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      if (vw < 640) setW(30);
      else if (vw < 1024) setW(40);
      else setW(50);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return w;
}

/** Responsive axis tick config — fontSize 9 on mobile, 10 on desktop. */
export function useAxisTick(): typeof CHART_AXIS_TICK {
  const mobile = useIsMobile();
  return {
    ...CHART_AXIS_TICK,
    fontSize: mobile ? 9 : 10,
  };
}
