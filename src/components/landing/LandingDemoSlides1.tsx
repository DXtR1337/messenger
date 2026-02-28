'use client';

import { P, C, StatBox, MiniBar, GaugeRing, RadarChart, SplitBar } from './LandingDemoConstants';

// ═══════════════════════════════════════════════════════════
// SLIDE 1: KLUCZOWE METRYKI + ZDROWIE
// ═══════════════════════════════════════════════════════════

export function SlideOverview() {
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
          {`intensywne przywiązanie (${P.a}) + unikanie (${P.b}). Health Score: `}
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

export function SlidePersonalities() {
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

export function SlideMBTI() {
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

export function SlideVersus() {
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
