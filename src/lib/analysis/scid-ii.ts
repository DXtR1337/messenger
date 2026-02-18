/**
 * SCID-II Personality Disorder Screening System
 *
 * Based on the actual SCID-II Personality Questionnaire (119 questions).
 * Questions are in Polish, matching the original clinical instrument.
 *
 * DISCLAIMER: This is a SCREENING tool, NOT a diagnostic tool.
 * Results indicate potential need for professional consultation only.
 */

// ============================================================
// TYPES
// ============================================================

export interface SCIDQuestion {
  id: number;
  text: string; // Polish original question text
  disorder: string; // disorder key
  messageSignals: string; // what to look for in messages (for AI prompt)
}

export interface SCIDDisorder {
  key: string;
  name: string; // Polish name
  nameEn: string; // English name
  color: string;
  threshold: number; // clinical screening threshold
  questions: number[]; // question IDs
}

export interface SCIDAnswer {
  answer: boolean | null; // true/false/null (null = unable to assess)
  confidence: number; // 0-100
  evidence: string[]; // supporting quotes/patterns
}

export interface SCIDDisorderResult {
  yesCount: number;
  total: number;
  threshold: number;
  meetsThreshold: boolean;
  percentage: number; // percentage of threshold met
  confidence: number; // avg confidence for this disorder
  answers: Record<number, SCIDAnswer>;
}

export interface SCIDResult {
  answers: Record<number, SCIDAnswer>;
  disorders: Record<string, SCIDDisorderResult>;
  overallConfidence: number;
  disclaimer: string;
  analyzedAt: number;
  participantName: string;
}

export interface SCIDScreeningRequirements {
  minMessages: number;
  minTimespanMonths: number;
  requiresCompletedPasses: number[];
}

// ============================================================
// DISORDERS (matches reference SCID-II questionnaire)
// ============================================================

export const SCID_DISORDERS: SCIDDisorder[] = [
  {
    key: 'avoidant',
    name: 'Osobowość unikowa',
    nameEn: 'Avoidant',
    color: '#6366f1',
    threshold: 4,
    questions: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    key: 'dependent',
    name: 'Osobowość zależna',
    nameEn: 'Dependent',
    color: '#8b5cf6',
    threshold: 5,
    questions: [8, 9, 10, 11, 12, 13, 14],
  },
  {
    key: 'ocpd',
    name: 'Osobowość anankastyczna',
    nameEn: 'Obsessive-Compulsive (OCPD)',
    color: '#3b82f6',
    threshold: 4,
    questions: [15, 16, 17, 18, 19, 20, 21, 22, 23],
  },
  {
    key: 'passive_aggressive',
    name: 'Osobowość bierno-agresywna',
    nameEn: 'Passive-Aggressive',
    color: '#0ea5e9',
    threshold: 4,
    questions: [24, 25, 26, 27, 28],
  },
  {
    key: 'depressive',
    name: 'Osobowość depresyjna',
    nameEn: 'Depressive',
    color: '#475569',
    threshold: 5,
    questions: [29, 30, 31, 32, 33, 34, 35],
  },
  {
    key: 'paranoid',
    name: 'Osobowość paranoiczna',
    nameEn: 'Paranoid',
    color: '#ef4444',
    threshold: 4,
    questions: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
  },
  {
    key: 'schizotypal',
    name: 'Osobowość schizotypowa',
    nameEn: 'Schizotypal',
    color: '#f97316',
    threshold: 4,
    questions: [49, 50, 51, 52, 53, 54, 55, 56, 57],
  },
  {
    key: 'schizoid',
    name: 'Osobowość schizoidalna',
    nameEn: 'Schizoid',
    color: '#64748b',
    threshold: 4,
    questions: [58, 59, 60, 61, 62, 63],
  },
  {
    key: 'histrionic',
    name: 'Osobowość histrioniczna',
    nameEn: 'Histrionic',
    color: '#ec4899',
    threshold: 4,
    questions: [64, 65, 66, 67, 68, 69, 70, 71, 72],
  },
  {
    key: 'narcissistic',
    name: 'Osobowość narcystyczna',
    nameEn: 'Narcissistic',
    color: '#f59e0b',
    threshold: 5,
    questions: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
  },
  {
    key: 'borderline',
    name: 'Osobowość z pogranicza (BPD)',
    nameEn: 'Borderline',
    color: '#dc2626',
    threshold: 5,
    questions: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104],
  },
  {
    key: 'antisocial',
    name: 'Osobowość antyspołeczna',
    nameEn: 'Antisocial',
    color: '#1e293b',
    threshold: 3,
    questions: [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119],
  },
];

// ============================================================
// ALL 119 QUESTIONS (official SCID-II text + message signals)
// ============================================================

const NA = 'CANNOT ASSESS from messages alone. Mark as null with confidence 0.';

