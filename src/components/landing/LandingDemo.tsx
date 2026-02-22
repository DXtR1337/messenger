'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from 'framer-motion';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface DemoSlide {
  id: number;
  category: string;
  accent: string;
  render: () => React.ReactNode;
}

// ═══════════════════════════════════════════════════════════
// DEMO DATA — Ania & Kuba, toksyczno-romantyczna dynamika
// ═══════════════════════════════════════════════════════════

const P = { a: 'Ania', b: 'Kuba' };
const C = {
  blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  orange: '#f97316', cyan: '#06b6d4',
};

// ═══════════════════════════════════════════════════════════
// SHARED CHART COMPONENTS — matching real app styles
// ═══════════════════════════════════════════════════════════

function MiniBar({ value, max = 100, color, label }: { value: number; max?: number; color: string; label: string }) {
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

function StatBox({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 sm:p-5">
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-xl sm:text-2xl font-bold" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SplitBar({ label, left, right, colorL = C.blue, colorR = C.purple }: { label: string; left: number; right: number; colorL?: string; colorR?: string }) {
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

function GaugeRing({ value, size = 120, color, thickness = 6 }: { value: number; size?: number; color: string; thickness?: number }) {
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

function RadarChart({ data, color, size = 180 }: { data: { label: string; value: number }[]; color: string; size?: number }) {
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

// ═══════════════════════════════════════════════════════════
// SLIDE 1: KLUCZOWE METRYKI + ZDROWIE
// ═══════════════════════════════════════════════════════════

function SlideOverview() {
  const sparkline = [
    12, 18, 24, 30, 22, 35, 42, 38, 50, 45,
    60, 55, 48, 62, 70, 58, 45, 52, 40, 65,
    72, 80, 68, 55, 48, 75, 82, 90, 78, 62,
  ];
  const maxVal = Math.max(...sparkline);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Top row — 4 KPI StatBoxes */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        <StatBox
          label="Wiadomości"
          value="12 847"
          sub="3× Władca Pierścieni — i zero happy endingu"
        />
        <StatBox
          label="Śr. czas odpowiedzi"
          value="4m 23s"
          accent={C.cyan}
          sub="Ania 3s ⚡ vs Kuba 23min 💀"
        />
        <StatBox
          label="Wynik zdrowia"
          value="34/100"
          accent={C.red}
          sub="Pacjent nie żyje — ale dzielnie udaje"
        />
        <StatBox
          label="Aktywne dni"
          value="423"
          sub="67% inicjuje Ania — Kuba czeka na zaproszenie"
        />
      </div>

      {/* Bottom row — sparkline + health gauge */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {/* Sparkline activity chart */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-[15px] font-bold">
              Aktywność w czasie
            </span>
            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-400">
              TOP 3% PAR
            </span>
          </div>
          <div className="flex h-20 items-end justify-center gap-[3px]">
            {sparkline.map((val, i) => (
              <div
                key={i}
                className="rounded-t"
                style={{
                  width: 8,
                  height: `${(val / maxVal) * 100}%`,
                  background: `rgba(59,130,246,${0.15 + (val / maxVal) * 0.65})`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Health gauge + 5 MiniBar components */}
        <div className="flex items-center gap-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <GaugeRing value={34} size={160} color={C.red} />
          <div className="flex-1 space-y-2">
            <MiniBar label="Balans" value={28} color={C.red} />
            <MiniBar label="Wzajemność" value={35} color={C.red} />
            <MiniBar label="Odpowiedzi" value={22} color={C.red} />
            <MiniBar label="Bezpieczeństwo" value={41} color={C.amber} />
            <MiniBar label="Rozwój" value={48} color={C.amber} />
          </div>
        </div>
      </div>

      {/* Row 3 — Dynamika relacji: 3 record cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Najdłuższa seria', value: '47 dni', sub: 'non-stop bez przerwy', color: C.blue },
          { label: 'Max msg / dzień', value: '127', sub: 'piątek, po winie', color: C.purple },
          { label: 'Najdłuższy ghost', value: '23h', sub: 'Kuba po "kocham cię"', color: C.red },
        ].map((r) => (
          <div key={r.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.label}</span>
            <p className="font-mono text-xl font-bold" style={{ color: r.color }}>{r.value}</p>
            <span className="text-[11px] text-muted-foreground">{r.sub}</span>
          </div>
        ))}
      </div>

      {/* Row 4 — Kluczowe sygnały */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">Kluczowe sygnały AI</span>
        <div className="mt-3 space-y-2">
          {[
            { icon: '📊', text: `67% rozmów zaczyna ${P.a} — ${P.b} jest reaktywny, nigdy nie inicjuje` },
            { icon: '⏱️', text: `${P.a} odpowiada w 3s, ${P.b} w 23min — asymetria 460×` },
            { icon: '💬', text: `312× "ok" vs 47× "kocham cię" — proporcja emocjonalna ${P.b}` },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <span className="mt-0.5 text-base">{s.icon}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5 — Emocjonalna asymetria */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: '"kocham cię"', value: '47×', color: C.purple, sub: `tylko ${P.b}` },
          { label: '"ok" / "spoko"', value: '501×', color: C.red, sub: `${P.b}: 62% wiadomości` },
          { label: 'Double-texty', value: '1 721', color: C.blue, sub: `${P.a}: 4.7/dzień` },
          { label: 'Nocne (22-6)', value: '43%', color: C.amber, sub: `${P.a}: eseje po 3 w nocy` },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 6 — AI summary banner */}
      <div className="rounded-xl px-5 py-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.08))' }}>
        <p className="text-center text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-500">AI WYKRYŁO: </span>
          {`współuzależnienie (${P.a}) + unikanie (${P.b}). Health Score: `}
          <span className="font-mono font-bold text-red-500">34/100</span>
          {' '}— pacjent wymaga natychmiastowej interwencji terapeutycznej.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 2: PROFILE OSOBOWOŚCI
// ═══════════════════════════════════════════════════════════

function SlidePersonalities() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
      {/* Ania's personality card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white">
            A
          </div>
          <div>
            <span
              className="font-display text-[15px] font-bold"
              style={{ color: C.blue }}
            >
              {P.a}
            </span>
            <p className="font-mono text-xs text-muted-foreground">
              ENFJ &middot; &quot;Protagonistka&quot;
            </p>
          </div>
          <span className="ml-auto rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-500">
            &quot;Empatyczna Kontrolerka&quot;
          </span>
        </div>

        <RadarChart
          data={[
            { label: 'O', value: 78 },
            { label: 'C', value: 82 },
            { label: 'E', value: 91 },
            { label: 'A', value: 85 },
            { label: 'N', value: 67 },
          ]}
          color={C.blue}
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Przywiązanie
            </span>
            <p className="text-sm font-medium" style={{ color: C.blue }}>
              Lękowo-ambiwalentny
            </p>
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Język miłości
            </span>
            <p className="text-sm font-medium" style={{ color: C.pink }}>
              Wspólny czas
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Empatyczna', 'Bezpośrednia', 'Kontrolująca', 'Nocna marka'].map(
            (t) => (
              <span
                key={t}
                className="rounded-md px-2 py-0.5 font-mono text-[11px] font-medium"
                style={{ background: `${C.blue}18`, color: C.blue }}
              >
                {t}
              </span>
            )
          )}
        </div>

        <div className="mt-3 rounded-lg bg-blue-500/5 px-3 py-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-400">Głęboki wzorzec</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Lęk przed odrzuceniem &rarr; kontrola przez nadmierną komunikację. Pisze eseje o 3 w nocy żeby nie czuć ciszy.
          </p>
        </div>
        <div className="mt-2 rounded-lg bg-amber-500/5 px-3 py-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-500">Styl konfliktu</p>
          <p className="mt-1 text-xs text-muted-foreground">Eskalacja &rarr; pursuit &rarr; double-text &rarr; pretensje</p>
        </div>
      </div>

      {/* Kuba's personality card */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-bold text-white">
            K
          </div>
          <div>
            <span
              className="font-display text-[15px] font-bold"
              style={{ color: C.purple }}
            >
              {P.b}
            </span>
            <p className="font-mono text-xs text-muted-foreground">
              INTP &middot; &quot;Logik&quot;
            </p>
          </div>
          <span className="ml-auto rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-500">
            &quot;Emocjonalny Kaktus&quot;
          </span>
        </div>

        <RadarChart
          data={[
            { label: 'O', value: 85 },
            { label: 'C', value: 42 },
            { label: 'E', value: 31 },
            { label: 'A', value: 56 },
            { label: 'N', value: 48 },
          ]}
          color={C.purple}
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Przywiązanie
            </span>
            <p className="text-sm font-medium" style={{ color: C.purple }}>
              Unikający
            </p>
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Język miłości
            </span>
            <p className="text-sm font-medium" style={{ color: C.pink }}>
              Akty służby
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {['Analityczny', 'Powściągliwy', 'Sarkastyczny', 'Ghostujący'].map(
            (t) => (
              <span
                key={t}
                className="rounded-md px-2 py-0.5 font-mono text-[11px] font-medium"
                style={{ background: `${C.purple}18`, color: C.purple }}
              >
                {t}
              </span>
            )
          )}
        </div>

        <div className="mt-3 rounded-lg bg-purple-500/5 px-3 py-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400">Głęboki wzorzec</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Unikanie intymności &rarr; dystans przez monosylaby. &quot;ok&quot; to jego tarcza przed emocjami.
          </p>
        </div>
        <div className="mt-2 rounded-lg bg-amber-500/5 px-3 py-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-500">Styl konfliktu</p>
          <p className="mt-1 text-xs text-muted-foreground">Stonewalling &rarr; ghost &rarr; &quot;spoko&quot; &rarr; zapomnienie</p>
        </div>
      </div>
    </div>

      {/* Dynamika interpersonalna — 3 metryki */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Balans emocjonalny', value: '18/100', color: C.red, sub: 'Ania daje 82%, Kuba 18%' },
          { label: 'Wzajemność', value: '35/100', color: C.red, sub: 'Asymetria komunikacyjna 460×' },
          { label: 'Kompatybilność', value: '28/100', color: C.red, sub: 'anxious + avoidant = katastrofa' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
            <p className="font-mono text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
            <span className="text-[11px] text-muted-foreground">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Key behavioral patterns */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Double-texty', value: '4.7/d', color: C.blue },
          { label: '"ok" count', value: '312×', color: C.purple },
          { label: 'Max ghost', value: '23h', color: C.red },
          { label: 'Asymetria odp.', value: '460×', color: C.amber },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pursue-withdraw loop */}
      <div className="rounded-xl px-4 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(168,85,247,0.06))' }}>
        <p className="text-center text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-400">PĘTLA: </span>
          {`Im bardziej ${P.a} goni (4.7 double-text/d), tym bardziej ${P.b} ucieka (23h ghost). Bez interwencji: eskalacja w 3-6 mies.`}
        </p>
      </div>

      {/* Summary banner */}
      <div className="rounded-xl px-5 py-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(168,85,247,0.08))' }}>
        <p className="text-center text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-400">WERDYKT AI: </span>
          Protagonistka ENFJ + Logik INTP = podręcznikowy anxious-avoidant trap. Ona kompensuje brak kontroli nadmierną komunikacją. On kompensuje brak empatii monosylabami.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 3: MBTI BATTLE + JĘZYKI MIŁOŚCI
// ═══════════════════════════════════════════════════════════

function SlideMBTI() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
      {/* Left — MBTI Battle */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Starcie typów MBTI
        </span>

        <div className="my-4 flex items-center justify-between">
          <div className="text-center">
            <p
              className="font-display text-3xl font-black"
              style={{ color: C.blue }}
            >
              ENFJ
            </p>
            <p className="text-sm text-muted-foreground">{P.a}</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/20 text-2xl">
            &#x2694;&#xFE0F;
          </div>
          <div className="text-center">
            <p
              className="font-display text-3xl font-black"
              style={{ color: C.purple }}
            >
              INTP
            </p>
            <p className="text-sm text-muted-foreground">{P.b}</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { l: 'Ekstrawersja / Introwersja', a: 91, b: 31 },
            { l: 'Intuicja / Obserwacja', a: 78, b: 85 },
            { l: 'Odczuwanie / Myślenie', a: 85, b: 88 },
            { l: 'Osądzanie / Percepcja', a: 82, b: 38 },
          ].map((d) => (
            <div key={d.l}>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="font-mono text-sm font-medium"
                  style={{ color: C.blue }}
                >
                  {d.a}
                </span>
                <span className="text-sm text-muted-foreground">{d.l}</span>
                <span
                  className="font-mono text-sm font-medium"
                  style={{ color: C.purple }}
                >
                  {d.b}
                </span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${d.a}%` }}
                />
                <div className="h-full flex-1 bg-purple-500" />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-sm italic text-amber-500">
          &quot;Ona czuje za dwoje. On nie czuje wcale. Idealna katastrofa.&quot;
        </p>
      </div>

      {/* Right — Love Languages */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Języki miłości
        </span>

        <div className="mt-4 space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-500" />
              <span
                className="text-sm font-bold"
                style={{ color: C.blue }}
              >
                {P.a}
              </span>
            </div>
            <MiniBar label="Wspólny czas" value={87} color={C.pink} />
            <MiniBar label="Słowa uznania" value={72} color={C.pink} />
            <MiniBar label="Dotyk fizyczny" value={45} color={C.pink} />
            <p className="mt-1 text-sm italic text-muted-foreground">
              &quot;pisze eseje miłosne o 3 w nocy&quot;
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-purple-500" />
              <span
                className="text-sm font-bold"
                style={{ color: C.purple }}
              >
                {P.b}
              </span>
            </div>
            <MiniBar label="Akty służby" value={62} color={C.pink} />
            <MiniBar label="Dotyk fizyczny" value={51} color={C.pink} />
            <MiniBar label="Słowa uznania" value={28} color={C.pink} />
            <p className="mt-1 text-sm italic text-muted-foreground">
              &quot;ale głównie wysyłanie memów o 2 w nocy&quot;
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center">
          <p className="font-mono text-sm font-bold text-red-400">
            &#x26A0;&#xFE0F; ROZBIEŻNOŚĆ: 71% — mówicie innymi językami (dosłownie)
          </p>
        </div>
      </div>

      {/* Bottom row — Compatibility prognosis */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Komunikacja', value: 28, color: C.red, level: 'krytyczna' },
          { label: 'Emocje', value: 15, color: C.red, level: 'jednostronna' },
          { label: 'Wartości', value: 61, color: C.amber, level: 'jedyna nadzieja' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
            <p className="font-mono text-xl font-bold" style={{ color: m.color }}>{m.value}/100</p>
            <span className="text-[11px] text-muted-foreground">{m.level}</span>
          </div>
        ))}
      </div>

      {/* Pursuit-withdrawal pattern */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
        <p className="text-center text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-500">PUŁAPKA POGONI-UCIECZKI: </span>
          ENFJ + INTP = klasyczny wzorzec anxious-avoidant. {P.a} goni, {P.b} ucieka, oboje cierpią. Im bardziej ona naciska, tym bardziej on się wycofuje.
        </p>
      </div>

      {/* Cognitive functions clash */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">Zderzenie funkcji kognitywnych</span>
        <div className="mt-3 space-y-2">
          {[
            { fn: 'Fe vs Ti', clash: `${P.a} czuje za dwoje (Fe dominujący). ${P.b} analizuje emocje jak arkusz kalkulacyjny (Ti dominujący). Ona mówi "czuję że...", on odpowiada "ale logicznie...".`, color: C.pink },
            { fn: 'Ni vs Ne', clash: `${P.a} ma wizję przyszłości relacji (Ni). ${P.b} widzi 47 możliwości, w tym "a może nie" (Ne). Ona planuje ślub, on planuje ucieczkę.`, color: C.cyan },
            { fn: 'Se vs Si', clash: `${P.a} chce TU i TERAZ — stąd 3s odpowiedzi (Se inferior). ${P.b} żyje w archiwum starych memów (Si tertiary). Różne wymiary czasowe.`, color: C.amber },
          ].map((c, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
              <span className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold" style={{ background: `${c.color}18`, color: c.color }}>{c.fn}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.clash}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 4: VERSUS + COMPATIBILITY + GHOST FORECAST
// ═══════════════════════════════════════════════════════════

function SlideVersus() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
      {/* Left — Bitwa danych */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-display text-[15px] font-bold">Bitwa danych</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-sm">
              <span className="size-2 rounded-full bg-blue-500" />
              <span style={{ color: C.blue }}>{P.a}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-sm">
              <span className="size-2 rounded-full bg-purple-500" />
              <span style={{ color: C.purple }}>{P.b}</span>
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <SplitBar label="Pisze więcej" left={65} right={35} />
          <SplitBar label="Ghostuje" left={12} right={88} />
          <SplitBar label="Zaczyna rozmowy" left={67} right={33} />
          <SplitBar label="Dłuższe wiadomości" left={81} right={19} />
          <SplitBar label="Bardziej emocjonalny" left={78} right={22} />
          <SplitBar label="Nocne wiadomości" left={78} right={22} />
        </div>
      </div>

      {/* Right — stacked: Dopasowanie + Ghost Forecast */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Dopasowanie */}
        <div className="flex-1 rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="font-display text-[15px] font-bold">Dopasowanie</span>
          <div className="mt-3 flex items-center justify-center gap-6">
            <GaugeRing value={28} size={100} color={C.red} />
            <div className="space-y-2">
              <p className="text-sm italic" style={{ color: C.red }}>
                &quot;28/100 — to nie kompatybilność. To wypadek drogowy.&quot;
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zainteresowanie {P.a}</span>
                <span className="font-mono font-bold" style={{ color: C.blue }}>87%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Zainteresowanie {P.b}</span>
                <span className="font-mono font-bold" style={{ color: C.purple }}>54%</span>
              </div>
              <div className="rounded-md bg-amber-500/10 px-3 py-1 text-center">
                <p className="font-mono text-sm font-bold text-amber-500">
                  &#x26A0;&#xFE0F; ASYMETRIA: 33 pkt
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ghost Forecast */}
        <div className="flex-1 rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="font-display text-[15px] font-bold">Ghost Forecast</span>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
              <span className="text-xl">&#x26C8;&#xFE0F;</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-400">{P.b}</p>
                <p className="font-mono text-xs text-muted-foreground">BURZA GHOSTINGOWA</p>
              </div>
              <span className="font-mono text-xl font-black text-red-500">67%</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5">
              <span className="text-xl">&#x2600;&#xFE0F;</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-400">{P.a}</p>
                <p className="font-mono text-xs text-muted-foreground">BEZPIECZNA</p>
              </div>
              <span className="font-mono text-xl font-black text-green-500">12%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Bottom row — Personal records */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-bold" style={{ color: C.blue }}>Rekordy {P.a}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-blue-500/5 px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-blue-400">0.8s</p>
              <p className="text-[10px] text-muted-foreground">Najszybsza odp</p>
            </div>
            <div className="rounded-lg bg-blue-500/5 px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-blue-400">847</p>
              <p className="text-[10px] text-muted-foreground">Najdłuższa wiad (zn)</p>
            </div>
            <div className="rounded-lg bg-blue-500/5 px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-blue-400">12</p>
              <p className="text-[10px] text-muted-foreground">Double-texty (rekord)</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-purple-500" />
            <span className="text-sm font-bold" style={{ color: C.purple }}>Rekordy {P.b}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-purple-500/5 px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-purple-400">23h</p>
              <p className="text-[10px] text-muted-foreground">Najwolniejsza odp</p>
            </div>
            <div className="rounded-lg bg-purple-500/5 px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-purple-400">&quot;k&quot;</p>
              <p className="text-[10px] text-muted-foreground">Najkrótsza wiad</p>
            </div>
            <div className="rounded-lg bg-purple-500/5 px-2 py-1.5 text-center">
              <p className="font-mono text-sm font-bold text-purple-400">7</p>
              <p className="text-[10px] text-muted-foreground">Seria &quot;ok&quot; z rzędu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toksyczna dynamika */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">Toksyczna dynamika</span>
        <div className="mt-3 space-y-2">
          {[
            { icon: '🔄', label: 'Pursuit-Withdrawal', desc: `${P.a} goni → ${P.b} ucieka → ${P.a} panikuje → ${P.b} ghostuje. Cykl: 3-5 dni.` },
            { icon: '⚖️', label: 'Power Imbalance', desc: `${P.a} inwestuje 82% energii emocjonalnej. ${P.b}: 18%. Stosunek 4.5:1.` },
          ].map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <span className="mt-0.5 text-base">{p.icon}</span>
              <div>
                <span className="text-sm font-bold text-foreground/90">{p.label}</span>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asymmetry warning */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold text-red-400">&#x26A0;&#xFE0F; ASYMETRIA ZAINTERESOWANIA: 33 pkt </span>
          — granica rozstania: 40 pkt. Wasza relacja jest 7 punktów od krawędzi.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 5: RED FLAGS + NAGRODY SPECJALNE
// ═══════════════════════════════════════════════════════════

function SlideRedFlags() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
      {/* Left — Raport tajny */}
      <div className="relative rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl opacity-[0.03]">
          <span className="rotate-[-15deg] font-mono text-7xl font-black text-red-500 select-none">
            TAJNE
          </span>
        </div>

        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-[15px] font-bold">Raport tajny 🚩</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-xs font-bold text-red-400">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
              </span>
              <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-xs font-bold text-red-400">
                4 WYKRYTE
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { text: `${P.b} odpowiada 'ok' na wiadomości powyżej 200 słów`, sev: 'KRYTYCZNY', color: C.red },
              { text: `${P.a}: 4.7 double-texty dziennie — nowy rekord powiatowy`, sev: 'POWAŻNY', color: C.orange },
              { text: `67% rozmów inicjuje ${P.a} — ${P.b} czeka na pisemne zaproszenie`, sev: 'POWAŻNY', color: C.orange },
              { text: `${P.b} znika w piątek wieczorem — piątkowa tradycja ghostingu`, sev: 'KRYTYCZNY', color: C.red },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2.5"
              >
                <span className="mt-0.5 text-base">🚩</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{f.text}</p>
                  <span
                    className="mt-1 inline-block font-mono text-xs font-bold"
                    style={{ color: f.color }}
                  >
                    {f.sev}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Nagrody specjalne */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <span className="font-display text-[15px] font-bold">Nagrody specjalne 🏆</span>
        </div>
        <div className="space-y-3">
          {[
            { emoji: '🥇👻', title: 'Mistrz Ghostingu', who: P.b, detail: '23h bez odp. na "kocham cię"' },
            { emoji: '🥈📱', title: 'Królowa Double-Textu', who: P.a, detail: '4.7 dziennie — N:67 w akcji' },
            { emoji: '🥉🦉', title: 'Nocna Marka', who: P.a, detail: '43% wiadomości po 22:00' },
            { emoji: '🏅🧊', title: 'Lodowa Odpowiedź', who: P.b, detail: '"ok" 312× — C:42 nie pozwala na więcej' },
            { emoji: '🏅⚡', title: 'Speed Demon', who: P.a, detail: 'Mediana 3s — E:91 nie potrafi czekać' },
          ].map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-3"
            >
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: C.amber }}>
                  {a.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground">{a.who}</span> — {a.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* Green flags — balans */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold text-green-400">Green flags 🟢</span>
        <div className="mt-3 space-y-2">
          {[
            { text: `${P.a}: konsekwentnie zaangażowana, empatyczna (A:85), inicjuje naprawy`, who: P.a, color: C.blue },
            { text: `${P.b}: stabilny emocjonalnie (N:48), lojalny — nigdy nie zghostował na stałe`, who: P.b, color: C.purple },
            { text: `Oboje: 47 dni nieprzerwanej serii — potrafią się trzymać mimo wszystko`, who: 'Oboje', color: C.green },
          ].map((g, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-green-500/5 px-3 py-2">
              <span className="mt-0.5">🟢</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{g.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Threat meters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Ghost Risk', value: '67%', color: C.red },
          { label: 'Codependency', value: '78%', color: C.red },
          { label: 'Manipulation', value: '23%', color: C.green },
          { label: 'Trust Index', value: '31%', color: C.amber },
        ].map((t, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: t.color }}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Summary banner */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold text-red-400">OCENA RYZYKA: </span>
          4 red flags, 3 green flags. Bilans: -1. Trend: spadkowy od 6 tygodni. Prognoza: terapia lub rozstanie w Q1 2025.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 6: ROAST 🔥
// ═══════════════════════════════════════════════════════════

function SlideRoast() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Verdict */}
      <div
        className="rounded-xl px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.08))',
        }}
      >
        <p className="text-center text-base italic leading-relaxed text-foreground/90">
          &quot;To nie jest relacja, to eksperyment społeczny o tytule &apos;Ile
          gaslightingu wytrzyma osoba z lękowym przywiązaniem, zanim uzna to za
          głęboką rozmowę o życiu&apos;.&quot;
        </p>
      </div>

      {/* 2-col Roasts */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {/* Ania */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-display text-[15px] font-bold" style={{ color: C.blue }}>
              {P.a}
            </span>
          </div>
          <div className="space-y-3">
            {[
              `Twoja ugodowość na poziomie 85/100 to nie jest 'empatia', to po prostu bycie emocjonalną wycieraczką, która zgodzi się na wszystko, byle ktoś odpisał w 3 sekundy.`,
              `Piszesz 'dobranoc' o 23:00 i 'dlaczego nie odpisujesz' o 23:04. Twoja cierpliwość ma okres półtrwania krótszy niż izotopy uranu. To nie jest troska — to emocjonalny terroryzm.`,
              `Wysyłasz 1 721 double-textów i potem zgrywasz niedostępną intelektualistkę. Twój styl przywiązania to nie 'lękowo-ambiwalentny', to 'stalking z kompleksem boga'.`,
              `Twój neurotyzm 67/100 sprawia, że każda nieodesłana wiadomość to katastrofa na skalę Titanica. Przynajmniej Titanic zatonął raz — Ty toniesz 4.7 razy dziennie.`,
            ].map((r, i) => (
              <div
                key={i}
                className="rounded-lg border-l-2 border-orange-500 bg-orange-500/5 px-4 py-3"
              >
                <p className="text-sm leading-relaxed">&quot;{r}&quot;</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kuba */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-display text-[15px] font-bold" style={{ color: C.purple }}>
              {P.b}
            </span>
          </div>
          <div className="space-y-3">
            {[
              `Twój styl komunikacji to 'error 404 — feelings not found'. Lingwiści z Oxfordu napisali paper o Twoim 'ok'. Recenzja: 'fascynujący regres'.`,
              `Odpowiadasz po 23 minutach, a ${P.a} po 3 sekundach. Ta asymetria narusza prawa termodynamiki i ludzkiej godności jednocześnie.`,
              `'Ok' pojawia się 312 razy w historii czatu. To więcej niż całe Twoje słownictwo emocjonalne — i nie, emoji się nie liczą.`,
              `Twoja sumienność 42/100 i ekstrawersja 31/100 tworzą combo 'Człowiek-Który-Nie-Próbuje'. Twoje życie emocjonalne to nieustanny odcinek 'Trudnych Spraw', w którym ${P.a} gra reżysera i kata.`,
            ].map((r, i) => (
              <div
                key={i}
                className="rounded-lg border-l-2 border-orange-500 bg-orange-500/5 px-4 py-3"
              >
                <p className="text-sm leading-relaxed">&quot;{r}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-col Superlatives */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { title: 'STALKING Z KOMPLEKSEM BOGA', who: P.a, desc: 'Ugodowość 85/100 + 4.7 double-textów/dzień — lękowo-ambiwalentny styl: obsesja' },
          { title: 'ERROR 404: FEELINGS NOT FOUND', who: P.b, desc: 'Sumienność 42/100 + "ok" 312× — Oxford napisał paper o jego regresie' },
          { title: 'EKSPERYMENT SPOŁECZNY ROKU', who: 'Oboje', desc: 'Health Score 34/100 — współuzależnienie spotyka unikanie na stacji "Brak Terapii"' },
        ].map((s, i) => (
          <div
            key={i}
            className="flex h-full items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
          >
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-sm font-bold" style={{ color: C.amber }}>
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.who} — {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Kluczowe cytaty z roastu */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-400">BEST OF {P.a}</p>
          <p className="mt-1 text-xs italic text-foreground/70">&quot;Twoja cierpliwość ma okres półtrwania krótszy niż izotopy uranu.&quot;</p>
        </div>
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-400">BEST OF {P.b}</p>
          <p className="mt-1 text-xs italic text-foreground/70">&quot;Lingwiści z Oxfordu napisali paper o Twoim &apos;ok&apos;. Recenzja: fascynujący regres.&quot;</p>
        </div>
      </div>

      {/* Roast relacji */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
        <p className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-red-400">Roast relacji</p>
        <p className="text-sm leading-relaxed text-foreground/80">
          Ta relacja ma Health Score 34/100, co w skali medycznej oznacza, że pacjent nie żyje.
          Wasza dynamika to podręcznikowy przykład współuzależnienia, gdzie jedna osoba karmi się
          kontrolą, a druga strachem przed odrzuceniem. To po prostu dwa wraki pociągów, które
          zderzyły się na stacji &quot;Brak Terapii&quot; i boją się wezwać pomoc.
        </p>
      </div>

      {/* Damage Report */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Emocjonalne szkody', value: '89%', color: C.red },
          { label: 'Styl komunikacji', value: 'F', color: C.red },
          { label: 'Potencjał naprawy', value: '12%', color: C.amber },
          { label: 'Potrzebna terapia', value: 'TAK', color: C.red },
        ].map((d, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{d.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: d.color }}>{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 7: SĄD + PROFILE RANDKOWE
// ═══════════════════════════════════════════════════════════

function SlideCourtDating() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      {/* Col 1 — Court verdict */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 text-center">
          <p className="text-2xl">⚖️</p>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber-500">
            SĄD OKRĘGOWY DS. EMOCJONALNYCH
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            SPRAWA NR PT-2026/42069
          </p>
        </div>

        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center">
          <p className="text-sm font-bold">{P.b}</p>
          <p className="font-mono text-lg font-black text-red-500">WINNY</p>
        </div>

        <div className="space-y-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-muted-foreground">
              Zarzut
            </p>
            <p className="text-sm">
              &quot;Emocjonalne zaniedbanie I stopnia z premedytacją ghostingową&quot;
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase text-muted-foreground">
              Dowody
            </p>
            <p className="text-sm text-muted-foreground">
              312&times; &quot;ok&quot;, 23h max ghost, odpowiedź 23min vs 3s
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase text-muted-foreground">
              Wyrok
            </p>
            <p className="text-sm">
              &quot;3 miesiące obowiązkowego pisania pełnych zdań + zakaz monosylab&quot;
            </p>
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase text-muted-foreground">
              Reakcja oskarżonego
            </p>
            <p className="text-sm italic text-muted-foreground">
              &quot;ok&quot;
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-sm italic text-muted-foreground">
          Sędzia: &quot;To jest dokładnie to, o czym mówię.&quot;
        </p>
      </div>

      {/* Col 2 — Dating profile Ania */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-sm font-bold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: C.pink }}>
              {P.a}, 24
            </p>
            <p className="text-xs text-muted-foreground">2 km stąd</p>
          </div>
        </div>

        <p className="mb-3 rounded-lg bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm italic">
          &quot;Szukam kogoś kto odpisze w &lt;4 min — tak, patrzę na ciebie {P.b}&quot;
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            { l: 'Śr. odpowiedź', v: '4m 23s' },
            { l: 'Inicjacja', v: '67%' },
            { l: 'Double-text/dz', v: '4.7' },
            { l: 'Wiad. nocne', v: '43%' },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg bg-pink-500/5 px-2 py-1.5 text-center"
            >
              <p className="font-mono text-sm font-bold text-pink-400">
                {s.v}
              </p>
              <p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-red-500/5 px-2 py-1.5">
            <p className="text-xs font-bold text-red-400">🚩 Red flags</p>
            <p className="text-xs text-muted-foreground">Kontrolująca, double-text</p>
          </div>
          <div className="flex-1 rounded-lg bg-green-500/5 px-2 py-1.5">
            <p className="text-xs font-bold text-green-400">🟢 Green flags</p>
            <p className="text-xs text-muted-foreground">Empatyczna, zaangażowana</p>
          </div>
        </div>
      </div>

      {/* Col 3 — Dating profile Kuba */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-bold text-white">
            K
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: C.purple }}>
              {P.b}, 25
            </p>
            <p className="text-xs text-muted-foreground">5 km stąd</p>
          </div>
        </div>

        <p className="mb-3 rounded-lg bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm italic">
          &quot;Odpisuję kiedy chcę (czyli rzadko). Love language: ignorowanie wiadomości&quot;
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            { l: 'Śr. odpowiedź', v: '23 min' },
            { l: 'Inicjacja', v: '33%' },
            { l: '"ok" udział', v: '31%' },
            { l: 'Max ghost', v: '23h' },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg bg-purple-500/5 px-2 py-1.5 text-center"
            >
              <p className="font-mono text-sm font-bold text-purple-400">
                {s.v}
              </p>
              <p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-red-500/5 px-2 py-1.5">
            <p className="text-xs font-bold text-red-400">🚩 Red flags</p>
            <p className="text-xs text-muted-foreground">Ghost king, monosylaby</p>
          </div>
          <div className="flex-1 rounded-lg bg-green-500/5 px-2 py-1.5">
            <p className="text-xs font-bold text-green-400">🟢 Green flags</p>
            <p className="text-xs text-muted-foreground">Inteligentny, niezależny</p>
          </div>
        </div>
      </div>
    </div>
      {/* Bottom row — Trial highlights */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Główny zarzut', value: 'Ghosting I°', color: C.red, sub: 'z premedytacją' },
          { label: 'Dowody', value: '312× "ok"', color: C.amber, sub: '+ 23h max cisza' },
          { label: 'Wyrok', value: 'WINNY', color: C.red, sub: '3 mies. pełnych zdań' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
            <p className="font-mono text-lg font-bold" style={{ color: m.color }}>{m.value}</p>
            <span className="text-[11px] text-muted-foreground">{m.sub}</span>
          </div>
        ))}
      </div>

      {/* Randkowy profil — porównanie */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Ania odpowiedź', value: '3s', color: C.blue },
          { label: 'Kuba odpowiedź', value: '23min', color: C.purple },
          { label: 'Asymetria', value: '460×', color: C.red },
          { label: 'Interest gap', value: '33 pkt', color: C.amber },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Match Score + Therapist needed */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Match Score', value: '23%', color: C.red },
          { label: 'Komunikacja', value: 'F', color: C.red },
          { label: 'Kompatybilność', value: '28/100', color: C.red },
          { label: 'Terapia par', value: 'PILNA', color: C.amber },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Verdict banner */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold text-red-400">WYROK SĄDU: </span>
          {P.b} — winny emocjonalnego zaniedbania I stopnia. {P.a} — współwinna za współuzależnienie. Oboje skazani na terapię par.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 8: SUBTEXT + SIMULATOR + DELUSION
// ═══════════════════════════════════════════════════════════

function SlideInteractive() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      {/* Col 1 — Translator podtekstów */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <span className="font-display text-[15px] font-bold">
            Translator podtekstów
          </span>
        </div>

        <div className="space-y-3">
          {[
            { msg: 'Okej, nie musisz odpowiadać', real: 'Odpowiedz natychmiast bo będzie III wojna', dot: 'bg-red-500' },
            { msg: 'Spoko, jak chcesz', real: 'Nie jest spoko i nie chcę ale nie umiem powiedzieć', dot: 'bg-amber-500' },
            { msg: 'Haha dobra', real: 'Wcale nie jest mi do śmiechu', dot: 'bg-purple-500' },
          ].map((d, i) => (
            <div
              key={i}
              className="rounded-lg border border-purple-500/10 bg-purple-500/5 px-3 py-2.5"
            >
              <p className="text-sm text-muted-foreground">
                &quot;{d.msg}&quot;
              </p>
              <div className="mt-1.5 flex items-start gap-2">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${d.dot}`} />
                <p className="text-sm font-medium">&quot;{d.real}&quot;</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Col 2 — Symulator odpowiedzi */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <span className="font-display text-[15px] font-bold">
            Symulator odpowiedzi
          </span>
        </div>

        <div className="mb-3 space-y-2">
          <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-blue-500/15 px-3 py-2">
            <p className="text-sm text-blue-300">
              &quot;Co byś powiedział gdybym napisała że tęsknię?&quot;
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Symulowana odpowiedź {P.b}:
          </p>
        </div>

        <div className="space-y-1.5">
          {[
            { text: '😊', pct: 73, color: C.green },
            { text: 'ja też', pct: 18, color: C.blue },
            { text: 'haha', pct: 6, color: C.amber },
            { text: '[zobaczy za 4h]', pct: 3, color: C.red },
          ].map((r) => (
            <div key={r.text} className="flex items-center gap-2">
              <div className="max-w-[70%] rounded-xl rounded-bl-sm bg-purple-500/15 px-3 py-1.5">
                <p className="text-sm text-purple-300">{r.text}</p>
              </div>
              <span
                className="ml-auto font-mono text-sm font-bold"
                style={{ color: r.color }}
              >
                {r.pct}%
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg bg-amber-500/5 px-3 py-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-500">
            Analiza AI
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Na podstawie E:31 i C:42 — {P.b} odpowiada emoji w 73% bo
            wymaga to minimum wysiłku emocjonalnego. Szansa na pełne
            zdanie: 18%. Szansa na ghost: 3%.
          </p>
        </div>
      </div>

      {/* Col 3 — Test samoświadomości */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <span className="font-display text-[15px] font-bold">
            Test samoświadomości
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <GaugeRing value={71} size={100} color={C.orange} thickness={5} />
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Delusion Index
            </p>
            <p className="font-mono text-sm font-bold text-orange-500">
              MOCNO ZDELUDED
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {[
            { q: 'Jak szybko Kuba odpowiada?', guess: '5-10 min', real: '23 min' },
            { q: 'Ile % rozmów inicjuje Ania?', guess: '50/50', real: '67%' },
            { q: 'Ile razy Kuba napisał "ok"?', guess: '~50', real: '312×' },
          ].map((q, i) => (
            <div
              key={i}
              className="rounded-lg bg-[rgba(255,255,255,0.03)] px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">
                &quot;{q.q}&quot;
              </p>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-sm">
                  Ania: &quot;{q.guess}&quot;{' '}
                  <span className="text-red-400">&#x2717;</span>
                </span>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: C.green }}
                >
                  Realnie: {q.real} &#x2713;
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
          5/15 trafień
        </p>
      </div>
    </div>

      {/* Bottom row — Przykładowe cytaty + AI accuracy */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400">PODTEKST #4</p>
          <p className="mt-2 text-sm text-muted-foreground">&quot;Nie no, luz, rób co chcesz&quot;</p>
          <div className="mt-1.5 flex items-start gap-2">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-red-500" />
            <p className="text-sm font-medium">&quot;Właśnie straciłeś 3 tygodnie zaufania&quot;</p>
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">Confidence: 94% &middot; Pattern: passive-aggressive</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-500">SYMULACJA #2</p>
          <div className="mt-2 rounded-lg bg-blue-500/10 px-3 py-2">
            <p className="text-sm text-blue-300">&quot;Muszę ci coś powiedzieć...&quot;</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Symulowana odpowiedź {P.b}:</p>
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between"><span className="text-sm">&quot;?&quot;</span><span className="font-mono text-xs text-green-400">41%</span></div>
            <div className="flex items-center justify-between"><span className="text-sm">&quot;ok mów&quot;</span><span className="font-mono text-xs text-blue-400">29%</span></div>
            <div className="flex items-center justify-between"><span className="text-sm">[seen]</span><span className="font-mono text-xs text-red-400">30%</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-400">DELUSION BREAKDOWN</p>
          <div className="mt-2 space-y-1.5">
            {[
              { q: 'Kuba mnie kocha', score: 'Dane: 47× vs 312× ok', color: C.red },
              { q: 'To się poprawi', score: 'Trend: -12% / miesiąc', color: C.red },
              { q: 'On jest po prostu zajęty', score: '23h ghost ≠ zajęty', color: C.amber },
            ].map((d, i) => (
              <div key={i} className="rounded-lg bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
                <p className="text-xs">&quot;{d.q}&quot;</p>
                <p className="font-mono text-[10px] font-bold" style={{ color: d.color }}>{d.score}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-orange-400">Delusion Index: 71/100</p>
        </div>
      </div>

      {/* Interactive features stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Podteksty', value: '47', sub: 'ukrytych znaczeń', color: C.purple },
          { label: 'Symulacje', value: '89%', sub: 'accuracy', color: C.green },
          { label: 'Delusion Index', value: '71/100', sub: 'mocno zdeluded', color: C.orange },
          { label: 'Pytań quiz', value: '15', sub: '5 trafień', color: C.red },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* AI accuracy banner */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-5 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-400">PRECYZJA AI: </span>
          Translator podtekstów: 89% accuracy. Symulator odpowiedzi: 73% match z rzeczywistymi odpowiedziami. Delusion Index: korelacja 0.84 z testem klinicznym.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 9: STAND-UP + BADGES + CPS
// ═══════════════════════════════════════════════════════════

function SlideStandUpBadges() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      {/* Col 1 — Stand-Up Comedy Roast preview */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 text-center">
          <span className="text-3xl">🎤</span>
        </div>
        <p className="mb-2 text-center font-display text-[15px] font-bold">
          Stand-Up Comedy Roast
        </p>
        <p className="mb-3 text-center font-mono text-xs text-muted-foreground">
          7 aktów &middot; 12 stron PDF
        </p>

        <div className="rounded-lg bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="text-sm italic leading-relaxed">
            &quot;Proszę Państwa, mamy tutaj parę, która redefiniuje
            pojęcie &apos;komunikacja jednostronna&apos;. {P.a} pisze powieści,
            a {P.b} odpowiada emotikonami. To nie jest związek, to serwis
            pocztowy z 67% odrzuceń.&quot;
          </p>
        </div>
        <p className="mt-1 text-center font-mono text-[10px] text-muted-foreground">
          Akt 1 — &quot;Otwarcie&quot;
        </p>

        <div className="mt-2 rounded-lg bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="text-sm italic leading-relaxed">
            &quot;Health Score 34/100 — w szpitalu już by odłączyli
            aparaturę. Ale ta relacja żyje dalej, bo {P.a} regularnie
            stosuje defibrylator w postaci double-textów o 3 w nocy.&quot;
          </p>
        </div>
        <p className="mt-1 text-center font-mono text-[10px] text-muted-foreground">
          Akt 5 — &quot;Diagnoza&quot;
        </p>
      </div>

      {/* Col 2 — Osiągnięcia (badges) */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Osiągnięcia
        </span>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { emoji: '🦉', title: 'Nocna Marka', who: P.a, stat: '43% po 22:00' },
            { emoji: '👻', title: 'Ghost Champion', who: P.b, stat: '23h cisza' },
            { emoji: '💬', title: 'Double Texter', who: P.a, stat: '4.7/dzień' },
            { emoji: '⚡', title: 'Speed Demon', who: P.a, stat: 'mediana 3s' },
            { emoji: '🔁', title: 'Inicjator', who: P.a, stat: '67%' },
            { emoji: '🧊', title: 'Lodowy Książę', who: P.b, stat: '"ok" master' },
          ].map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
            >
              <span className="text-lg">{b.emoji}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{b.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {b.who} &middot; {b.stat}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Col 3 — CPS Communication Pattern Screening */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Wzorce komunikacji
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          63 pytania &middot; 4 wymiary ryzyka
        </p>

        <div className="mt-3 space-y-2.5">
          {[
            { name: 'Kontrola', value: 72, color: C.amber, level: 'podwyższone' },
            { name: 'Unikanie', value: 85, color: C.red, level: 'wysokie' },
            { name: 'Manipulacja', value: 15, color: C.green, level: 'niskie' },
            { name: 'Zależność', value: 58, color: C.amber, level: 'umiarkowane' },
            { name: 'Stonewalling', value: 78, color: C.red, level: 'wysokie' },
            { name: 'Contempt', value: 22, color: C.green, level: 'niskie' },
          ].map((p) => (
            <div key={p.name}>
              <div className="mb-0.5 flex justify-between">
                <span className="text-sm">{p.name}</span>
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: p.color }}
                >
                  {p.value}% &middot; {p.level}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p.value}%`, background: p.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* Bottom row — Top moments + Stand-up highlights */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="font-display text-[15px] font-bold">Najlepsze momenty Stand-Up</span>
          <div className="mt-3 space-y-2">
            {[
              { act: 'Akt 2', quote: `"${P.a} pisze 'dobranoc' o 23:00, a o 23:04 'DLACZEGO NIE ODPISUJESZ'. Cierpliwość? Nie ma jej w DNA z neurotyzmu 67."`, laugh: '94%' },
              { act: 'Akt 7', quote: `"Health Score 34/100. W szpitalu by odłączyli aparaturę. Ale ${P.a} regularnie stosuje defibrylator — wysyła double-texty o 3 w nocy."`, laugh: '91%' },
            ].map((m, i) => (
              <div key={i} className="rounded-lg bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">{m.act}</span>
                  <span className="font-mono text-[10px] text-green-400">Audience: {m.laugh}</span>
                </div>
                <p className="mt-1 text-sm italic leading-relaxed">{m.quote}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="font-display text-[15px] font-bold">CPS — Pełny raport ryzyka</span>
          <div className="mt-3 space-y-2">
            {[
              { pattern: 'Demand-Withdraw', desc: `${P.a} żąda odpowiedzi → ${P.b} się wycofuje → eskalacja`, risk: 85, color: C.red },
              { pattern: 'Emotional Flooding', desc: `${P.a} wysyła 12 wiadomości pod rząd — ${P.b} się zamyka`, risk: 78, color: C.red },
              { pattern: 'Protest Behavior', desc: `Double-texty ${P.a} = protest wobec ghostingu`, risk: 72, color: C.amber },
              { pattern: 'Deactivation', desc: `${P.b}: "ok" = deaktywacja systemu przywiązania`, risk: 81, color: C.red },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[rgba(255,255,255,0.02)] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.pattern}</p>
                  <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                </div>
                <span className="ml-3 shrink-0 font-mono text-sm font-bold" style={{ color: p.color }}>{p.risk}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-500">CPS WYNIK: </span>
          4/6 wymiarów w strefie ryzyka. Gottman Four Horsemen: 2/4 aktywne (Stonewalling + Contempt borderline). Prognoza bez interwencji: rozpad w 8-14 miesięcy.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 10: HEATMAPA + FRAZY + NAJLEPSZY CZAS
// ═══════════════════════════════════════════════════════════

function SlideHeatmapOuter() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <SlideHeatmapInner />

      {/* Bottom row — Emoji analysis + Response time distribution */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="font-display text-[15px] font-bold">Top emoji</span>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-blue-500" />
                <span className="text-sm font-bold" style={{ color: C.blue }}>{P.a}</span>
              </div>
              {[
                { emoji: '❤️', count: 847, pct: '18%' },
                { emoji: '😭', count: 412, pct: '9%' },
                { emoji: '🥺', count: 289, pct: '6%' },
              ].map((e) => (
                <div key={e.emoji} className="flex items-center justify-between py-0.5">
                  <span className="text-sm">{e.emoji} <span className="text-muted-foreground">{e.pct}</span></span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{e.count}&times;</span>
                </div>
              ))}
              <p className="mt-1 text-[10px] italic text-muted-foreground">82% emocje pozytywne/desperacja</p>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-purple-500" />
                <span className="text-sm font-bold" style={{ color: C.purple }}>{P.b}</span>
              </div>
              {[
                { emoji: '👍', count: 423, pct: '31%' },
                { emoji: '😂', count: 198, pct: '14%' },
                { emoji: '🤷', count: 87, pct: '6%' },
              ].map((e) => (
                <div key={e.emoji} className="flex items-center justify-between py-0.5">
                  <span className="text-sm">{e.emoji} <span className="text-muted-foreground">{e.pct}</span></span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{e.count}&times;</span>
                </div>
              ))}
              <p className="mt-1 text-[10px] italic text-muted-foreground">👍 = 31%. Minimum effort maximum laziness</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <span className="font-display text-[15px] font-bold">Rozkład czasu odpowiedzi</span>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" />
                <span className="text-sm font-bold" style={{ color: C.blue }}>{P.a} — mediana 3s</span>
              </div>
              <div className="flex h-6 items-end gap-[2px]">
                {[92, 85, 40, 15, 8, 4, 2, 1, 0, 0].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, background: `rgba(59,130,246,${0.3 + (v / 100) * 0.5})` }} />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground">
                <span>&lt;10s</span><span>1m</span><span>5m</span><span>30m</span><span>1h+</span>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-500" />
                <span className="text-sm font-bold" style={{ color: C.purple }}>{P.b} — mediana 23min</span>
              </div>
              <div className="flex h-6 items-end gap-[2px]">
                {[5, 8, 12, 18, 35, 65, 78, 45, 22, 10].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, background: `rgba(168,85,247,${0.3 + (v / 100) * 0.5})` }} />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground">
                <span>&lt;10s</span><span>1m</span><span>5m</span><span>30m</span><span>1h+</span>
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-md bg-red-500/5 px-2 py-1.5 text-center">
            <p className="font-mono text-[10px] text-red-400">Asymetria 460&times; — {P.a} czeka 0.006% czasu co {P.b}</p>
          </div>
        </div>
      </div>

      {/* Activity breakdown compact */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Wspólne okno', value: '47 min', color: C.amber },
          { label: 'Nocne (22-6)', value: '43%', color: C.purple },
          { label: 'Weekend boost', value: '+34%', color: C.green },
          { label: 'Monologi', value: '67%', color: C.red },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Heatmap insight banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-3 text-center">
        <p className="text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-400">PATTERN: </span>
          {P.a} peak: piątek 22:00 (po winie, N:67 w akcji). {P.b} peak: wtorek 15:00 (w pracy, z nudów). Okno wspólnej aktywności: 47 minut dziennie. Reszta to monolog.
        </p>
      </div>
    </div>
  );
}

function SlideHeatmapInner() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const heatData = days.map((_, di) =>
    hours.map((_, hi) => {
      if (di === 4 && hi >= 22) return 0.85 + (hi % 3) * 0.05;
      if (di === 4 && hi >= 20) return 0.65 + (hi % 2) * 0.05;
      if ((di === 5 || di === 6) && (hi >= 22 || hi <= 1)) return 0.5 + (hi % 3) * 0.1;
      if (hi >= 22 || hi <= 1) return 0.3 + (di % 3) * 0.12;
      if (di < 5 && hi >= 10 && hi <= 14) return 0.2 + (hi % 4) * 0.08;
      if (di === 0 && hi >= 19) return 0.4 + (hi % 2) * 0.1;
      return 0.03 + (di * hi) % 7 * 0.02;
    })
  );

  const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
    const aVal = i >= 22 ? 0.85 : i >= 20 ? 0.7 : i <= 1 ? 0.6 : i >= 10 && i <= 18 ? 0.25 + (i % 3) * 0.05 : 0.08;
    const bVal = i >= 14 && i <= 17 ? 0.65 + (i % 2) * 0.1 : i >= 12 && i <= 13 ? 0.35 : i >= 10 && i <= 11 ? 0.2 : 0.06;
    return { a: aVal, b: bVal };
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      {/* Col 1 — Heatmapa aktywności */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Heatmapa aktywności
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Kiedy rozmawiacie — godziny i dni
        </p>

        <div className="mt-3 overflow-x-auto">
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `36px repeat(${hours.length}, 1fr)` }}
          >
            <div />
            {hours.map((h) => (
              <div
                key={h}
                className="text-center font-mono text-[8px] text-muted-foreground"
              >
                {String(h).padStart(2, '0')}
              </div>
            ))}

            {days.map((day, di) => (
              <Fragment key={di}>
                <div className="flex items-center font-mono text-[10px] text-muted-foreground">
                  {day}
                </div>
                {hours.map((_, hi) => (
                  <div
                    key={hi}
                    className="aspect-square rounded-[2px]"
                    style={{ background: `rgba(59,130,246,${Math.min(0.85, heatData[di][hi])})` }}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">mniej</span>
          <div className="flex items-center gap-[2px]">
            {[0.05, 0.2, 0.4, 0.6, 0.85].map((opacity, i) => (
              <div
                key={i}
                className="size-2.5 rounded-[2px]"
                style={{ background: `rgba(59,130,246,${opacity})` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">więcej</span>
        </div>

        <div className="mt-2 rounded-md bg-blue-500/5 px-2 py-1.5 text-center">
          <p className="font-mono text-[10px] sm:text-[11px] text-blue-400">
            🔥 PEAK: piątek 22:00–01:00 — 247 msg — winko + desperacja
          </p>
        </div>
      </div>

      {/* Col 2 — Ulubione frazy */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Ulubione frazy
        </span>

        <div className="mt-3 space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-bold" style={{ color: C.blue }}>
                {P.a}
              </span>
              <span className="ml-auto rounded-md bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-400">
                TOP 4
              </span>
            </div>
            {[
              { phrase: 'ej', count: 156 },
              { phrase: 'kocham cię', count: 47 },
              { phrase: 'dlaczego nie odpisujesz', count: 31 },
              { phrase: 'dobranoc 💕', count: 28 },
            ].map((f) => (
              <div
                key={f.phrase}
                className="flex items-center justify-between border-b border-border/30 py-1 last:border-0"
              >
                <span className="text-sm text-muted-foreground">
                  &quot;{f.phrase}&quot;
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(60, (f.count / 156) * 60)}px`,
                      background: C.blue,
                      opacity: 0.4,
                    }}
                  />
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {f.count}&times;
                  </span>
                </div>
              </div>
            ))}
            <p className="mt-1 text-[10px] italic text-muted-foreground">
              &quot;ej&quot; = 8% słownictwa. Desperacja w jednym słowie.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-purple-500" />
              <span className="text-sm font-bold" style={{ color: C.purple }}>
                {P.b}
              </span>
              <span className="ml-auto rounded-md bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-400">
                TOP 4
              </span>
            </div>
            {[
              { phrase: 'ok', count: 312 },
              { phrase: 'spoko', count: 189 },
              { phrase: 'haha', count: 97 },
              { phrase: 'nie wiem', count: 84 },
            ].map((f) => (
              <div
                key={f.phrase}
                className="flex items-center justify-between border-b border-border/30 py-1 last:border-0"
              >
                <span className="text-sm text-muted-foreground">
                  &quot;{f.phrase}&quot;
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(60, (f.count / 312) * 60)}px`,
                      background: C.purple,
                      opacity: 0.4,
                    }}
                  />
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {f.count}&times;
                  </span>
                </div>
              </div>
            ))}
            <p className="mt-1 text-[10px] italic text-muted-foreground">
              &quot;ok&quot; + &quot;spoko&quot; = 53% słownictwa. Szekspir płacze.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center">
          <p className="font-mono text-[10px] sm:text-[11px] font-bold text-amber-500">
            📊 SŁOWNICTWO: Ania 4.2&times; bogatsze — Kuba mówi jak bot
          </p>
        </div>
      </div>

      {/* Col 3 — Najlepszy czas na wiadomość */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Najlepszy czas na wiadomość
        </span>

        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              <span className="text-sm font-bold" style={{ color: C.blue }}>
                {P.a}
              </span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold">
              Poniedziałki 22:00–00:00
            </p>
            <p className="text-xs italic text-muted-foreground">
              kiedy desperacja osiąga szczyt
            </p>
          </div>

          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-purple-500" />
              <span className="text-sm font-bold" style={{ color: C.purple }}>
                {P.b}
              </span>
            </div>
            <p className="mt-1 font-mono text-lg font-bold">
              Wtorki 15:00–17:00
            </p>
            <p className="text-xs italic text-muted-foreground">
              kiedy w pracy jest nudno
            </p>
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Aktywność 24h
          </p>
          <div className="flex h-16 items-end gap-[2px]">
            {hourlyActivity.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col gap-[1px]">
                <div
                  className="rounded-t-[1px]"
                  style={{ height: `${h.a * 100}%`, background: C.blue, opacity: 0.7 }}
                />
                <div
                  className="rounded-b-[1px]"
                  style={{ height: `${h.b * 100}%`, background: C.purple, opacity: 0.7 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-0.5 flex justify-between">
            <span className="font-mono text-[8px] text-muted-foreground">00</span>
            <span className="font-mono text-[8px] text-muted-foreground">06</span>
            <span className="font-mono text-[8px] text-muted-foreground">12</span>
            <span className="font-mono text-[8px] text-muted-foreground">18</span>
            <span className="font-mono text-[8px] text-muted-foreground">23</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px]">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">{P.a}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[10px]">
            <span className="size-2 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">{P.b}</span>
          </span>
        </div>

        <div className="mt-2 rounded-md bg-red-500/5 px-2 py-1.5 text-center">
          <p className="font-mono text-[10px] sm:text-[11px] text-red-400">
            ⚠️ Ania pisze gdy Kuba śpi. Kuba pisze gdy Ania pracuje. Tragedia.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 11: WRAPPED + QUIZ + TRAJEKTORIA EMOCJI
// ═══════════════════════════════════════════════════════════

function SlideWrappedOuter() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <SlideWrappedInner />

      {/* Bottom row — Key stats + AI Prediction */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Łączne znaki', value: '847k', color: C.blue },
          { label: 'Reakcje', value: '1 234', color: C.pink },
          { label: 'Usunięte wiad.', value: '23', color: C.amber },
          { label: 'Linki/memy', value: '412', color: C.purple },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* AI Prediction compact */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[15px] font-bold">Prognoza AI</span>
          <span className="font-mono text-xs text-red-400">OSTRZEŻENIE</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { icon: '📉', text: 'Health Score → 21/100 bez interwencji', pct: 87, color: C.red },
            { icon: '👻', text: `${P.b}: ghost >48h w Q1 2025`, pct: 73, color: C.red },
            { icon: '💔', text: 'Spring breakup: marzec-kwiecień', pct: 61, color: C.amber },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.02)] px-3 py-2">
              <span>{p.icon}</span>
              <p className="flex-1 text-xs leading-snug">{p.text}</p>
              <span className="shrink-0 font-mono text-xs font-bold" style={{ color: p.color }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Year milestones — compact row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peak month', value: 'Październik', sub: '2 341 msg', color: C.blue },
          { label: 'Worst month', value: 'Sierpień', sub: '412 msg', color: C.red },
          { label: 'Trend roczny', value: '-18%', sub: 'YoY', color: C.amber },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Ranking comparison */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Top % (ilość msg)', value: 'TOP 3%', color: C.blue },
          { label: 'Top % (odp. czas)', value: 'TOP 1%', color: C.green },
          { label: 'Ghost frequency', value: 'TOP 89%', color: C.red },
          { label: 'Asymetria ogólna', value: 'TOP 97%', color: C.amber },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="font-mono text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Final banner */}
      <div className="rounded-xl px-5 py-3" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.08))' }}>
        <p className="text-center text-sm leading-relaxed">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-400">WRAPPED VERDICT: </span>
          12 847 wiadomości. 423 dni. 1 relacja. Health Score: 34/100. Prognoza: bez terapii, spring breakup w Q1 2025. Ale przynajmniej dane są fascynujące.
        </p>
      </div>
    </div>
  );
}

function SlideWrappedInner() {
  const xPoints = [20, 45, 70, 95, 120, 145, 170, 195, 220, 245, 270];
  const aniaY = [45, 25, 60, 20, 55, 30, 65, 25, 50, 35, 40];
  const aniaLine = xPoints.map((x, i) => `${x},${aniaY[i]}`).join(' ');
  const aniaArea = `M${xPoints.map((x, i) => `${x},${aniaY[i]}`).join(' L')} L270,100 L20,100 Z`;
  const kubaY = [48, 50, 49, 51, 48, 50, 49, 52, 49, 50, 48];
  const kubaLine = xPoints.map((x, i) => `${x},${kubaY[i]}`).join(' ');
  const kubaArea = `M${xPoints.map((x, i) => `${x},${kubaY[i]}`).join(' L')} L270,100 L20,100 Z`;
  const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis'];

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      {/* Col 1 — Wrapped preview */}
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-4 sm:p-5">
        <div
          className="w-48 overflow-hidden rounded-3xl border-2 border-purple-500/20"
          style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0d0d2b 100%)' }}
        >
          <div className="px-4 py-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-purple-400/60">
              Twój 2024 w wiadomościach
            </p>
            <p className="mt-3 font-display text-4xl font-black text-white">
              12 847
            </p>
            <p className="text-xs text-purple-300/60">wiadomości</p>

            <div
              className="mx-auto my-3 h-[1px] w-16"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)' }}
            />

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-purple-300/40">Dni</span>
                <span className="font-mono font-bold text-purple-300">423</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-purple-300/40">Mediana odp.</span>
                <span className="font-mono font-bold text-purple-300">3s ⚡</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-purple-300/40">Double-texty</span>
                <span className="font-mono font-bold text-purple-300">1 721</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-purple-300/40">Ghosty</span>
                <span className="font-mono font-bold text-purple-300">89</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-purple-300/40">Najdłuższa seria</span>
                <span className="font-mono font-bold text-purple-300">47 dni</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-purple-500/10 px-2 py-1.5">
              <p className="font-mono text-[9px] text-purple-300/70">
                Top 3% par pod względem ilości wiadomości. Bottom 3% pod względem odpowiedzi Kuby.
              </p>
            </div>

            <div className="mt-4 flex justify-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="size-1.5 rounded-full"
                  style={{ background: i === 0 ? C.purple : 'rgba(168,85,247,0.2)' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Col 2 — Quiz parowy */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Ile znacie się naprawdę?
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Quiz parowy — 15 pytań
        </p>

        <div className="mt-4 flex justify-center gap-6">
          <div className="text-center">
            <GaugeRing value={38} size={80} color={C.red} thickness={4} />
            <p className="mt-2 text-sm font-bold" style={{ color: C.blue }}>
              {P.a}
            </p>
            <p className="font-mono text-xs text-muted-foreground">38%</p>
          </div>
          <div className="text-center">
            <GaugeRing value={22} size={80} color={C.red} thickness={4} />
            <p className="mt-2 text-sm font-bold" style={{ color: C.purple }}>
              {P.b}
            </p>
            <p className="font-mono text-xs text-muted-foreground">22%</p>
          </div>
        </div>

        <p className="mt-4 text-center text-sm italic text-red-400/80">
          &quot;Losowi przechodnie na ulicy znaliby się lepiej.&quot;
        </p>

        <div className="mt-3 space-y-2">
          {[
            { q: 'Ulubiony emoji Kuby?', who: P.a, guess: 'serduszko', real: 'kciuk w górę' },
            { q: 'O której Ania najczęściej pisze?', who: P.b, guess: '20:00', real: '23:17' },
            { q: 'Ile % rozm. Ania inicjuje?', who: P.b, guess: '50/50', real: '67%' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-lg bg-[rgba(255,255,255,0.03)] px-2.5 py-2"
            >
              <p className="text-[11px] text-muted-foreground">
                &quot;{item.q}&quot;
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px]">
                  {item.who}: &quot;{item.guess}&quot;{' '}
                  <span className="text-red-400">&#x2717;</span>
                </span>
                <span
                  className="ml-auto font-mono text-[11px] font-bold"
                  style={{ color: C.green }}
                >
                  {item.real} &#x2713;
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Trafienia:</span>
          <span className="font-mono text-xs font-bold text-red-400">Ania 5/15</span>
          <span className="text-muted-foreground">&middot;</span>
          <span className="font-mono text-xs font-bold text-red-400">Kuba 3/15</span>
        </div>
      </div>

      {/* Col 3 — Trajektoria emocji */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="font-display text-[15px] font-bold">
          Trajektoria emocji
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Sentyment wiadomości — 12 miesięcy
        </p>

        <svg viewBox="0 0 280 100" className="mt-3 w-full" style={{ maxHeight: 100 }}>
          <line x1="0" y1="50" x2="280" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="4" />
          <line x1="0" y1="25" x2="280" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="75" x2="280" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="2" />
          <text x="2" y="12" fill="#555" fontSize="8" fontFamily="monospace">+0.3</text>
          <text x="2" y="52" fill="#555" fontSize="8" fontFamily="monospace">0.0</text>
          <text x="2" y="95" fill="#555" fontSize="8" fontFamily="monospace">-0.3</text>

          <path d={aniaArea} fill={`${C.blue}14`} />
          <polyline fill="none" stroke={C.blue} strokeWidth="1.5" points={aniaLine} />
          {xPoints.map((x, i) => (
            <circle key={`a-${i}`} cx={x} cy={aniaY[i]} r="2" fill={C.blue} opacity="0.6" />
          ))}

          <path d={kubaArea} fill={`${C.purple}14`} />
          <polyline fill="none" stroke={C.purple} strokeWidth="1.5" points={kubaLine} />
          {xPoints.map((x, i) => (
            <circle key={`k-${i}`} cx={x} cy={kubaY[i]} r="2" fill={C.purple} opacity="0.6" />
          ))}

          {months.map((m, i) => (
            <text key={m} x={xPoints[i]} y="100" textAnchor="middle" fill="#444" fontSize="6" fontFamily="monospace">
              {m}
            </text>
          ))}
        </svg>

        <div className="mt-2 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">{P.a} — góra emocji</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">{P.b} — EKG trupa</span>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-blue-500/5 px-2.5 py-2 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Zmienność Ani
            </p>
            <p className="font-mono text-sm font-bold" style={{ color: C.blue }}>
              &plusmn;0.28
            </p>
            <p className="text-[10px] italic text-muted-foreground">rollercoaster</p>
          </div>
          <div className="rounded-lg bg-purple-500/5 px-2.5 py-2 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Zmienność Kuby
            </p>
            <p className="font-mono text-sm font-bold" style={{ color: C.purple }}>
              &plusmn;0.02
            </p>
            <p className="text-[10px] italic text-muted-foreground">kliniczny spokój</p>
          </div>
        </div>

        <div className="mt-2 rounded-md bg-amber-500/5 px-2 py-1.5 text-center">
          <p className="font-mono text-[10px] sm:text-[11px] text-amber-500">
            Ania: rollercoaster emocji. Kuba: linia prosta jak EKG trupa. 💀
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDES DEFINITION
// ═══════════════════════════════════════════════════════════

const SLIDES: DemoSlide[] = [
  { id: 1, category: 'STATYSTYKI + ZDROWIE', accent: C.green, render: SlideOverview },
  { id: 2, category: 'PROFILE OSOBOWOŚCI', accent: C.blue, render: SlidePersonalities },
  { id: 3, category: 'MBTI + JĘZYKI MIŁOŚCI', accent: C.amber, render: SlideMBTI },
  { id: 4, category: 'VERSUS + PROGNOZA', accent: C.purple, render: SlideVersus },
  { id: 5, category: 'RED FLAGS + NAGRODY', accent: C.red, render: SlideRedFlags },
  { id: 6, category: 'ROAST', accent: C.orange, render: SlideRoast },
  { id: 7, category: 'SĄD + PROFILE RANDKOWE', accent: C.pink, render: SlideCourtDating },
  { id: 8, category: 'PODTEKSTY + SYMULACJA + DELUZJA', accent: C.purple, render: SlideInteractive },
  { id: 9, category: 'STAND-UP + ODZNAKI + CPS', accent: C.amber, render: SlideStandUpBadges },
  { id: 10, category: 'HEATMAPA + FRAZY + CZAS', accent: C.blue, render: SlideHeatmapOuter },
  { id: 11, category: 'WRAPPED + QUIZ + EMOCJE', accent: C.purple, render: SlideWrappedOuter },
];

// ═══════════════════════════════════════════════════════════
// BROWSER CHROME
// ═══════════════════════════════════════════════════════════

function BrowserChrome({ children, onShare }: { children: React.ReactNode; onShare?: () => void }) {
  return (
    <div
      className="flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-border"
      style={{
        background: 'var(--bg-card, #111111)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex h-10 items-center gap-2 border-b border-border px-3 sm:h-12 sm:gap-3 sm:px-4" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#ff5f5740' }} />
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#febc2e40' }} />
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#28c84040' }} />
        </div>
        <div className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-0.5 sm:px-3 sm:py-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 text-muted-foreground opacity-40"><rect x="1.5" y="4.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" /><path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
          <span className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs">podtekst.app/analysis/demo</span>
        </div>
        {onShare && (
          <button onClick={onShare} className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" aria-label="Udostępnij">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8v5a1 1 0 001 1h6a1 1 0 001-1V8" /><polyline points="12 4 8 1 4 4" /><line x1="8" y1="1" x2="8" y2="10" /></svg>
          </button>
        )}
      </div>
      <div className="relative h-[55vh] overflow-y-auto p-3 sm:h-[60vh] sm:p-4 md:h-[65vh] md:p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        <div style={{ zoom: 0.82 }}>{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3D COVERFLOW CAROUSEL
// ═══════════════════════════════════════════════════════════

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export default function LandingDemo() {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);
  const total = SLIDES.length;
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrent((p) => (p - 1 + total) % total);
      if (e.key === 'ArrowRight') setCurrent((p) => (p + 1) % total);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total]);

  const goTo = useCallback((idx: number) => setCurrent(((idx % total) + total) % total), [total]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    setDragging(false);
    if (info.offset.x < -80) goTo(current + 1);
    else if (info.offset.x > 80) goTo(current - 1);
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
  }, [current, goTo, x]);

  const slide = SLIDES[current];

  const handleShare = useCallback((slideIdx: number) => {
    const s = SLIDES[slideIdx];
    const url = `https://podtekst.app/#demo?utm_source=demo_share&utm_content=slide_${s.id}`;
    const text = `Sprawdź ten demo — ${s.category} na PodTeksT 🔥`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'PodTeksT Demo', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, []);

  const getCardStyle = (index: number): React.CSSProperties => {
    let diff = index - current;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absDiff = Math.abs(diff);
    const maxVisible = isMobile ? 1 : 2;

    if (absDiff > maxVisible) return { display: 'none' };

    const scale = Math.max(0.75, 1 - absDiff * 0.12);
    const translateX = diff * (isMobile ? 85 : 55);
    const rotateY = isMobile ? 0 : diff * -8;
    const opacity = Math.max(0.3, 1 - absDiff * 0.4);
    const zIndex = 100 - absDiff * 10;
    const brightness = absDiff > 0 ? 0.6 : 1;

    return {
      transform: `translateX(${translateX}%) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
      filter: absDiff > 0 ? `brightness(${brightness})` : undefined,
      transition: 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
      cursor: absDiff > 0 ? 'pointer' : 'default',
      pointerEvents: 'auto' as const,
    };
  };

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="mx-auto px-4 py-24 sm:px-6"
      style={{ maxWidth: '100rem' }}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">CO KRYJE SIĘ W TWOIM CHACIE?</p>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">30+ funkcji. Zero cenzury.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Demo: {P.a} &amp; {P.b} &middot; 12 847 msg &middot; 423 dni &middot; rating: toksyczny 🔥</p>
      </div>

      {/* Counter + dots */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => goTo(current - 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4" /></svg>
          </button>
          <div className="w-64 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{current + 1} <span className="text-muted-foreground/50">/</span> {total}</p>
            <p className="truncate font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: slide.accent }}>{slide.category}</p>
          </div>
          <button onClick={() => goTo(current + 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i)} className="transition-all" style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? slide.accent : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
      </div>

      {/* 3D Coverflow */}
      <div
        className="relative mx-auto"
        style={{ perspective: '1500px', maxWidth: '90rem' }}
      >
        <motion.div
          className="absolute inset-0 z-[200] cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          style={{ x }}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
        />

        <div ref={carouselRef} className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {SLIDES.map((s, i) => {
            const style = getCardStyle(i);
            if (style.display === 'none') return null;

            let diff = i - current;
            if (diff > total / 2) diff -= total;
            if (diff < -total / 2) diff += total;

            return (
              <div
                key={s.id}
                className="flex w-full flex-col"
                style={{
                  ...style,
                  position: diff === 0 ? 'relative' : 'absolute',
                  top: diff === 0 ? undefined : 0,
                  left: 0,
                }}
                onClick={() => { if (diff !== 0) goTo(i); }}
              >
                <BrowserChrome onShare={() => handleShare(i)}>
                  {s.render()}
                </BrowserChrome>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom navigation — always visible below carousel */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => goTo(current - 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4" /></svg>
        </button>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i)} className="transition-all" style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? slide.accent : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
        </button>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href="/analysis/new"
          className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-10 py-4 font-mono text-sm font-bold uppercase tracking-[0.08em] text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(139,92,246,0.3)] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #a855f7 100%)',
            boxShadow: '0 0 20px rgba(59,130,246,0.15), 0 0 40px rgba(168,85,247,0.1)',
            minHeight: 52,
          }}
        >
          <span className="absolute inset-0 translate-x-[-200%] bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-700 group-hover:translate-x-[200%]" />
          Odkryj podtekst swojej rozmowy
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5"><path d="M3.5 8h9M8.5 4l4 4-4 4" /></svg>
        </Link>
        <button
          onClick={() => handleShare(current)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8v5a1 1 0 001 1h6a1 1 0 001-1V8" /><polyline points="12 4 8 1 4 4" /><line x1="8" y1="1" x2="8" y2="10" /></svg>
          Wyślij kumplowi
        </button>
        {copied && (
          <span className="font-mono text-xs text-green-400">Skopiowano link!</span>
        )}
        <p className="font-mono text-[10px] text-muted-foreground/40">Psycholog: 200 zł/h. PodTeksT: za darmo. AI analizuje w 2 min.</p>
      </div>
    </section>
  );
}
