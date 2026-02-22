/**
 * Cognitive Functions Clash — deterministic MBTI → cognitive function mapping
 * + clash analysis between two people.
 *
 * No AI needed — purely derived from MBTI types assigned during Pass 3.
 */

export type CognitiveFunction = 'Fe' | 'Fi' | 'Te' | 'Ti' | 'Se' | 'Si' | 'Ne' | 'Ni';

export interface FunctionStack {
  dominant: CognitiveFunction;
  auxiliary: CognitiveFunction;
  tertiary: CognitiveFunction;
  inferior: CognitiveFunction;
}

export interface FunctionClash {
  personA: { func: CognitiveFunction; role: string };
  personB: { func: CognitiveFunction; role: string };
  description: string;
  compatibility: number; // 0-100
}

export interface CognitiveFunctionsResult {
  stacks: Record<string, FunctionStack>;
  clashes: FunctionClash[];
  overallCompatibility: number;
}

// Standard Jungian function stacks per MBTI type
const MBTI_STACKS: Record<string, FunctionStack> = {
  ENFJ: { dominant: 'Fe', auxiliary: 'Ni', tertiary: 'Se', inferior: 'Ti' },
  ENFP: { dominant: 'Ne', auxiliary: 'Fi', tertiary: 'Te', inferior: 'Si' },
  ENTJ: { dominant: 'Te', auxiliary: 'Ni', tertiary: 'Se', inferior: 'Fi' },
  ENTP: { dominant: 'Ne', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Si' },
  ESFJ: { dominant: 'Fe', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Ti' },
  ESFP: { dominant: 'Se', auxiliary: 'Fi', tertiary: 'Te', inferior: 'Ni' },
  ESTJ: { dominant: 'Te', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Fi' },
  ESTP: { dominant: 'Se', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Ni' },
  INFJ: { dominant: 'Ni', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Se' },
  INFP: { dominant: 'Fi', auxiliary: 'Ne', tertiary: 'Si', inferior: 'Te' },
  INTJ: { dominant: 'Ni', auxiliary: 'Te', tertiary: 'Fi', inferior: 'Se' },
  INTP: { dominant: 'Ti', auxiliary: 'Ne', tertiary: 'Si', inferior: 'Fe' },
  ISFJ: { dominant: 'Si', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Ne' },
  ISFP: { dominant: 'Fi', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Te' },
  ISTJ: { dominant: 'Si', auxiliary: 'Te', tertiary: 'Fi', inferior: 'Ne' },
  ISTP: { dominant: 'Ti', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Fe' },
};

// Polish clash descriptions for function pairs
const CLASH_DESCRIPTIONS: Record<string, string> = {
  'Fe-Ti': 'Empatia vs Logika — jeden czuje za dwoje, drugi analizuje emocje jak arkusz kalkulacyjny',
  'Ti-Fe': 'Logika vs Empatia — jeden myśli, drugi czuje. Kiedy spotkają się na pół drogi?',
  'Fe-Te': 'Harmonia vs Efektywność — jeden dba o uczucia, drugi o wyniki',
  'Te-Fe': 'Efektywność vs Harmonia — struktura kontra ciepło',
  'Fi-Te': 'Wartości vs Systemy — głębokie uczucia kontra pragmatyczne podejście',
  'Te-Fi': 'Systemy vs Wartości — organizacja kontra autentyczność',
  'Ni-Ne': 'Wizja vs Możliwości — jeden widzi JEDNĄ przyszłość, drugi widzi WSZYSTKIE',
  'Ne-Ni': 'Możliwości vs Wizja — brainstorm kontra laser focus',
  'Ni-Se': 'Intuicja vs Zmysły — jeden żyje w głowie, drugi w momencie',
  'Se-Ni': 'Zmysły vs Intuicja — akcja teraz kontra planowanie na lata',
  'Si-Ne': 'Tradycja vs Innowacja — sprawdzone metody kontra nowe pomysły',
  'Ne-Si': 'Innowacja vs Tradycja — „a co jeśli" kontra „tak zawsze robiliśmy"',
  'Se-Si': 'Przygoda vs Rutyna — spontaniczność kontra stabilność',
  'Si-Se': 'Rutyna vs Przygoda — bezpieczeństwo kontra adrenalina',
  'Fi-Fe': 'Autentyczność vs Harmonia — prawdziwe ja kontra społeczne ja',
  'Fe-Fi': 'Harmonia vs Autentyczność — „co pomyślą inni" kontra „co ja czuję"',
  'Ti-Te': 'Wewnętrzna logika vs Zewnętrzna logika — model mentalny kontra dowody',
  'Te-Ti': 'Zewnętrzna logika vs Wewnętrzna logika — dane kontra teoria',
};

function getClashDescription(funcA: CognitiveFunction, funcB: CognitiveFunction): string {
  return CLASH_DESCRIPTIONS[`${funcA}-${funcB}`] ?? `${funcA} kontra ${funcB}`;
}

function computeCompatibility(funcA: CognitiveFunction, funcB: CognitiveFunction): number {
  // Same function = high compatibility
  if (funcA === funcB) return 85;

  const baseA = funcA[0]; // T, F, S, N
  const baseB = funcB[0];

  // Same cognitive base, different attitude (e.g. Fe vs Fi) = medium
  if (baseA === baseB) return 65;

  // Complementary opposing pairs (T/F, S/N) = lowest natural compatibility
  const complementary = new Set(['TF', 'FT', 'SN', 'NS']);
  if (complementary.has(baseA + baseB)) return 40;

  // Other combos (e.g. T/S, F/N) = moderate
  return 55;
}

/**
 * Compute cognitive function stacks and clashes from AI-assigned MBTI profiles.
 *
 * @param profiles - Pass 3 profiles keyed by participant name, each with an optional .mbti.type
 * @returns Clash analysis, or undefined if fewer than 2 participants have MBTI types
 */
export function computeCognitiveFunctions(
  profiles: Record<string, { mbti?: { type: string } }>,
): CognitiveFunctionsResult | undefined {
  const names = Object.keys(profiles);
  if (names.length < 2) return undefined;

  const stacks: Record<string, FunctionStack> = {};
  for (const name of names) {
    const mbtiType = profiles[name].mbti?.type?.toUpperCase();
    if (mbtiType && MBTI_STACKS[mbtiType]) {
      stacks[name] = MBTI_STACKS[mbtiType];
    }
  }

  // Need at least 2 people with valid MBTI
  const stackNames = Object.keys(stacks);
  if (stackNames.length < 2) return undefined;

  const a = stacks[stackNames[0]];
  const b = stacks[stackNames[1]];

  const clashes: FunctionClash[] = [
    // Dominant vs Dominant — core personality clash
    {
      personA: { func: a.dominant, role: 'dominant' },
      personB: { func: b.dominant, role: 'dominant' },
      description: getClashDescription(a.dominant, b.dominant),
      compatibility: computeCompatibility(a.dominant, b.dominant),
    },
    // Auxiliary vs Auxiliary — how they support each other
    {
      personA: { func: a.auxiliary, role: 'auxiliary' },
      personB: { func: b.auxiliary, role: 'auxiliary' },
      description: getClashDescription(a.auxiliary, b.auxiliary),
      compatibility: computeCompatibility(a.auxiliary, b.auxiliary),
    },
    // Dominant vs Inferior — the shadow tension
    {
      personA: { func: a.dominant, role: 'dominant' },
      personB: { func: b.inferior, role: 'inferior' },
      description: getClashDescription(a.dominant, b.inferior),
      compatibility: computeCompatibility(a.dominant, b.inferior),
    },
  ];

  const overallCompatibility = Math.round(
    clashes.reduce((s, c) => s + c.compatibility, 0) / clashes.length,
  );

  return { stacks, clashes, overallCompatibility };
}
