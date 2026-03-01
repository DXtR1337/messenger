'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface DeathLineCardProps {
  data: Array<{
    month: string;
    intimacy: number;
    sentiment: number;
    responseTime: number;
    redZone: number;
  }>;
  emotionalTimeline?: Array<{ month: string; keyEvent?: string }>;
}

/**
 * Static (non-interactive) SVG chart for share card screenshot.
 * Wider format (760px) for chart readability.
 */
function StaticDeathLineSVG({ data, emotionalTimeline }: DeathLineCardProps) {
  if (data.length === 0) return null;

  const W = 700;
  const H = 280;
  const PAD = { top: 35, right: 25, bottom: 50, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const annotations = new Map<string, string>();
  if (emotionalTimeline) {
    for (const entry of emotionalTimeline) {
      if (entry.keyEvent) annotations.set(entry.month, entry.keyEvent);
    }
  }

  const xScale = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - (v / 100) * chartH;

  const smoothLine = (key: 'intimacy' | 'sentiment' | 'responseTime') => {
    if (data.length === 0) return '';
    if (data.length === 1) return `M ${xScale(0)},${yScale(data[0][key])}`;
    let d = `M ${xScale(0)},${yScale(data[0][key])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = xScale(i);
      const y0 = yScale(data[i][key]);
      const x1 = xScale(i + 1);
      const y1 = yScale(data[i + 1][key]);
      const cpx = x0 + (x1 - x0) / 2;
      d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
    }
    return d;
  };

  const pathIntimacy = smoothLine('intimacy');
  const pathSentiment = smoothLine('sentiment');
  const pathResponseTime = smoothLine('responseTime');
  const areaIntimacy = `${pathIntimacy} L ${xScale(data.length - 1)},${yScale(0)} L ${xScale(0)},${yScale(0)} Z`;

  // Red zone spans
  const redZoneRects: Array<{ x1: number; x2: number }> = [];
  let inZone = false;
  let startX = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].redZone > 0 && !inZone) {
      inZone = true;
      startX = xScale(Math.max(0, i - 0.5));
    } else if (data[i].redZone === 0 && inZone) {
      inZone = false;
      redZoneRects.push({ x1: startX, x2: xScale(Math.min(data.length - 1, i - 0.5)) });
    }
  }
  if (inZone) redZoneRects.push({ x1: startX, x2: xScale(data.length - 1) });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ fontFamily: 'monospace' }}>
      <defs>
        <filter id="dlcGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="dlcAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
        </linearGradient>
        <pattern id="dlcHazard" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="#ef4444" strokeWidth="3" opacity="0.25" />
        </pattern>
      </defs>

      <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="rgba(0,0,0,0.3)" rx="6" />

      {/* Grid */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`h-${i}`} x1={PAD.left} y1={PAD.top + (i / 5) * chartH} x2={W - PAD.right} y2={PAD.top + (i / 5) * chartH}
          stroke="#6366f1" strokeWidth="0.5" opacity={i === 5 ? 0.3 : 0.08} />
      ))}

      {/* Red zones */}
      {redZoneRects.map((r, i) => (
        <g key={`rz-${i}`}>
          <rect x={r.x1} y={PAD.top} width={r.x2 - r.x1} height={chartH} fill="url(#dlcHazard)" />
          <rect x={r.x1} y={PAD.top} width={r.x2 - r.x1} height={chartH} fill="rgba(239,68,68,0.06)" />
        </g>
      ))}

      {/* Y-axis */}
      {[0, 50, 100].map((v) => (
        <text key={`y-${v}`} x={PAD.left - 10} y={yScale(v) + 3} textAnchor="end" fill="#64748b" fontSize="9" fontWeight="600">{v}</text>
      ))}

      {/* Area + lines */}
      <path d={areaIntimacy} fill="url(#dlcAreaGrad)" />
      <path d={pathResponseTime} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
      <path d={pathSentiment} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" filter="url(#dlcGlow)" opacity={0.85} />
      <path d={pathIntimacy} fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" filter="url(#dlcGlow)" />

      {/* X-axis + annotations */}
      {data.map((d, i) => {
        const show = data.length <= 12 || i % Math.max(1, Math.floor(data.length / 8)) === 0 || i === data.length - 1;
        const x = xScale(i);
        const annotation = annotations.get(d.month);
        return (
          <g key={`x-${i}`}>
            {show && (
              <text x={x} y={PAD.top + chartH + 16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600"
                transform={data.length > 8 ? `rotate(-20, ${x}, ${PAD.top + chartH + 16})` : undefined}>{d.month}</text>
            )}
            {annotation && (
              <g>
                <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH} stroke="#fbbf24" strokeWidth="0.8" opacity="0.6" />
                <circle cx={x} cy={yScale(d.intimacy)} r="3" fill="#fbbf24" />
                <g transform={`translate(${x}, ${PAD.top - 16})`}>
                  <rect x="-50" y="-10" width="100" height="16" rx="3" fill="rgba(0,0,0,0.8)" stroke="#fbbf24" strokeWidth="0.5" opacity="0.85" />
                  <text x="0" y="1" textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="Georgia, serif" fontWeight="600" fontStyle="italic">
                    {annotation.length > 18 ? annotation.slice(0, 16) + '…' : annotation}
                  </text>
                </g>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function DeathLineCard({ data, emotionalTimeline }: DeathLineCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(180deg, #09090b 0%, #18181b 100%)"
    >
      {/* Noise texture */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'overlay' as const }}>
        <filter id="dlcNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dlcNoise)" />
      </svg>

      {/* Ambient nebula glows */}
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: 250, height: 130, background: 'radial-gradient(ellipse, rgba(236,72,153,0.1) 0%, transparent 60%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 180, height: 180, background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 60%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 16px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: '"Courier New", monospace', fontSize: '0.6rem', fontWeight: 700, color: '#ec4899', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 6, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            Zapis Parametrów Życiowych
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.1em', color: '#ffffff', textTransform: 'uppercase' as const, textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
            Wykres Śmierci Relacji
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontFamily: '"Courier New", monospace', fontSize: '0.6rem', fontWeight: 600, color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 3, background: '#ec4899', borderRadius: 2, boxShadow: '0 0 6px #ec4899' }} />
            Intymność
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 3, background: '#f59e0b', borderRadius: 2, boxShadow: '0 0 6px #f59e0b' }} />
            Sentyment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 3, background: '#3b82f6', borderRadius: 2 }} />
            Czas Reakcji
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 8px', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)' }}>
          <StaticDeathLineSVG data={data} emotionalTimeline={emotionalTimeline} />
        </div>

        {/* Brand */}
        <div style={{ marginTop: 16, textAlign: 'center', opacity: 0.8 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.4em', color: '#ec4899', textTransform: 'uppercase' as const, textShadow: '0 0 8px rgba(236,72,153,0.5)' }}>
            Podtekst.app
          </span>
        </div>
      </div>
    </ShareCardShell>
  );
}