export const SCID_QUESTIONS: SCIDQuestion[] = [
  // ── AVOIDANT (1-7) ──
  { id: 1, text: 'Czy unika Pan(i) prac lub zadań, przy których trzeba mieć kontakt z dużą liczbą osób?', disorder: 'avoidant', messageSignals: 'Low group chat participation, declining invitations, short responses when addressed in groups' },
  { id: 2, text: 'Czy unika Pan(i) bliższych kontaktów z ludźmi, jeśli nie jest pewny(a), że go/ją polubią?', disorder: 'avoidant', messageSignals: 'Hesitation to engage, seeking reassurance before sharing, cautious tone in early messages' },
  { id: 3, text: 'Czy trudno jest Pan(i) "otworzyć się" nawet wobec bliskich osób?', disorder: 'avoidant', messageSignals: 'Keeping conversations surface-level, deflecting personal questions, avoiding emotional topics' },
  { id: 4, text: 'Czy często martwi się Pan(i), że w sytuacjach towarzyskich ktoś go/ją skrytykuje lub odrzuci?', disorder: 'avoidant', messageSignals: 'Expressing fear of judgment, apologizing preemptively, worrying about how messages are received' },
  { id: 5, text: 'Czy zazwyczaj milczy Pan(i), gdy poznaje nowych ludzi?', disorder: 'avoidant', messageSignals: 'Very short or no responses in new group chats, lurking behavior, delayed first messages' },
  { id: 6, text: 'Czy uważa Pan(i), że nie jest tak mądry(a), dobry(a) lub atrakcyjny(a) jak większość innych ludzi?', disorder: 'avoidant', messageSignals: 'Self-deprecating comments, unfavorable comparisons to others, expressing inadequacy' },
  { id: 7, text: 'Czy boi się Pan(i) próbowania nowych rzeczy?', disorder: 'avoidant', messageSignals: 'Resistance to new activities or suggestions, expressing fear of failure, declining novel plans' },

  // ── DEPENDENT (8-14) ──
  { id: 8, text: 'Czy potrzebuje Pan(i) dużo rad i upewnień ze strony innych, zanim podejmie decyzję w codziennym życiu?', disorder: 'dependent', messageSignals: 'Asking for advice on trivial decisions, needing validation before choosing, deferring to others constantly' },
  { id: 9, text: 'Czy polega Pan(i) na innych osobach w sprawach dotyczących swojego życia (finanse, plany, opieka)?', disorder: 'dependent', messageSignals: 'Asking others to handle responsibilities, inability to make decisions alone, delegating life choices' },
  { id: 10, text: 'Czy trudno jest Pan(i) nie zgodzić się z ludźmi, nawet jeśli nie mają racji?', disorder: 'dependent', messageSignals: 'Always agreeing, avoiding expressing disagreement, fear of conflict, going along with everything' },
  { id: 11, text: 'Czy trudno jest Pan(i) zacząć pracować, jeśli nie można liczyć na pomoc innych?', disorder: 'dependent', messageSignals: 'Asking for help to begin tasks, expressing inability to start alone, needing co-workers/partners to initiate' },
  { id: 12, text: 'Czy często podejmuje się Pan(i) wykonania zadań, które są nieprzyjemne?', disorder: 'dependent', messageSignals: 'People-pleasing, volunteering for unpleasant tasks, sacrificing own comfort to maintain approval' },
  { id: 13, text: 'Czy czuje się Pan(i) nieswojo będąc sam(a)?', disorder: 'dependent', messageSignals: 'Distress when alone, constant messaging to maintain contact, anxiety about being by oneself' },
  { id: 14, text: 'Czy kiedy kończy się związek, od razu musi Pan(i) znaleźć kogoś, kto się zatroszczy?', disorder: 'dependent', messageSignals: 'Panic about being alone after breakup, urgently seeking new connections, cannot function without partner' },

  // ── OCPD (15-23) ──
  { id: 15, text: 'Czy często martwi się Pan(i), że zostanie sam(a) i sam(a) będzie musiał(a) się o siebie troszczyć?', disorder: 'ocpd', messageSignals: 'Anxiety about independence, worrying about self-sufficiency, fear of being without support system' },
  { id: 16, text: 'Czy skupia się Pan(i) na szczegółach, porządku i organizacji lub czuje potrzebę robienia list i planów?', disorder: 'ocpd', messageSignals: 'Over-detailed messages, creating excessive lists/plans, correcting others formatting, obsessing over structure' },
  { id: 17, text: 'Czy ma Pan(i) trudności z zakończeniem pracy z powodu ilości czasu poświęcanego na wykonanie jej dokładnie?', disorder: 'ocpd', messageSignals: 'Perfectionist language about work, never satisfied with output, spending excessive time on small tasks' },
  { id: 18, text: 'Czy jest Pan(i) tak pochłonięty(a) pracą, że nie ma czasu dla nikogo ani na przyjemności?', disorder: 'ocpd', messageSignals: 'Work dominating all conversations, declining social plans for work, expressing guilt about leisure' },
  { id: 19, text: 'Czy ma Pan(i) wysokie standardy dotyczące tego, co jest dobre, a co złe?', disorder: 'ocpd', messageSignals: 'Rigid moral judgments, black-and-white ethical statements, judging others behavior harshly' },
  { id: 20, text: 'Czy ma Pan(i) trudności z wyrzuceniem rzeczy, "bo mogą się jeszcze kiedyś przydać"?', disorder: 'ocpd', messageSignals: NA },
  { id: 21, text: 'Czy trudno jest Pan(i) przyjąć pomoc innych, chyba że osoby te godzą się działać ściśle według poleceń?', disorder: 'ocpd', messageSignals: 'Micromanaging, needing control over how tasks are done, rejecting help that is not done their way' },
  { id: 22, text: 'Czy trudno jest Pan(i) wydawać pieniądze na siebie lub innych, nawet jeśli ma ich pod dostatkiem?', disorder: 'ocpd', messageSignals: NA },
  { id: 23, text: 'Czy jest Pan(i) często tak przekonany(a) o własnej racji, że nie ma znaczenia, co myślą inni?', disorder: 'ocpd', messageSignals: 'Inflexible opinions, refusal to consider other viewpoints, stubborn positions in discussions' },

  // ── PASSIVE-AGGRESSIVE (24-28) ──
  { id: 24, text: 'Czy inni ludzie mówią, że jest Pan(i) uparty(a) lub nieugięty(a)?', disorder: 'passive_aggressive', messageSignals: 'Others commenting on stubbornness, complaints about inflexibility, being told they are difficult' },
  { id: 25, text: 'Czy jeśli ktoś poprosi o zadanie, na które nie ma Pan(i) ochoty, zgadza się, a potem pracuje powoli i niedokładnie?', disorder: 'passive_aggressive', messageSignals: 'Agreeing then not following through, passive resistance to requests, procrastination patterns' },
  { id: 26, text: 'Czy jeśli nie chce Pan(i) czegoś zrobić, "zapomina" o tym?', disorder: 'passive_aggressive', messageSignals: 'Conveniently forgetting commitments, selective memory about obligations, ignoring specific requests' },
  { id: 27, text: 'Czy często czuje Pan(i), że inni go/ją nie rozumieją lub niedoceniają?', disorder: 'passive_aggressive', messageSignals: 'Chronic complaining about being misunderstood, victim mentality, feeling unappreciated' },
  { id: 28, text: 'Czy często jest Pan(i) zrzędliwy(a) i wdaje się w kłótnie?', disorder: 'passive_aggressive', messageSignals: 'Frequent irritability in messages, starting arguments, grumpy/negative tone patterns' },

  // ── DEPRESSIVE (29-35) ──
  { id: 29, text: 'Czy uważa Pan(i), że większość osób na stanowiskach w rzeczywistości nie wie, co robi?', disorder: 'depressive', messageSignals: 'Cynicism about authority figures, complaining about incompetent leaders, general distrust of institutions' },
  { id: 30, text: 'Czy często myśli Pan(i), że to niesprawiedliwe, że innym lepiej się powodzi?', disorder: 'depressive', messageSignals: 'Resentment toward others success, expressing unfairness, envy and bitterness about others fortune' },
  { id: 31, text: 'Czy często skarży się Pan(i), że przydarza się więcej złych rzeczy niż innym?', disorder: 'depressive', messageSignals: 'Victim mentality, externalizing blame, believing life is specifically unfair to them' },
  { id: 32, text: 'Czy często gniewnie odmawia Pan(i) zrobienia czegoś, a potem żałuje i przeprasza?', disorder: 'depressive', messageSignals: 'Angry refusals followed by apologies, regret cycles, impulsive negativity then guilt' },
  { id: 33, text: 'Czy zazwyczaj czuje się Pan(i) nieszczęśliwy(a) lub myśli, że życie nie jest przyjemne?', disorder: 'depressive', messageSignals: 'Consistently negative outlook, pessimistic predictions, gloomy tone, lack of enthusiasm' },
  { id: 34, text: 'Czy sądzi Pan(i), że nie pasuje do innych i często czuje się źle ze sobą?', disorder: 'depressive', messageSignals: 'Expressing not fitting in, self-loathing statements, feeling like an outsider' },
  { id: 35, text: 'Czy często popada Pan(i) w przygnębienie?', disorder: 'depressive', messageSignals: 'Expressing sadness frequently, melancholic tone, describing low moods, despair language' },

  // ── PARANOID (36-48) ──
  { id: 36, text: 'Czy stale myśli Pan(i) o przykrych rzeczach z przeszłości lub martwi się o przyszłość?', disorder: 'paranoid', messageSignals: 'Rumination about past events, repeatedly referencing old grievances, anxiety about future threats' },
  { id: 37, text: 'Czy często ocenia Pan(i) innych surowo i dostrzega ich winy?', disorder: 'paranoid', messageSignals: 'Harsh judgments of others, pointing out flaws, critical tone about other people' },
  { id: 38, text: 'Czy uważa Pan(i), że większość ludzi jest do niczego?', disorder: 'paranoid', messageSignals: 'Misanthropic statements, general distrust of humanity, cynical view of peoples motives' },
  { id: 39, text: 'Czy zawsze oczekuje Pan(i), że wydarzy się coś złego?', disorder: 'paranoid', messageSignals: 'Catastrophic thinking, always expecting worst outcomes, pessimistic predictions about events' },
  { id: 40, text: 'Czy często czuje się Pan(i) winny(a) z powodu tego, co zrobił(a) lub czego nie zrobił(a)?', disorder: 'paranoid', messageSignals: 'Excessive guilt expressions, ruminating about past actions, self-blame patterns' },
  { id: 41, text: 'Czy często musi się Pan(i) mieć na baczności, aby inni nie wykorzystali lub nie skrzywdzili?', disorder: 'paranoid', messageSignals: 'Suspicious language, guarded behavior, expressing distrust, questioning peoples motives' },
  { id: 42, text: 'Czy spędza Pan(i) dużo czasu zastanawiając się, czy może ufać swoim przyjaciołom?', disorder: 'paranoid', messageSignals: 'Questioning trust, expressing doubt about friends loyalty, testing peoples honesty' },
  { id: 43, text: 'Czy uważa Pan(i), że dobrze jest, jeśli ludzie nie wiedzą o nim/niej zbyt wiele?', disorder: 'paranoid', messageSignals: 'Withholding personal information, guarded about self-disclosure, vague or evasive answers' },
  { id: 44, text: 'Czy często tropi Pan(i) ukryte groźby lub zniewagi w tym, co ludzie mówią?', disorder: 'paranoid', messageSignals: 'Reading negative intent into neutral messages, perceiving hidden slights, taking things personally' },
  { id: 45, text: 'Czy jest Pan(i) osobą, która chowa urazy lub niechętnie przebacza?', disorder: 'paranoid', messageSignals: 'Holding grudges, referencing old conflicts, difficulty forgiving, bringing up past wrongs' },
  { id: 46, text: 'Czy jest wiele osób, którym nie może Pan(i) wybaczyć tego, co zrobiły dawno temu?', disorder: 'paranoid', messageSignals: 'Long list of grievances, inability to let go, frequent mentions of people who wronged them' },
  { id: 47, text: 'Czy łatwo wpada Pan(i) w gniew lub atakuje kogoś za krytykę lub zniewagę?', disorder: 'paranoid', messageSignals: 'Defensive responses to feedback, preemptive attacks, aggressive reactions to perceived criticism' },
  { id: 48, text: 'Czy podejrzewa Pan(i), że partner(ka) lub mąż/żona go/ją zdradza?', disorder: 'paranoid', messageSignals: 'Accusations of infidelity without evidence, jealousy, checking up on partner, interrogating about contacts' },

  // ── SCHIZOTYPAL (49-57) ──
  { id: 49, text: 'Czy kiedy widzi Pan(i) rozmawiających ludzi, często myśli, że rozmawiają o nim/niej?', disorder: 'schizotypal', messageSignals: 'Ideas of reference, believing others are talking about them, paranoid social interpretations' },
  { id: 50, text: 'Czy często ma Pan(i) uczucie, że rzeczy bez specjalnego znaczenia mają przekazać mu/jej jakąś wiadomość?', disorder: 'schizotypal', messageSignals: 'Magical thinking, finding hidden meaning in ordinary events, superstitious interpretations' },
  { id: 51, text: 'Czy gdy jest Pan(i) wśród ludzi, często ma wrażenie, że jest obserwowany(a)?', disorder: 'schizotypal', messageSignals: 'Feeling watched, social paranoia, discomfort in group settings due to perceived scrutiny' },
  { id: 52, text: 'Czy kiedykolwiek miał(a) Pan(i) poczucie, że mógłby(mogłaby) sprawić, żeby coś się stało, myśląc o tym?', disorder: 'schizotypal', messageSignals: NA },
  { id: 53, text: 'Czy miał(a) Pan(i) doświadczenia z mocami nadprzyrodzonymi?', disorder: 'schizotypal', messageSignals: NA },
  { id: 54, text: 'Czy wierzy Pan(i) w "szósty zmysł", który pozwala przewidywać rzeczy?', disorder: 'schizotypal', messageSignals: NA },
  { id: 55, text: 'Czy zdarza się, że przedmioty lub cienie są dla Pan(i) ludźmi, a dźwięki — ludzkimi głosami?', disorder: 'schizotypal', messageSignals: NA },
  { id: 56, text: 'Czy miał(a) Pan(i) kiedyś przeświadczenie, że jest ktoś lub coś, jakaś siła wokół, chociaż nikogo nie widział(a)?', disorder: 'schizotypal', messageSignals: NA },
  { id: 57, text: 'Czy często widzi Pan(i) aurę lub pola energii wokół ludzi?', disorder: 'schizotypal', messageSignals: NA },

  // ── SCHIZOID (58-63) ──
  { id: 58, text: 'Czy niewiele jest osób poza rodziną, które są Pan(i) bliskie?', disorder: 'schizoid', messageSignals: 'Mentions of having few friends, limited social circle, not maintaining relationships' },
  { id: 59, text: 'Czy często denerwuje się Pan(i), gdy jest z innymi ludźmi?', disorder: 'schizoid', messageSignals: 'Expressing discomfort in social settings, irritability around others, preferring to withdraw' },
  { id: 60, text: 'Czy bliskie związki NIE są dla Pan(i) ważne?', disorder: 'schizoid', messageSignals: 'Indifference toward relationships, dismissive of close connections, emotional detachment' },
  { id: 61, text: 'Czy prawie zawsze woli Pan(i) wykonywać czynności sam(a) niż z innymi?', disorder: 'schizoid', messageSignals: 'Strong preference for solitary activities, declining group plans, expressing enjoyment of being alone' },
  { id: 62, text: 'Czy mógłby(mogłaby) Pan(i) być zadowolony(a) nie utrzymując żadnego związku seksualnego?', disorder: 'schizoid', messageSignals: NA },
  { id: 63, text: 'Czy niewiele rzeczy sprawia Pan(i) tak naprawdę przyjemność?', disorder: 'schizoid', messageSignals: 'Anhedonia, lack of enthusiasm, flat reactions to positive events, limited emotional range' },

  // ── HISTRIONIC (64-72) ──
  { id: 64, text: 'Czy NIE jest dla Pan(i) ważne, co ludzie o nim/niej myślą?', disorder: 'histrionic', messageSignals: 'Indifference to others opinions (reverse scored — "no" = histrionic). Look for ABSENCE of social awareness' },
  { id: 65, text: 'Czy nic tak naprawdę Pan(i) nie uszczęśliwia ani nie smuci?', disorder: 'histrionic', messageSignals: 'Flat affect, emotional numbness (reverse scored — "no" = histrionic). Look for ABSENCE of emotional range' },
  { id: 66, text: 'Czy lubi Pan(i) być w centrum uwagi?', disorder: 'histrionic', messageSignals: 'Attention-seeking, bringing conversation back to self, discomfort when not the focus, dramatic self-centering' },
  { id: 67, text: 'Czy często Pan(i) flirtuje?', disorder: 'histrionic', messageSignals: 'Flirtatious language patterns, suggestive messages, using charm to get attention' },
  { id: 68, text: 'Czy często podrywa Pan(i) inne osoby?', disorder: 'histrionic', messageSignals: 'Seductive communication patterns, romantic overtures, using attractiveness for attention' },
  { id: 69, text: 'Czy stara się Pan(i) przyciągnąć uwagę poprzez strój lub wygląd?', disorder: 'histrionic', messageSignals: NA },
  { id: 70, text: 'Czy ważne jest dla Pan(i) bycie wyrazistym(ą) i kolorowym(ą)?', disorder: 'histrionic', messageSignals: 'Dramatic/theatrical language, excessive emoji/punctuation, exaggerated emotional expressions' },
  { id: 71, text: 'Czy często zmienia Pan(i) zdanie w zależności od tego, co mówią osoby, z którymi przebywa?', disorder: 'histrionic', messageSignals: 'Easily swayed opinions, changing views to match company, suggestible behavior in chats' },
  { id: 72, text: 'Czy ma Pan(i) wielu bliskich przyjaciół?', disorder: 'histrionic', messageSignals: 'Claiming many close friends (reverse scored — overestimation). Look for inflated social claims vs shallow connections' },

  // ── NARCISSISTIC (73-89) ──
  { id: 73, text: 'Czy ludzie często nie doceniają osiągnięć i talentów Pan(i)?', disorder: 'narcissistic', messageSignals: 'Complaints about not being recognized, feeling undervalued, expressing that others dont see their worth' },
  { id: 74, text: 'Czy ktoś mówił Pan(i), że ma zbyt wysokie mniemanie o sobie?', disorder: 'narcissistic', messageSignals: 'Others pointing out arrogance, being told they are full of themselves, feedback about grandiosity' },
  { id: 75, text: 'Czy dużo myśli Pan(i) o władzy, sławie lub uznaniu, jakie kiedyś osiągnie?', disorder: 'narcissistic', messageSignals: 'Grandiose fantasies about success, talking about future fame/power, unrealistic self-assessments' },
  { id: 76, text: 'Czy rozmyśla Pan(i) o idealnej miłości, która mu/jej się przytrafi?', disorder: 'narcissistic', messageSignals: 'Idealizing future romance, believing they deserve perfect love, unrealistic relationship expectations' },
  { id: 77, text: 'Czy zawsze domaga się Pan(i) spotkania z osobą na najwyższym szczeblu w organizacji?', disorder: 'narcissistic', messageSignals: NA },
  { id: 78, text: 'Czy uważa Pan(i), że należy spędzać czas z osobami wpływowymi lub wyjątkowymi?', disorder: 'narcissistic', messageSignals: 'Name-dropping, associating only with high-status people, dismissing ordinary people' },
  { id: 79, text: 'Czy jest dla Pan(i) ważne, aby ludzie zwracali na niego/nią uwagę i podziwiali?', disorder: 'narcissistic', messageSignals: 'Fishing for compliments, needing admiration, seeking praise, validation-seeking patterns' },
  { id: 80, text: 'Czy uważa Pan(i), że nie musi trzymać się pewnych zasad, jeśli przeszkadzają?', disorder: 'narcissistic', messageSignals: 'Entitlement, believing rules dont apply, expecting exceptions, disregarding social norms' },
  { id: 81, text: 'Czy czuje Pan(i), że powinien(na) być traktowany(a) w specjalny sposób?', disorder: 'narcissistic', messageSignals: 'Expecting special treatment, entitlement in requests, believing they deserve more than others' },
  { id: 82, text: 'Czy często wykorzystuje Pan(i) innych, aby osiągnąć własny cel?', disorder: 'narcissistic', messageSignals: 'Instrumental view of relationships, using people for personal gain, transactional behavior' },
  { id: 83, text: 'Czy często przedkłada Pan(i) własne potrzeby nad potrzeby innych?', disorder: 'narcissistic', messageSignals: 'Self-centered behavior, always prioritizing own needs, ignoring others requirements' },
  { id: 84, text: 'Czy często oczekuje Pan(i) od ludzi, że będą robić to, czego sobie życzy?', disorder: 'narcissistic', messageSignals: 'Expecting compliance, demanding behavior, assuming others should serve their needs' },
  { id: 85, text: 'Czy NIE jest Pan(i) zainteresowany(a) uczuciami i problemami innych osób?', disorder: 'narcissistic', messageSignals: 'Lack of empathy, dismissing others problems, not asking about others feelings, self-focused conversations' },
  { id: 86, text: 'Czy ludzie skarżyli się, że Pan(i) ich nie słucha lub nie dba o ich uczucia?', disorder: 'narcissistic', messageSignals: 'Others complaining about being ignored, feedback about lack of listening, emotional invalidation' },
  { id: 87, text: 'Czy często zazdrości Pan(i) innym?', disorder: 'narcissistic', messageSignals: 'Expressing envy, comparing self to others, resentment toward others achievements' },
  { id: 88, text: 'Czy czuje Pan(i), że inni są w stosunku do niego/niej zawistni?', disorder: 'narcissistic', messageSignals: 'Believing others are jealous, attributing others behavior to envy, assuming admiration' },
  { id: 89, text: 'Czy uważa Pan(i), że niewiele osób jest wartych jego/jej uwagi i czasu?', disorder: 'narcissistic', messageSignals: 'Dismissive of others, looking down on people, superiority complex, condescending language' },

  // ── BORDERLINE (90-104) ──
  { id: 90, text: 'Czy często ogarnia Pan(i) rozpacz na myśl, że ktoś bliski może go/ją opuścić?', disorder: 'borderline', messageSignals: 'Panic when responses delayed, "are you mad at me?", reassurance-seeking about abandonment, intense fear of rejection' },
  { id: 91, text: 'Czy w relacjach z bliskimi ludźmi są gwałtowne wzloty i upadki?', disorder: 'borderline', messageSignals: 'Cycling between idealization and devaluation, dramatic relationship fluctuations, unstable attachments' },
  { id: 92, text: 'Czy kiedykolwiek zmieniła się opinia Pan(i) o sobie i kierunek, w jakim zmierza?', disorder: 'borderline', messageSignals: 'Shifting self-perception, changing life goals, unstable sense of identity' },
  { id: 93, text: 'Czy poczucie tego, kim Pan(i) jest, często się dramatycznie zmienia?', disorder: 'borderline', messageSignals: 'Expressing confusion about identity, contradictory self-descriptions, unstable self-image' },
  { id: 94, text: 'Czy zachowuje się Pan(i) inaczej w stosunku do różnych osób i czasem nie wie, jaki(a) naprawdę jest?', disorder: 'borderline', messageSignals: 'Adapting personality to different people, expressing not knowing true self, chameleon behavior' },
  { id: 95, text: 'Czy zaszło wiele gwałtownych zmian w kwestiach celów życiowych, planów kariery, przekonań?', disorder: 'borderline', messageSignals: 'Rapidly shifting interests, abandoning projects, dramatic life direction changes' },
  { id: 96, text: 'Czy często zachowuje się Pan(i) impulsywnie?', disorder: 'borderline', messageSignals: 'Spontaneous decisions, regrettable messages followed by apologies, impulsive plans, rapid topic changes' },
  { id: 97, text: 'Czy próbował(a) się Pan(i) skrzywdzić lub popełnić samobójstwo albo groził(a), że to zrobi?', disorder: 'borderline', messageSignals: NA },
  { id: 98, text: 'Czy kiedykolwiek przypalał(a) się Pan(i), ciął(a) lub celowo robił(a) sobie krzywdę?', disorder: 'borderline', messageSignals: NA },
  { id: 99, text: 'Czy miewa Pan(i) nagłe zmiany nastroju?', disorder: 'borderline', messageSignals: 'Rapid emotional shifts in messages, intense mood swings within single conversation, emotional lability' },
  { id: 100, text: 'Czy często czuje się Pan(i) pusty(a) w środku?', disorder: 'borderline', messageSignals: 'Expressing emptiness, describing void or numbness, feeling nothing, dissociative language' },
  { id: 101, text: 'Czy często miewa Pan(i) wybuchy emocji lub napady złości, nad którymi trudno zapanować?', disorder: 'borderline', messageSignals: 'Intense anger over minor issues, disproportionate rage, explosive reactions in messages' },
  { id: 102, text: 'Czy bije Pan(i) ludzi lub rzuca w nich przedmiotami?', disorder: 'borderline', messageSignals: NA },
  { id: 103, text: 'Czy nawet drobiazgi wywołują gniew Pan(i)?', disorder: 'borderline', messageSignals: 'Overreactions to minor events, disproportionate anger, others commenting on intensity of reactions' },
  { id: 104, text: 'Czy kiedy jest w dużym stresie, staje się Pan(i) podejrzliwy(a) i traci kontakt z rzeczywistością?', disorder: 'borderline', messageSignals: 'Paranoid episodes during stress, dissociative language under pressure, losing grip on reality in crises' },

  // ── ANTISOCIAL (105-119) — all childhood/criminal behavior, cannot assess ──
  { id: 105, text: 'Czy przed 15. rokiem życia prześladował(a) Pan(i) inne dzieci lub groził(a) im?', disorder: 'antisocial', messageSignals: NA },
  { id: 106, text: 'Czy przed 15. rokiem życia wszczynał(a) Pan(i) bójki?', disorder: 'antisocial', messageSignals: NA },
  { id: 107, text: 'Czy przed 15. rokiem życia używał(a) Pan(i) broni mogącej wyrządzić poważną krzywdę?', disorder: 'antisocial', messageSignals: NA },
  { id: 108, text: 'Czy przed 15. rokiem życia celowo torturował(a) Pan(i) kogoś lub sprawiał(a) cierpienie?', disorder: 'antisocial', messageSignals: NA },
  { id: 109, text: 'Czy przed 15. rokiem życia celowo krzywdził(a) Pan(i) lub torturował(a) zwierzęta?', disorder: 'antisocial', messageSignals: NA },
  { id: 110, text: 'Czy przed 15. rokiem życia okradł(a) Pan(i) kogoś, napadł(a) lub zabrał(a) coś przy użyciu przemocy?', disorder: 'antisocial', messageSignals: NA },
  { id: 111, text: 'Czy przed 15. rokiem życia zmusił(a) Pan(i) kogoś do uprawiania seksu lub rozebrania się?', disorder: 'antisocial', messageSignals: NA },
  { id: 112, text: 'Czy przed 15. rokiem życia wzniecił(a) Pan(i) pożar?', disorder: 'antisocial', messageSignals: NA },
  { id: 113, text: 'Czy przed 15. rokiem życia celowo niszczył(a) Pan(i) cudze rzeczy?', disorder: 'antisocial', messageSignals: NA },
  { id: 114, text: 'Czy przed 15. rokiem życia włamał(a) się Pan(i) do domu, budynku lub samochodu?', disorder: 'antisocial', messageSignals: NA },
  { id: 115, text: 'Czy przed 15. rokiem życia okłamywał(a) Pan(i) lub "naciągał(a)" innych?', disorder: 'antisocial', messageSignals: NA },
  { id: 116, text: 'Czy przed 15. rokiem życia ukradł(a) Pan(i) coś (np. w sklepie) lub podrobił(a) czyjś podpis?', disorder: 'antisocial', messageSignals: NA },
  { id: 117, text: 'Czy przed 15. rokiem życia uciekł(a) Pan(i) z domu lub spędził(a) noc poza domem?', disorder: 'antisocial', messageSignals: NA },
  { id: 118, text: 'Czy przed 13. rokiem życia często zostawał(a) Pan(i) do późna poza domem?', disorder: 'antisocial', messageSignals: NA },
  { id: 119, text: 'Czy przed 13. rokiem życia często opuszczał(a) Pan(i) zajęcia w szkole?', disorder: 'antisocial', messageSignals: NA },
];

