'use client';

/**
 * Shared chart configuration for all Recharts components.
 * Centralizes tooltip, axis, grid, and color config to ensure visual consistency.
 */

import React, { useState, useEffect } from 'react';

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
  backgroundColor: 'rgba(17,17,17,0.92)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  fontSize: 13,
  color: '#fafafa',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  padding: '10px 14px',
};

export const CHART_TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: '#aaaaaa',
  marginBottom: 4,
  fontWeight: 500,
};

export const CHART_AXIS_TICK = {
  fill: '#888888',
  fontSize: 11,
  fontFamily: 'var(--font-jetbrains-mono), monospace',
};

export const CHART_GRID_PROPS = {
  strokeDasharray: '0',
  stroke: 'rgba(255,255,255,0.06)',
  vertical: false as const,
};

export const PERSON_COLORS_HEX = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444'] as const;

export const MONTHS_PL = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru',
] as const;

/**
 * Smart month formatter — shows year on January or when year changes.
 * For short datasets (<=12 months) shows only month abbreviation.
 * For longer datasets, shows year at boundaries.
 *
 * Examples:
 *   - Short: "Sty", "Lut", "Mar"
 *   - Long: "Sty '24", "Lut", ..., "Sty '25", "Lut"
 */
export function formatMonthSmart(ym: string, allMonths?: string[]): string {
  const parts = ym.split('-');
  const year = parts[0] ?? '';
  const m = parseInt(parts[1] ?? '0', 10);
  const monthLabel = MONTHS_PL[m - 1] ?? parts[1] ?? '';

  // If no context provided, or dataset is short, just show month
  if (!allMonths || allMonths.length <= 12) {
    // Show year on January or first/last entry
    if (m === 1 && year) return `${monthLabel} '${year.slice(2)}`;
    if (allMonths && allMonths.length > 1 && allMonths[allMonths.length - 1] === ym && year) {
      return `${monthLabel} '${year.slice(2)}`;
    }
    return monthLabel;
  }

  // Always show year on January
  if (m === 1) return `${monthLabel} '${year.slice(2)}`;

  // Always show year on first entry
  if (allMonths[0] === ym && year) return `${monthLabel} '${year.slice(2)}`;

  // Always show year on last entry
  if (allMonths[allMonths.length - 1] === ym && year) return `${monthLabel} '${year.slice(2)}`;

  // Show year if year changed from previous month
  const idx = allMonths.indexOf(ym);
  if (idx > 0) {
    const prevYear = allMonths[idx - 1]?.split('-')[0];
    if (prevYear !== year) return `${monthLabel} '${year.slice(2)}`;
  }

  return monthLabel;
}

/** Simple month formatter — always returns just the Polish abbreviation. */
export function formatMonthSimple(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  return MONTHS_PL[m - 1] ?? parts[1] ?? '';
}

/** Format YYYY-MM to "Sty 2024" — for chart tooltip labels. */
export function formatMonthWithYear(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  const y = parts[0] ?? '';
  return `${MONTHS_PL[m - 1] ?? parts[1]} ${y}`;
}

/** Recharts Tooltip labelFormatter that reads the `month` field from payload and shows year. */
export function monthYearLabelFormatter(
  _label: unknown,
  items: ReadonlyArray<{ payload?: Record<string, unknown> }>,
): string {
  const month = items?.[0]?.payload?.month;
  return typeof month === 'string' ? formatMonthWithYear(month) : String(_label ?? '');
}

/** Props passed by Recharts to custom tooltip content components. */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: Record<string, unknown>;
    color?: string;
    name?: string;
    value?: number | string;
  }>;
  label?: string | number;
}

