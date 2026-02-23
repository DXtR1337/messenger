'use client';

interface ProPreviewProps {
  participants: string[];
}

// --- Deterministic pseudo-random from participant name ---

function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seeded(hash: number, index: number): number {
  return ((hash * 9301 + 49297 + index * 233) % 233280) / 233280;
}

// --- MBTI data ---

const MBTI_TYPES = [
  { code: 'ENFP', nick: 'Kampanista', desc: 'Entuzjastyczny i kreatywny, widzi potencjal wszedzie' },
  { code: 'INFJ', nick: 'Adwokat', desc: 'Cichy wizjoner z silnym poczuciem moralnosci' },
  { code: 'ISTJ', nick: 'Logistyk', desc: 'Odpowiedzialny i niezawodny, ceni tradycje' },
  { code: 'ENTP', nick: 'Dyskutant', desc: 'Bystry polemista, uwielbia intelektualne wyzwania' },
  { code: 'ISFJ', nick: 'Obronca', desc: 'Opiekunczy i oddany, zawsze gotowy pomagac' },
  { code: 'INTJ', nick: 'Architekt', desc: 'Strategiczny i niezalezny, mysli dlugoterminowo' },
  { code: 'ESFP', nick: 'Showman', desc: 'Spontaniczny i energiczny, dusza towarzystwa' },
  { code: 'INTP', nick: 'Logik', desc: 'Analityczny i obiektywny, szuka wzorcow' },
] as const;

// --- Attachment / communication / tone options ---

const ATTACHMENT_STYLES = [
  { name: 'Bezpieczny', desc: 'Komfortowo buduje bliskosc, ufa partnerowi, otwarcie komunikuje potrzeby' },
  { name: 'Lekowo-unikajacy', desc: 'Pragnie bliskosci, ale boi sie odrzucenia — wycofuje sie pod presja' },
  { name: 'Lekowo-ambiwalentny', desc: 'Potrzebuje ciaglego potwierdzenia, intensywnie reaguje na dystans' },
  { name: 'Unikajacy', desc: 'Ceni niezaleznosc, trudno mu sie otworzyc emocjonalnie' },
] as const;

const COMM_STYLES = [
  { name: 'Asertywny', desc: 'Wyraza potrzeby wprost, szanuje granice — rownoważy stanowczosc i empatie' },
  { name: 'Pasywno-agresywny', desc: 'Unika konfrontacji, ale sygnalizuje niezadowolenie podszyty sarkazmem' },
  { name: 'Empatyczny', desc: 'Sluchacz, dostosowuje ton do emocji rozmowcy, priorytetem jest harmonia' },
  { name: 'Analityczny', desc: 'Precyzyjny i rzeczowy, woli fakty od emocji, lubi strukturyzowac mysli' },
] as const;

const TONE_OPTIONS = [
  { name: 'Ciepry i opiekunczy', desc: 'Pelne troski wiadomosci, czeste pytania o samopoczucie i dobre zyczenia' },
  { name: 'Sarkastyczny', desc: 'Zabawne riposty, ironiczne komentarze — humor jako mechanizm obronny' },
  { name: 'Rzeczowy', desc: 'Krotkie, konkretne wiadomosci nastawione na cel — minimum small talku' },
  { name: 'Emocjonalny', desc: 'Intensywne, dluzsze wiadomosci pelne emocji, emotikon i wykrzyknikow' },
] as const;

const LOVE_LANGUAGES = ['Dotyk', 'Slowa uznania', 'Czas', 'Prezenty', 'Pomoc'] as const;

const LOVE_LANG_COLORS = [
  'bg-rose-500/80 text-rose-100',
  'bg-amber-500/80 text-amber-100',
  'bg-emerald-500/80 text-emerald-100',
  'bg-cyan-500/80 text-cyan-100',
  'bg-violet-500/80 text-violet-100',
] as const;

// --- Helper: distribute percentages that sum to ~100 ---

function distributePercents(hash: number, offset: number, count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => 5 + seeded(hash, offset + i) * 30);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.round((v / total) * 100));
}