// ============================================================
// CONSTANTS
// ============================================================

export const SCID_REQUIREMENTS: SCIDScreeningRequirements = {
  minMessages: 2000,
  minTimespanMonths: 6,
  requiresCompletedPasses: [1, 2, 3],
};

export const SCID_DISCLAIMER =
  'To jest narzędzie przesiewowe, NIE diagnostyczne. Przekroczenie progu wskazuje na potrzebę konsultacji ze specjalistą — nie stanowi diagnozy zaburzenia osobowości.';

export const SCID_SECONDARY_DISCLAIMER =
  'Analiza oparta wyłącznie na wzorcach komunikacji tekstowej ma istotne ograniczenia. Niektóre pytania nie mogą być ocenione na podstawie wiadomości.';

// ============================================================
// HELPERS
// ============================================================

export function getDisorderByKey(key: string): SCIDDisorder | undefined {
  return SCID_DISORDERS.find((d) => d.key === key);
}

export function getQuestionById(id: number): SCIDQuestion | undefined {
  return SCID_QUESTIONS.find((q) => q.id === id);
}

export function getQuestionsForDisorder(disorderKey: string): SCIDQuestion[] {
  const disorder = getDisorderByKey(disorderKey);
  if (!disorder) return [];
  return SCID_QUESTIONS.filter((q) => disorder.questions.includes(q.id));
}

