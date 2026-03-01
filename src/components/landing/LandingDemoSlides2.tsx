'use client';

import { P, C, GaugeRing } from './LandingDemoConstants';
import BrandLogo from '@/components/shared/BrandLogo';

// ═══════════════════════════════════════════════════════════
// SLIDE 5: RED FLAGS + NAGRODY SPECJALNE
// ═══════════════════════════════════════════════════════════

export function SlideRedFlags() {
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
          { label: 'Attachment Intensity', value: '78%', color: C.red },
          { label: 'Power Imbalance', value: '23%', color: C.green },
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

export function SlideRoast() {
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
          { title: 'EKSPERYMENT SPOŁECZNY ROKU', who: 'Oboje', desc: 'Health Score 34/100 — intensywne przywiązanie spotyka unikanie na stacji "Brak Terapii"' },
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

export function SlideCourtDating() {
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
          {P.b} — winny emocjonalnego zaniedbania I stopnia. {P.a} — współwinna za nadmierną intensywność. Oboje skazani na terapię par.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 8: SUBTEXT + SIMULATOR + QUIZ
// ═══════════════════════════════════════════════════════════

export function SlideInteractive() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      {/* Col 1 — Translator podtekstów */}
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4">
          <span className="font-display text-[15px] font-bold">
            Translator <BrandLogo size="sm" />
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
              Asymetria zaangażowania
            </p>
            <p className="font-mono text-sm font-bold text-orange-500">
              WYRAŹNA ASYMETRIA
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
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-400">ASYMETRIA ZAANGAŻOWANIA</p>
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
          <p className="mt-2 text-center font-mono text-[10px] text-orange-400">Asymetria: 71/100</p>
        </div>
      </div>

      {/* Interactive features stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Podteksty', value: '47', sub: 'ukrytych znaczeń', color: C.purple },
          { label: 'Symulacje', value: '89%', sub: 'accuracy', color: C.green },
          { label: 'Asymetria', value: '71/100', sub: 'wyraźna asymetria', color: C.orange },
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
          Translator podtekstów: 89% accuracy. Symulator odpowiedzi: 73% match z rzeczywistymi odpowiedziami. Asymetria zaangażowania: korelacja 0.84 z testem klinicznym.
        </p>
      </div>
    </div>
  );
}