export default function ProPreview({ participants }: ProPreviewProps) {
  const p1 = participants[0] || 'Osoba A';
  const p2 = participants[1] || 'Osoba B';
  const h1 = nameHash(p1);
  const h2 = nameHash(p2);

  // Stable MBTI picks
  const mbti1 = MBTI_TYPES[h1 % MBTI_TYPES.length];
  const mbti2 = MBTI_TYPES[(h2 + 3) % MBTI_TYPES.length]; // offset to avoid same type

  // Stable style picks
  const attachment1 = ATTACHMENT_STYLES[h1 % ATTACHMENT_STYLES.length];
  const attachment2 = ATTACHMENT_STYLES[(h2 + 1) % ATTACHMENT_STYLES.length];
  const comm1 = COMM_STYLES[h1 % COMM_STYLES.length];
  const comm2 = COMM_STYLES[(h2 + 2) % COMM_STYLES.length];
  const tone = TONE_OPTIONS[(h1 + h2) % TONE_OPTIONS.length];

  // Big Five values (35-85%)
  const bigFiveTraits = ['Otwartosc', 'Sumiennosc', 'Ekstrawersja', 'Ugodowosc', 'Neurotycznosc'] as const;
  const bf1 = bigFiveTraits.map((_, i) => Math.round(35 + seeded(h1, i) * 50));
  const bf2 = bigFiveTraits.map((_, i) => Math.round(35 + seeded(h2, i + 10) * 50));

  // Love language percentages
  const ll1 = distributePercents(h1, 20, 5);
  const ll2 = distributePercents(h2, 30, 5);

  // Prediction percentage (45-78%)
  const predictionPct = Math.round(45 + seeded(h1 + h2, 99) * 33);

  return (
    <div className="space-y-6 select-none pointer-events-none opacity-90">

      {/* ── MBTI Cards ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { name: p1, mbti: mbti1, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
          { name: p2, mbti: mbti2, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
        ].map(({ name, mbti, color, border, bg }) => (
          <div key={name} className={`rounded-xl border ${border} ${bg} p-5`}>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Typ MBTI — {name}
            </h4>
            <p className={`text-3xl font-bold tracking-wide ${color}`}>{mbti.code}</p>
            <p className={`text-sm font-semibold ${color} opacity-80`}>{mbti.nick}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{mbti.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Big Five Personality Bars ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Profile osobowosci — Big Five
        </h4>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { name: p1, values: bf1, barColor: 'bg-blue-400', textColor: 'text-blue-400' },
            { name: p2, values: bf2, barColor: 'bg-purple-400', textColor: 'text-purple-400' },
          ].map(({ name, values, barColor, textColor }) => (
            <div key={name} className="space-y-2.5">
              <p className={`text-sm font-semibold ${textColor}`}>{name}</p>
              {bigFiveTraits.map((trait, i) => (
                <div key={trait} className="flex items-center gap-2">
                  <span className="w-[88px] shrink-0 text-[11px] text-muted-foreground">{trait}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted-foreground/10">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${values[i]}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right text-[11px] font-medium ${textColor}`}>
                    {values[i]}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Attachment / Communication / Tone Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Attachment style */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Styl przywiazania
          </h4>
          <div className="space-y-3">
            {[
              { name: p1, style: attachment1, color: 'text-blue-400' },
              { name: p2, style: attachment2, color: 'text-purple-400' },
            ].map(({ name, style, color }) => (
              <div key={name}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{name}</p>
                <p className={`text-sm font-bold ${color}`}>{style.name}</p>
                <p className="text-[11px] leading-snug text-muted-foreground/70">{style.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Communication style */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Styl komunikacji
          </h4>
          <div className="space-y-3">
            {[
              { name: p1, style: comm1, color: 'text-blue-400' },
              { name: p2, style: comm2, color: 'text-purple-400' },
            ].map(({ name, style, color }) => (
              <div key={name}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{name}</p>
                <p className={`text-sm font-bold ${color}`}>{style.name}</p>
                <p className="text-[11px] leading-snug text-muted-foreground/70">{style.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation tone */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ton rozmowy
          </h4>
          <div>
            <p className="text-sm font-bold text-foreground/90">{tone.name}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground/70">{tone.desc}</p>
          </div>
        </div>
      </div>

      {/* ── Love Languages ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Jezyki milosci
        </h4>
        <div className="space-y-4">
          {[
            { name: p1, values: ll1, accent: 'text-blue-400' },
            { name: p2, values: ll2, accent: 'text-purple-400' },
          ].map(({ name, values, accent }) => (
            <div key={name}>
              <p className={`mb-2 text-sm font-semibold ${accent}`}>{name}</p>
              <div className="flex flex-wrap gap-2">
                {LOVE_LANGUAGES.map((lang, i) => (
                  <span
                    key={lang}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${LOVE_LANG_COLORS[i]}`}
                  >
                    {lang}
                    <span className="font-bold">{values[i]}%</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Turning Points ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Punkty zwrotne
        </h4>
        <div className="space-y-3">
          {[
            {
              icon: '\u{1F525}',
              title: 'Punkt krytyczny — Luty 2025',
              desc: 'Nagly wzrost intensywnosci rozmow po dluższym okresie ciszy — prawdopodobna rekoncyliacja',
            },
            {
              icon: '\u{1F494}',
              title: 'Najgorszy moment — Kwiecien 2025',
              desc: 'Seria krotkich, chlodnych wiadomosci z rekordowym czasem odpowiedzi — eskalacja konfliktu',
            },
            {
              icon: '\u{2728}',
              title: 'Przelom — Styczen 2026',
              desc: 'Zmiana tonu na cieplejszy, powrot do dluzszych wiadomosci i wewnetrznych zartow',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3">
              <span className="mt-0.5 text-base">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground/90">{title}</p>
                <p className="text-[11px] leading-snug text-muted-foreground/70">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Prediction ── */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prognoza AI
        </h4>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-sm text-muted-foreground/80">Prawdopodobienstwo kontaktu za 30 dni</p>
            <p className="text-4xl font-bold text-emerald-400">{predictionPct}%</p>
          </div>
          <div className="flex items-end gap-1 pb-1">
            {[0.3, 0.5, 0.7, 1.0, 0.8, 0.6, 0.9].map((factor, i) => (
              <div
                key={i}
                className="w-3 rounded-sm bg-emerald-400/60"
                style={{ height: `${Math.round(factor * 40)}px` }}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
