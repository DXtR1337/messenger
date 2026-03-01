'use client';

import { useState } from 'react';

interface DeathLineDataPoint {
  month: string;
  intimacy: number;
  sentiment: number;
  responseTime: number;
  redZone: number;
}

export default function DeathLineSVG({ data, emotionalTimeline }: {
  data: DeathLineDataPoint[];
  emotionalTimeline?: Array<{ month: string; keyEvent?: string }>;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const W = 900;
  const H = 480;
  const PAD = { top: 30, right: 40, bottom: 110, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Build annotation map
  const annotations = new Map<string, string>();
  if (emotionalTimeline) {
    for (const entry of emotionalTimeline) {
      if (entry.keyEvent) annotations.set(entry.month, entry.keyEvent);
    }
  }

  const xScale = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - (v / 100) * chartH;

  // Catmull-Rom to Bezier — smooth curves
  const catmullRomToBezier = (key: 'intimacy' | 'sentiment' | 'responseTime') => {
    const pts = data.map((d, i) => ({ x: xScale(i), y: yScale(d[key]) }));
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;

    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const tension = 0.35;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const pathIntimacy = catmullRomToBezier('intimacy');
  const pathSentiment = catmullRomToBezier('sentiment');
  const pathResponseTime = catmullRomToBezier('responseTime');

  // Area under intimacy
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

  // Limit annotations shown — pick max 3 evenly spaced
  const annotatedIndices = data.map((d, i) => annotations.has(d.month) ? i : -1).filter(i => i >= 0);
  let shownAnnotations: number[];
  if (annotatedIndices.length <= 3) {
    shownAnnotations = annotatedIndices;
  } else {
    shownAnnotations = [
      annotatedIndices[0],
      annotatedIndices[Math.floor(annotatedIndices.length / 2)],
      annotatedIndices[annotatedIndices.length - 1],
    ];
  }
  const shownAnnotationSet = new Set(shownAnnotations);

  return (
    <div className="relative w-full overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <style>{`
          @keyframes dlDrawPath { from { stroke-dashoffset: 3000; } to { stroke-dashoffset: 0; } }
          @keyframes dlFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes dlPulseGlow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
          @keyframes dlDotPulse { 0%,100% { r: 3; } 50% { r: 5.5; } }
          .dl-path { stroke-dasharray: 3000; animation: dlDrawPath 3s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
          .dl-area { opacity: 0; animation: dlFadeIn 1.5s ease-out 1.8s forwards; }
          .dl-ann { opacity: 0; animation: dlFadeIn 0.8s ease-out 2.5s forwards; }
        `}</style>

        <defs>
          <filter id="dlGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dlBloom" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="dlAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#ec4899" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
          </linearGradient>
          <pattern id="dlHazard" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#ef4444" strokeWidth="2.5" opacity="0.2" />
          </pattern>
          <radialGradient id="dlDotGlow">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Chart background */}
        <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="rgba(0,0,0,0.35)" rx="10" />
        <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="1" rx="10" />

        {/* Horizontal grid */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = yScale(v);
          return (
            <g key={`hg-${v}`}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke={v === 0 ? '#334155' : '#1e293b'} strokeWidth={v === 0 ? '1' : '0.5'} />
              <text x={PAD.left - 14} y={y + 5} textAnchor="end"
                fill="#64748b" fontSize="13" fontWeight="600" fontFamily="monospace">{v}</text>
            </g>
          );
        })}

        {/* Red zone */}
        {redZoneRects.map((r, i) => (
          <g key={`rz-${i}`}>
            <rect x={r.x1} y={PAD.top} width={r.x2 - r.x1} height={chartH} fill="url(#dlHazard)" />
            <rect x={r.x1} y={PAD.top} width={r.x2 - r.x1} height={chartH} fill="rgba(239,68,68,0.04)" style={{ animation: 'dlPulseGlow 4s infinite ease-in-out' }} />
          </g>
        ))}

        {/* Area fill under intimacy */}
        <path d={areaIntimacy} fill="url(#dlAreaGrad)" className="dl-area" />

        {/* Lines */}
        <path d={pathResponseTime} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
          className="dl-path" opacity={0.6} filter="url(#dlBloom)" />
        <path d={pathSentiment} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"
          className="dl-path" opacity={0.85} filter="url(#dlGlow)" />
        <path d={pathIntimacy} fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round"
          className="dl-path" filter="url(#dlGlow)" />

        {/* Data point dots */}
        {data.map((d, i) => (
          <g key={`dots-${i}`} className="dl-area">
            <circle cx={xScale(i)} cy={yScale(d.intimacy)} r="3" fill="#ec4899" opacity={0.6} />
            <circle cx={xScale(i)} cy={yScale(d.sentiment)} r="2.5" fill="#f59e0b" opacity={0.5} />
            <circle cx={xScale(i)} cy={yScale(d.responseTime)} r="2.5" fill="#3b82f6" opacity={0.4} />
          </g>
        ))}

        {/* X-axis labels — bigger */}
        {data.map((d, i) => {
          const showLabel = data.length <= 12 || i % Math.max(1, Math.floor(data.length / 8)) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          const x = xScale(i);
          return (
            <text key={`xl-${i}`} x={x} y={PAD.top + chartH + 26} textAnchor="middle" fill="#94a3b8"
              fontSize="13" fontWeight="600" fontFamily="monospace"
              transform={data.length > 10 ? `rotate(-25, ${x}, ${PAD.top + chartH + 26})` : undefined}>
              {d.month}
            </text>
          );
        })}

        {/* Annotation markers */}
        {data.map((d, i) => {
          if (!shownAnnotationSet.has(i)) return null;
          const annotation = annotations.get(d.month);
          if (!annotation) return null;
          const x = xScale(i);
          // Split long annotations into 2 lines for SVG
          const maxLineLen = 36;
          let lines: string[];
          if (annotation.length <= maxLineLen) {
            lines = [annotation];
          } else {
            const mid = annotation.lastIndexOf(' ', maxLineLen);
            const split = mid > 10 ? mid : maxLineLen;
            const line1 = annotation.slice(0, split);
            const rest = annotation.slice(split).trimStart();
            lines = rest.length > maxLineLen
              ? [line1, rest.slice(0, maxLineLen - 1) + '\u2026']
              : [line1, rest];
          }
          return (
            <g key={`ann-${i}`} className="dl-ann">
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                stroke="#fbbf24" strokeWidth="0.8" opacity="0.3" strokeDasharray="3 3" />
              <circle cx={x} cy={yScale(d.intimacy)} r="5" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8" />
              <circle cx={x} cy={yScale(d.intimacy)} r="10" fill="url(#dlDotGlow)" style={{ animation: 'dlDotPulse 2.5s infinite ease-in-out' }} />
              {lines.map((line, li) => (
                <text key={li} x={x} y={PAD.top + chartH + 56 + li * 14} textAnchor="middle" fill="#fbbf24" fontSize="11"
                  fontWeight="600" fontStyle="italic" fontFamily="Georgia, serif" opacity="0.9">
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Interactive hover zones */}
        {data.map((_, i) => {
          const x1 = i === 0 ? PAD.left : xScale(i - 0.5);
          const x2 = i === data.length - 1 ? W - PAD.right : xScale(i + 0.5);
          return (
            <rect key={`hover-${i}`} x={x1} y={PAD.top} width={x2 - x1} height={chartH}
              fill="transparent" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'crosshair' }} />
          );
        })}

        {/* Hover tooltip — large and readable */}
        {hoveredIdx !== null && (() => {
          const d = data[hoveredIdx];
          const x = xScale(hoveredIdx);
          const tooltipW = 240;
          const tooltipH = 130;
          const tooltipX = x > W / 2 ? x - tooltipW - 20 : x + 20;
          const tooltipY = PAD.top + 8;
          const ann = annotations.get(d.month);
          // Split annotation into lines for tooltip
          const annLines: string[] = [];
          if (ann) {
            const maxTipLine = 34;
            if (ann.length <= maxTipLine) {
              annLines.push(ann);
            } else {
              let remaining = ann;
              while (remaining.length > 0) {
                if (remaining.length <= maxTipLine) { annLines.push(remaining); break; }
                const split = remaining.lastIndexOf(' ', maxTipLine);
                const cut = split > 10 ? split : maxTipLine;
                annLines.push(remaining.slice(0, cut));
                remaining = remaining.slice(cut).trimStart();
                if (annLines.length >= 3) { annLines[annLines.length - 1] += '\u2026'; break; }
              }
            }
          }
          const finalH = tooltipH + annLines.length * 15 + (annLines.length > 0 ? 8 : 0);
          return (
            <g style={{ pointerEvents: 'none' }}>
              {/* Crosshair */}
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH}
                stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 3" />
              {/* Highlighted dots */}
              <circle cx={x} cy={yScale(d.intimacy)} r="7" fill="#ec4899" stroke="#fff" strokeWidth="2" filter="url(#dlGlow)" />
              <circle cx={x} cy={yScale(d.sentiment)} r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" filter="url(#dlGlow)" />
              <circle cx={x} cy={yScale(d.responseTime)} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" filter="url(#dlBloom)" />
              {/* Tooltip card */}
              <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect width={tooltipW} height={finalH} rx="12" fill="rgba(8,12,28,0.96)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                {/* Month header */}
                <text x="16" y="28" fill="#f8fafc" fontSize="16" fontWeight="800" fontFamily="monospace">{d.month}</text>
                <line x1="16" y1="38" x2={tooltipW - 16} y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                {/* Intimacy */}
                <circle cx="22" cy="58" r="5" fill="#ec4899" />
                <text x="34" y="63" fill="#e2e8f0" fontSize="13" fontWeight="500">Intymność</text>
                <text x={tooltipW - 16} y="63" fill="#f8fafc" fontSize="15" fontWeight="800" textAnchor="end">{d.intimacy}</text>
                {/* Sentiment */}
                <circle cx="22" cy="82" r="5" fill="#f59e0b" />
                <text x="34" y="87" fill="#e2e8f0" fontSize="13" fontWeight="500">Sentyment</text>
                <text x={tooltipW - 16} y="87" fill="#f8fafc" fontSize="15" fontWeight="800" textAnchor="end">{d.sentiment}</text>
                {/* Response time */}
                <circle cx="22" cy="106" r="5" fill="#3b82f6" />
                <text x="34" y="111" fill="#e2e8f0" fontSize="13" fontWeight="500">Czas odp.</text>
                <text x={tooltipW - 16} y="111" fill="#f8fafc" fontSize="15" fontWeight="800" textAnchor="end">{d.responseTime}</text>
                {/* Annotation — multiline */}
                {annLines.map((line, li) => (
                  <text key={li} x={tooltipW / 2} y={130 + li * 15} textAnchor="middle" fill="#fbbf24" fontSize="11"
                    fontWeight="600" fontStyle="italic" opacity="0.9">
                    {line}
                  </text>
                ))}
              </g>
            </g>
          );
        })()}

        {/* Legend — bigger text */}
        <g transform={`translate(${W - PAD.right - 310}, ${H - 20})`} className="dl-area">
          <circle cx="0" cy="0" r="5" fill="#ec4899" filter="url(#dlGlow)" />
          <text x="12" y="5" fill="#94a3b8" fontSize="13" fontWeight="600">Intymność</text>
          <circle cx="110" cy="0" r="5" fill="#f59e0b" filter="url(#dlGlow)" />
          <text x="122" y="5" fill="#94a3b8" fontSize="13" fontWeight="600">Sentyment</text>
          <circle cx="228" cy="0" r="4.5" fill="#3b82f6" filter="url(#dlBloom)" />
          <text x="240" y="5" fill="#94a3b8" fontSize="13" fontWeight="600">Czas odpowiedzi</text>
        </g>
      </svg>
    </div>
  );
}