export function isQuestionAssessable(question: SCIDQuestion): boolean {
  return !question.messageSignals.includes('CANNOT ASSESS');
}

export function calculateDisorderResults(
  answers: Record<number, SCIDAnswer>,
): Record<string, SCIDDisorderResult> {
  const results: Record<string, SCIDDisorderResult> = {};

  for (const disorder of SCID_DISORDERS) {
    const disorderAnswers: Record<number, SCIDAnswer> = {};
    let yesCount = 0;
    let totalAnswerable = 0;
    let totalConfidence = 0;
    let answerCount = 0;

    for (const questionId of disorder.questions) {
      const answer = answers[questionId];
      if (answer) {
        disorderAnswers[questionId] = answer;
        if (answer.answer !== null) {
          totalAnswerable++;
          if (answer.answer) yesCount++;
          totalConfidence += answer.confidence;
          answerCount++;
        }
      }
    }

    const avgConfidence = answerCount > 0 ? Math.round(totalConfidence / answerCount) : 0;
    const percentage =
      disorder.threshold > 0 ? Math.min(Math.round((yesCount / disorder.threshold) * 100), 100) : 0;

    results[disorder.key] = {
      yesCount,
      total: totalAnswerable,
      threshold: disorder.threshold,
      meetsThreshold: yesCount >= disorder.threshold,
      percentage,
      confidence: avgConfidence,
      answers: disorderAnswers,
    };
  }

  return results;
}