/** Custom Tooltip content — always shows full month+year from payload.month field. */
export function ChartTooltipContent({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload?.month;
  const title = typeof raw === 'string' ? formatMonthWithYear(raw) : String(label ?? '');
  return React.createElement('div', { style: CHART_TOOLTIP_STYLE },
    React.createElement('p', { style: { ...CHART_TOOLTIP_LABEL_STYLE, marginBottom: 6 } }, title),
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: 3 } },
      payload.filter(e => e.value != null).map((entry, i) =>
        React.createElement('div', {
          key: i,
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontSize: 12 },
        },
          React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            React.createElement('span', {
              style: { width: 8, height: 8, borderRadius: 2, backgroundColor: entry.color, flexShrink: 0 },
            }),
            React.createElement('span', { style: { color: '#bbb' } }, entry.name),
          ),
          React.createElement('span', {
            style: { fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono), monospace' },
          },
            typeof entry.value === 'number'
              ? (Number.isInteger(entry.value) ? entry.value.toLocaleString() : entry.value.toFixed(entry.value < 1 ? 3 : 1))
              : entry.value,
          ),
        ),
      ),
    ),
  );
}

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

/** Responsive YAxis width for horizontal bar charts (participant names).
 *  60 on narrow mobile, 70 on wide mobile, 90 on desktop. */
export function useBarAxisWidth(): number {
  const [w, setW] = useState(90);
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      if (vw < 380) setW(60);
      else if (vw < 640) setW(70);
      else setW(90);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return w;
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

/** Responsive axis tick config — fontSize 10 on mobile, 11 on desktop. */
export function useAxisTick(): typeof CHART_AXIS_TICK {
  const mobile = useIsMobile();
  return {
    ...CHART_AXIS_TICK,
    fontSize: mobile ? 10 : 11,
  };
}

/** Vertical dashed cursor line for line & area charts — plain SVG props (mouse-following). */
export const CHART_CURSOR_LINE = {
  stroke: 'rgba(255,255,255,0.15)',
  strokeWidth: 1,
  strokeDasharray: '4 3',
};

/**
 * Hook for tracking the active (hovered) X-axis label on a Recharts chart.
 *
 * Returns `[activeLabel, chartHandlers]` where `chartHandlers` are event
 * handlers to spread onto the chart component, and `activeLabel` is the
 * current data point's X-axis label (or `null` when not hovering).
 *
 * Usage:
 * ```tsx
 * const [activeLabel, chartHandlers] = useActiveChartLabel();
 * <LineChart {...chartHandlers}>
 *   {activeLabel != null && <ReferenceLine x={activeLabel} {...ACTIVE_REF_LINE_PROPS} />}
 *   <Tooltip cursor={false} animationDuration={0} ... />
 * </LineChart>
 * ```
 */
export function useActiveChartLabel(): [
  string | null,
  {
    onMouseMove: (state: { activeLabel?: string | number } | null) => void;
    onMouseLeave: () => void;
  },
] {
  const [label, setLabel] = useState<string | null>(null);
  const handlers = React.useMemo(
    () => ({
      onMouseMove: (state: { activeLabel?: string | number } | null) => {
        const l = state?.activeLabel;
        setLabel(l != null ? String(l) : null);
      },
      onMouseLeave: () => setLabel(null),
    }),
    [],
  );
  return [label, handlers];
}

/** Style props for the snapping ReferenceLine cursor. */
export const ACTIVE_REF_LINE_PROPS = {
  stroke: 'rgba(255,255,255,0.15)',
  strokeWidth: 1,
  strokeDasharray: '4 3',
  ifOverflow: 'extendDomain' as const,
} as const;

/** Highlight rectangle for bar charts on hover. */
export const CHART_CURSOR_BAR = {
  fill: 'rgba(255,255,255,0.04)',
  radius: 4,
};

/** Standard activeDot glow config for a given color. */
export function chartActiveDot(color: string) {
  return {
    r: 5,
    fill: color,
    stroke: '#0a0a0a',
    strokeWidth: 2,
    style: { filter: `drop-shadow(0 0 6px ${color}60)` },
  };
}

/** Time range options used by the global Obserwatorium filter. */
export type TimeRange = '1M' | '3M' | '6M' | 'Rok' | 'Wszystko';
export const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', 'Rok', 'Wszystko'];
