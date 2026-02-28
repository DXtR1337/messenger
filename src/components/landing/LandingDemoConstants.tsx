'use client';

import type React from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface DemoSlide {
  id: number;
  category: string;
  accent: string;
  render: () => React.ReactNode;
}

// ═══════════════════════════════════════════════════════════
// DEMO DATA — Ania & Kuba, toksyczno-romantyczna dynamika
// ═══════════════════════════════════════════════════════════

export const P = { a: 'Ania', b: 'Kuba' };
export const C = {
  blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  orange: '#f97316', cyan: '#06b6d4',
};

// ═══════════════════════════════════════════════════════════
// SHARED CHART COMPONENTS — matching real app styles
// ═══════════════════════════════════════════════════════════

export function MiniBar({ value, max = 100, color, label }: { value: number; max?: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="w-10 text-right font-mono text-sm font-medium text-muted-foreground">{value}</span>
    </div>
  );
}

export function StatBox({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 sm:p-5">
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xl sm:text-2xl font-bold" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function SplitBar({ label, left, right, colorL = C.blue, colorR = C.purple }: { label: string; left: number; right: number; colorL?: string; colorR?: string }) {
  const total = left + right || 1;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-4 font-mono text-sm font-medium">
          <span style={{ color: colorL }}>{P.a} {left}%</span>
          <span style={{ color: colorR }}>{P.b} {right}%</span>
        </div>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        <div className="h-full" style={{ background: colorL, width: `${(left / total) * 100}%` }} />
        <div className="h-full flex-1" style={{ background: colorR }} />
      </div>
    </div>
  );
}

export function GaugeRing({ value, size = 120, color, thickness = 6 }: { value: number; size?: number; color: string; thickness?: number }) {
  const r = (size - thickness * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <span className="absolute font-mono text-2xl font-black" style={{ color }}>{value}</span>
    </div>
  );
}

export function RadarChart({ data, color, size = 180 }: { data: { label: string; value: number }[]; color: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 20;
  const n = data.length;
  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
  };
  const points = data.map((d, i) => getPoint(i, d.value));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <svg width={size} height={size} className="mx-auto">
      {[25, 50, 75, 100].map((level) => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, level));
        return <path key={level} d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />;
      })}
      {data.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />; })}
      <path d={pathD} fill={`${color}20`} stroke={color} strokeWidth={2} />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
      {data.map((d, i) => { const p = getPoint(i, 125); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#888" fontSize={12} fontFamily="monospace">{d.label} {d.value}</text>; })}
    </svg>
  );
}
