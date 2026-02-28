'use client';

import { Fragment } from 'react';
import { P, C, MiniBar, GaugeRing } from './LandingDemoConstants';

// ═══════════════════════════════════════════════════════════
// SLIDE 9: STAND-UP + BADGES + CPS
// ═══════════════════════════════════════════════════════════

export function SlideStandUpBadges() {
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
            { name: 'Nierównowaga wpływu', value: 15, color: C.green, level: 'niskie' },
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

export function SlideHeatmapOuter() {
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

// ═══════════════════════════════════════════════════════════
// SLIDE 11: WRAPPED + QUIZ + TRAJEKTORIA EMOCJI
// ═══════════════════════════════════════════════════════════

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

export function SlideWrappedOuter() {
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