export function meetsSCIDRequirements(
  messageCount: number,
  timespanMs: number,
  completedPasses: number[],
): { meets: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (messageCount < SCID_REQUIREMENTS.minMessages) {
    reasons.push(`Za mało wiadomości (${messageCount}/${SCID_REQUIREMENTS.minMessages})`);
  }

  const timespanMonths = timespanMs / (1000 * 60 * 60 * 24 * 30);
  if (timespanMonths < SCID_REQUIREMENTS.minTimespanMonths) {
    reasons.push(
      `Zbyt krótki okres czasu (${Math.round(timespanMonths)}/${SCID_REQUIREMENTS.minTimespanMonths} miesięcy)`,
    );
  }

  const missingPasses = SCID_REQUIREMENTS.requiresCompletedPasses.filter(
    (p) => !completedPasses.includes(p),
  );
  if (missingPasses.length > 0) {
    reasons.push(`Wymagane są ukończone analizy AI: ${missingPasses.join(', ')}`);
  }

  return { meets: reasons.length === 0, reasons };
}

export function getTopDisorders(
  results: Record<string, SCIDDisorderResult>,
  count: number = 4,
): Array<{ key: string; result: SCIDDisorderResult; disorder: SCIDDisorder }> {
  return Object.entries(results)
    .map(([key, result]) => ({
      key,
      result,
      disorder: getDisorderByKey(key)!,
    }))
    .filter((item) => item.disorder)
    .sort((a, b) => b.result.percentage - a.result.percentage)
    .slice(0, count);
}

export function getOverallRiskLevel(results: Record<string, SCIDDisorderResult>): {
  level: 'low' | 'moderate' | 'high' | 'very_high';
  description: string;
} {
  const thresholdMet = Object.values(results).filter((r) => r.meetsThreshold).length;
  const highPercentage = Object.values(results).filter((r) => r.percentage >= 75).length;

  if (thresholdMet >= 2 || highPercentage >= 3) {
    return {
      level: 'very_high',
      description: 'Wiele wskaźników wskazuje na potrzebę konsultacji specjalistycznej',
    };
  }
  if (thresholdMet === 1 || highPercentage >= 2) {
    return { level: 'high', description: 'Wykryto wzorce wymagające uwagi specjalisty' };
  }
  if (highPercentage >= 1) {
    return { level: 'moderate', description: 'Niektóre wzorce mogą wymagać obserwacji' };
  }
  return { level: 'low', description: 'Nie wykryto istotnych wskaźników' };
}
