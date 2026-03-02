/**
 * Communication Pattern Screener (CPS)
 *
 * Analyzes recurring communication patterns observable in text messages.
 * All questions are original, written in Polish, and designed to be
 * assessable purely from chat message analysis.
 *
 * DISCLAIMER: This is NOT a psychological diagnosis tool. It identifies
 * recurring communication patterns — not personality disorders.
 */

// ============================================================
// TYPES
// ============================================================

export interface CPSQuestion {
  id: number;
  text: string; // Polish question text (original)
  pattern: string; // pattern key
  messageSignals: string; // what AI should look for in messages
}

export interface CPSPattern {
  key: string;
  name: string; // Polish descriptive name (NOT DSM-5)
  nameEn: string; // English name
  description: string; // 1-sentence description
  color: string;
  threshold: number;
  questions: number[]; // question IDs
  recommendation: string; // what to suggest if threshold met
}

export interface CPSAnswer {
  answer: boolean | null;
  confidence: number;
  evidence: string[];
}

export type CPSFrequencyLevel = 'not_observed' | 'occasional' | 'recurring' | 'pervasive';

export interface CPSPatternResult {
  yesCount: number;
  total: number;
  threshold: number;
  meetsThreshold: boolean;
  percentage: number;
  frequency: CPSFrequencyLevel;
  confidence: number;
  answers: Record<number, CPSAnswer>;
}

export interface CPSResult {
  answers: Record<number, CPSAnswer>;
  patterns: Record<string, CPSPatternResult>;
  overallConfidence: number;
  disclaimer: string;
  analyzedAt: number;
  participantName: string;
}

export interface CPSScreeningRequirements {
  minMessages: number;
  minTimespanMonths: number;
  requiresCompletedPasses: number[];
}

// ============================================================
// 10 PATTERNS
// ============================================================

export const CPS_PATTERNS: CPSPattern[] = [
  {
    key: 'intimacy_avoidance',
    name: 'Unikanie bliskości',
    nameEn: 'Intimacy Avoidance',
    description: 'Unikanie osobistych tematów, dystans emocjonalny w komunikacji.',
    color: '#6366f1',
    threshold: 4,
    questions: [1, 2, 3, 4, 5, 6],
    recommendation: 'Warto zwrócić uwagę na stopniowe otwieranie się w rozmowach — małe kroki w kierunku dzielenia się emocjami mogą wzmocnić relację.',
  },
  {
    key: 'over_dependence',
    name: 'Nadmierna zależność',
    nameEn: 'Over-Dependence',
    description: 'Ciągłe szukanie wsparcia, trudność z autonomią w podejmowaniu decyzji.',
    color: '#8b5cf6',
    threshold: 4,
    questions: [7, 8, 9, 10, 11, 12, 13],
    recommendation: 'Rozwijanie samodzielności w podejmowaniu decyzji i budowanie pewności siebie poza relacją może pomóc w zrównoważeniu dynamiki.',
  },
  {
    key: 'control_perfectionism',
    name: 'Kontrola i perfekcjonizm',
    nameEn: 'Control & Perfectionism',
    description: 'Potrzeba kontroli nad sytuacjami i ludźmi, sztywne standardy komunikacji.',
    color: '#3b82f6',
    threshold: 4,
    questions: [14, 15, 16, 17, 18, 19],
    recommendation: 'Praktykowanie elastyczności i akceptacji niedoskonałości — nie każda rozmowa musi przebiegać według planu.',
  },
  {
    key: 'suspicion_distrust',
    name: 'Podejrzliwość i nieufność',
    nameEn: 'Suspicion & Distrust',
    description: 'Nieufność wobec intencji innych, szukanie ukrytych znaczeń w wiadomościach.',
    color: '#ef4444',
    threshold: 4,
    questions: [20, 21, 22, 23, 24, 25, 26],
    recommendation: 'Budowanie zaufania wymaga czasu — warto rozważyć, czy interpretacje wiadomości nie są nadmiernie negatywne.',
  },
  {
    key: 'self_focused',
    name: 'Egocentryzm komunikacyjny',
    nameEn: 'Self-Focused Communication',
    description: 'Skupienie rozmów na sobie, bagatelizowanie tematów i problemów rozmówcy.',
    color: '#f59e0b',
    threshold: 4,
    questions: [27, 28, 29, 30, 31, 32],
    recommendation: 'Świadome zadawanie pytań o drugą osobę i aktywne słuchanie mogą znacząco poprawić jakość komunikacji.',
  },
  {
    key: 'emotional_intensity',
    name: 'Intensywność emocjonalna',
    nameEn: 'Emotional Intensity',
    description: 'Silne reakcje emocjonalne, szybkie zmiany nastroju, strach przed porzuceniem.',
    color: '#dc2626',
    threshold: 4,
    questions: [33, 34, 35, 36, 37, 38, 39],
    recommendation: 'Techniki regulacji emocji i odczekanie przed wysłaniem wiadomości w silnych emocjach mogą pomóc w stabilizacji komunikacji.',
  },
  {
    key: 'dramatization',
    name: 'Dramatyzacja i szukanie uwagi',
    nameEn: 'Dramatization & Attention-Seeking',
    description: 'Przesadne reakcje, teatralność w komunikacji, potrzeba bycia w centrum.',
    color: '#ec4899',
    threshold: 4,
    questions: [40, 41, 42, 43, 44, 45],
    recommendation: 'Próba wyrażania emocji w sposób proporcjonalny do sytuacji i dawanie przestrzeni rozmówcy może wzmocnić relację.',
  },
  {
    key: 'manipulation_low_empathy',
    name: 'Instrumentalna komunikacja',
    nameEn: 'Instrumental Communication & Low Empathy',
    description: 'Wzorzec komunikacji skoncentrowany na własnych celach, ograniczone współczucie i zrozumienie potrzeb rozmówcy.',
    color: '#1e293b',
    threshold: 3,
    questions: [46, 47, 48, 49, 50, 51],
    recommendation: 'Rozwijanie empatii i uważności na potrzeby drugiej osoby jest kluczowe dla zdrowej komunikacji.',
  },
  {
    key: 'emotional_distance',
    name: 'Emocjonalny dystans',
    nameEn: 'Emotional Distance',
    description: 'Obojętność emocjonalna, ograniczone wyrażanie uczuć, preferencja samotności.',
    color: '#64748b',
    threshold: 4,
    questions: [52, 53, 54, 55, 56, 57],
    recommendation: 'Stopniowe wyrażanie emocji — nawet prostymi słowami — może pomóc rozmówcy poczuć się bardziej widzianym w relacji.',
  },
  {
    key: 'passive_aggression',
    name: 'Pasywna agresja',
    nameEn: 'Passive Aggression',
    description: 'Sabotaż, sarkazm, pośrednie wyrażanie niezadowolenia zamiast otwartej komunikacji.',
    color: '#0ea5e9',
    threshold: 3,
    questions: [58, 59, 60, 61, 62, 63],
    recommendation: 'Bezpośrednie wyrażanie niezadowolenia — zamiast aluzji i sarkazmu — buduje zdrowsze relacje.',
  },
];

// ============================================================
// ALL 63 QUESTIONS (original, Polish, assessable from messages)
// ============================================================

export const CPS_QUESTIONS: CPSQuestion[] = [
  // ── INTIMACY AVOIDANCE (1-6) ──
  {
    id: 1,
    text: 'Czy osoba unika odpowiadania na osobiste pytania?',
    pattern: 'intimacy_avoidance',
    messageSignals: 'Deflecting personal questions, changing topics when asked about feelings, ignoring direct emotional questions',
  },
  {
    id: 2,
    text: 'Czy osoba reaguje krótko na emocjonalne wiadomości?',
    pattern: 'intimacy_avoidance',
    messageSignals: 'Minimal responses to emotional messages — "ok", "spoko", "no" to heartfelt texts, one-word replies to vulnerability',
  },
  {
    id: 3,
    text: 'Czy osoba rzadko inicjuje rozmowy o uczuciach?',
    pattern: 'intimacy_avoidance',
    messageSignals: 'Rarely starting conversations about emotions or feelings, never bringing up how they feel unprompted',
  },
  {
    id: 4,
    text: 'Czy osoba preferuje tematy bezosobowe (praca, pogoda, logistyka)?',
    pattern: 'intimacy_avoidance',
    messageSignals: 'Steering conversations to impersonal topics like work, logistics, weather, news — avoiding personal depth',
  },
  {
    id: 5,
    text: 'Czy osoba unika planowania wspólnej przyszłości lub rozmów o relacji?',
    pattern: 'intimacy_avoidance',
    messageSignals: 'Avoiding future planning discussions, deflecting when relationship direction is brought up, vague about commitment',
  },
  {
    id: 6,
    text: 'Czy osoba dystansuje się gdy rozmowa staje się intymna lub głęboka?',
    pattern: 'intimacy_avoidance',
    messageSignals: 'Pulling back when conversation gets intimate — sudden humor, topic change, delayed responses, or going silent after emotional exchange',
  },

  // ── OVER-DEPENDENCE (7-13) ──
  {
    id: 7,
    text: 'Czy osoba często prosi o radę w drobnych, codziennych sprawach?',
    pattern: 'over_dependence',
    messageSignals: 'Asking for advice on trivial decisions — what to eat, wear, say — needing validation for minor choices',
  },
  {
    id: 8,
    text: 'Czy osoba wyraża lęk przed samodzielnymi decyzjami?',
    pattern: 'over_dependence',
    messageSignals: 'Expressing fear or anxiety about making decisions alone, phrases like "nie wiem co zrobić bez ciebie", "zdecyduj za mnie"',
  },
  {
    id: 9,
    text: 'Czy osoba reaguje paniką na brak odpowiedzi lub dłuższą ciszę?',
    pattern: 'over_dependence',
    messageSignals: 'Panicked follow-up messages when no response — "halo?", "jesteś tam?", "czemu nie odpisujesz?", rapid multiple messages',
  },
  {
    id: 10,
    text: 'Czy osoba ciągle szuka potwierdzenia, że relacja jest w porządku?',
    pattern: 'over_dependence',
    messageSignals: 'Reassurance-seeking about the relationship — "wszystko ok między nami?", "jesteś na mnie zły?", "nadal mnie lubisz?"',
  },
  {
    id: 11,
    text: 'Czy osoba ma trudność z wyrażaniem sprzeciwu lub odmowy?',
    pattern: 'over_dependence',
    messageSignals: 'Always agreeing, never saying no, going along with everything even when uncomfortable, people-pleasing patterns',
  },
  {
    id: 12,
    text: 'Czy osoba podporządkowuje swoje plany planom rozmówcy?',
    pattern: 'over_dependence',
    messageSignals: 'Always adapting own schedule to partner, canceling own plans, "jak chcesz", "dla ciebie wszystko zmienię"',
  },
  {
    id: 13,
    text: 'Czy osoba wyraża poczucie bezradności gdy jest sama?',
    pattern: 'over_dependence',
    messageSignals: 'Expressing helplessness when alone, inability to function independently, constant need for companionship in messages',
  },

  // ── CONTROL & PERFECTIONISM (14-19) ──
  {
    id: 14,
    text: 'Czy osoba koryguje sposób pisania lub wypowiedzi rozmówcy?',
    pattern: 'control_perfectionism',
    messageSignals: 'Correcting grammar, spelling, phrasing of others, pointing out errors, insisting on "proper" communication',
  },
  {
    id: 15,
    text: 'Czy osoba narzuca strukturę i reguły rozmowie?',
    pattern: 'control_perfectionism',
    messageSignals: 'Setting rules for how/when to communicate, demanding specific formats, creating rigid conversation structures',
  },
  {
    id: 16,
    text: 'Czy osoba reaguje negatywnie gdy coś nie idzie według planu?',
    pattern: 'control_perfectionism',
    messageSignals: 'Frustration or anger when plans change, difficulty with spontaneity, rigid adherence to schedules',
  },
  {
    id: 17,
    text: 'Czy osoba ma trudność z przyjęciem innego punktu widzenia?',
    pattern: 'control_perfectionism',
    messageSignals: 'Inflexible opinions, refusing to consider other viewpoints, insisting they are right, stubborn in discussions',
  },
  {
    id: 18,
    text: 'Czy osoba mikromanaguje wspólne aktywności lub plany?',
    pattern: 'control_perfectionism',
    messageSignals: 'Micromanaging details of plans, excessive instructions, needing to control how things are done, over-planning',
  },
  {
    id: 19,
    text: 'Czy osoba stawia nierealistycznie wysokie wymagania sobie lub rozmówcy?',
    pattern: 'control_perfectionism',
    messageSignals: 'Perfectionist standards applied to self or others, disappointment at minor imperfections, "to nie jest wystarczająco dobre"',
  },

  // ── SUSPICION & DISTRUST (20-26) ──
  {
    id: 20,
    text: 'Czy osoba szuka ukrytych znaczeń w zwykłych wiadomościach?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Reading negative intent into neutral messages, "co miałeś przez to na myśli?", perceiving hidden meanings',
  },
  {
    id: 21,
    text: 'Czy osoba regularnie sprawdza lub wypytuje o kontakty rozmówcy z innymi?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Interrogating about who they talked to, jealous questions about other people, monitoring social interactions',
  },
  {
    id: 22,
    text: 'Czy osoba wraca do dawnych zranień i nie potrafi puścić ich w niepamięć?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Holding grudges, bringing up old conflicts repeatedly, referencing past wrongs, inability to forgive and move on',
  },
  {
    id: 23,
    text: 'Czy osoba reaguje defensywnie na niewinne komentarze?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Defensive responses to neutral feedback, perceiving criticism where none exists, taking jokes personally',
  },
  {
    id: 24,
    text: 'Czy osoba oskarża rozmówcę o kłamstwo bez wyraźnych dowodów?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Baseless accusations of lying, demanding proof of truthfulness, "na pewno kłamiesz", cross-examining statements',
  },
  {
    id: 25,
    text: 'Czy osoba jest podejrzliwa wobec motywacji działań rozmówcy?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Questioning why someone is being nice, suspecting ulterior motives, "czemu to robisz? co chcesz?"',
  },
  {
    id: 26,
    text: 'Czy osoba unika dzielenia się informacjami o sobie z obawy przed wykorzystaniem?',
    pattern: 'suspicion_distrust',
    messageSignals: 'Withholding personal information out of fear, guarded self-disclosure, evasive about personal details, not trusting with secrets',
  },

  // ── SELF-FOCUSED (27-32) ──
  {
    id: 27,
    text: 'Czy osoba sprowadza większość tematów do siebie?',
    pattern: 'self_focused',
    messageSignals: 'Redirecting conversation topics back to themselves, "a u mnie...", turning others stories into own experiences',
  },
  {
    id: 28,
    text: 'Czy osoba bagatelizuje problemy lub sukcesy rozmówcy?',
    pattern: 'self_focused',
    messageSignals: 'Minimizing others achievements or problems — "to nic takiego", "mi było gorzej", dismissive of others experiences',
  },
  {
    id: 29,
    text: 'Czy osoba rzadko zadaje pytania o życie i samopoczucie rozmówcy?',
    pattern: 'self_focused',
    messageSignals: 'Very few follow-up questions about the other person, not asking "jak się czujesz?", monologue-style messaging',
  },
  {
    id: 30,
    text: 'Czy osoba oczekuje podziwu lub uznania za swoje osiągnięcia?',
    pattern: 'self_focused',
    messageSignals: 'Fishing for compliments, sharing achievements expecting praise, disappointed when not acknowledged, validation-seeking',
  },
  {
    id: 31,
    text: 'Czy osoba przerywa wątki rozmówcy własnymi tematami?',
    pattern: 'self_focused',
    messageSignals: 'Interrupting others topics with own stories, not acknowledging what was said, abrupt topic changes to self-relevant subjects',
  },
  {
    id: 32,
    text: 'Czy osoba reaguje obojętnie gdy rozmówca dzieli się czymś ważnym?',
    pattern: 'self_focused',
    messageSignals: 'Lack of engagement with others important news, minimal response to significant events in others life, emotional disinterest',
  },

  // ── EMOTIONAL INTENSITY (33-39) ──
  {
    id: 33,
    text: 'Czy osoba reaguje nieproporcjonalnie silnie na drobne sytuacje?',
    pattern: 'emotional_intensity',
    messageSignals: 'Disproportionate emotional reactions to minor events, explosive responses to small issues, catastrophizing trivial matters',
  },
  {
    id: 34,
    text: 'Czy osoba szybko przechodzi od entuzjazmu do rozpaczy w rozmowie?',
    pattern: 'emotional_intensity',
    messageSignals: 'Rapid mood shifts within single conversation, from excitement to despair, emotional volatility in message tone',
  },
  {
    id: 35,
    text: 'Czy osoba wyraża silny lęk przed odrzuceniem lub porzuceniem?',
    pattern: 'emotional_intensity',
    messageSignals: 'Fear of abandonment — "nie zostawiaj mnie", "proszę nie odchodź", panic when relationship feels threatened',
  },
  {
    id: 36,
    text: 'Czy osoba wysyła wiele wiadomości z rzędu gdy jest zdenerwowana?',
    pattern: 'emotional_intensity',
    messageSignals: 'Flooding — sending many consecutive emotional messages, escalating tone, inability to wait for response when upset',
  },
  {
    id: 37,
    text: 'Czy osoba idealizuje rozmówcę a potem gwałtownie go krytykuje?',
    pattern: 'emotional_intensity',
    messageSignals: 'Polaryzacja (czarno-białe myślenie) — cycling between idealization ("jesteś najlepszy") and devaluation ("jesteś okropny"), black-and-white view of person',
  },
  {
    id: 38,
    text: 'Czy osoba grozi zakończeniem relacji podczas kłótni?',
    pattern: 'emotional_intensity',
    messageSignals: 'Threatening to end relationship during conflicts, ultimatums, "to koniec", "odchodzę" as emotional weapon, not genuine intent',
  },
  {
    id: 39,
    text: 'Czy emocjonalne wybuchy osoby prowadzą do żalu i przeprosin?',
    pattern: 'emotional_intensity',
    messageSignals: 'Anger-regret cycles — intense outburst followed by apologies, "przepraszam nie wiem co mnie napadło", repeated pattern of eruption then guilt',
  },

  // ── DRAMATIZATION & ATTENTION-SEEKING (40-45) ──
  {
    id: 40,
    text: 'Czy osoba używa przesadnego języka do opisywania codziennych sytuacji?',
    pattern: 'dramatization',
    messageSignals: 'Hyperbolic language — "NAJGORSZY dzień w moim życiu" for minor inconvenience, excessive superlatives, everything is extreme',
  },
  {
    id: 41,
    text: 'Czy osoba domaga się natychmiastowej uwagi i reakcji?',
    pattern: 'dramatization',
    messageSignals: 'Demanding immediate responses, "ODPISZ MI", urgency markers on non-urgent messages, impatience with any delay',
  },
  {
    id: 42,
    text: 'Czy osoba tworzy sytuacje kryzysowe aby przyciągnąć uwagę?',
    pattern: 'dramatization',
    messageSignals: 'Manufacturing crises for attention, vague alarming messages ("coś strasznego się stało"), dramatic reveals that turn out minor',
  },
  {
    id: 43,
    text: 'Czy osoba reaguje teatralnie na zwykłe informacje?',
    pattern: 'dramatization',
    messageSignals: 'Theatrical reactions to ordinary news, excessive punctuation/emoji/caps, over-the-top emotional displays in text',
  },
  {
    id: 44,
    text: 'Czy osoba jest niezadowolona gdy nie jest w centrum rozmowy?',
    pattern: 'dramatization',
    messageSignals: 'Discomfort when not center of attention, redirecting group conversations to self, sulking when others are the focus',
  },
  {
    id: 45,
    text: 'Czy osoba często opowiada historie w sposób wyolbrzymiony?',
    pattern: 'dramatization',
    messageSignals: 'Exaggerating stories for effect, embellishing details, making ordinary events sound extraordinary, storytelling for impact rather than accuracy',
  },

  // ── INSTRUMENTAL COMMUNICATION & LOW EMPATHY (46-51) ──
  {
    id: 46,
    text: 'Czy osoba używa poczucia winy jako narzędzia wpływu?',
    pattern: 'manipulation_low_empathy',
    messageSignals: 'Guilt-tripping — "po tym co dla ciebie zrobiłem", "gdyby ci zależało to byś...", emotional leverage through guilt induction',
  },
  {
    id: 47,
    text: 'Czy osoba bagatelizuje uczucia rozmówcy lub mówi że przesadza?',
    pattern: 'manipulation_low_empathy',
    messageSignals: 'Invalidating emotions — "przesadzasz", "nie masz powodu się denerwować", "to nic takiego", dismissing expressed feelings',
  },
  {
    id: 48,
    text: 'Czy osoba kontaktuje się głównie gdy czegoś potrzebuje?',
    pattern: 'manipulation_low_empathy',
    messageSignals: 'Instrumental contact pattern — reaching out only when needing something, disappearing when others need help, transactional relationship',
  },
  {
    id: 49,
    text: 'Czy osoba przekręca słowa rozmówcy lub zaprzecza temu co powiedziała?',
    pattern: 'manipulation_low_empathy',
    messageSignals: 'Zaprzeczanie i przekręcanie — "nigdy tak nie powiedziałem", twisting previous statements, contradicting what is visible in chat history',
  },
  {
    id: 50,
    text: 'Czy osoba ignoruje granice wyraźnie postawione przez rozmówcę?',
    pattern: 'manipulation_low_empathy',
    messageSignals: 'Boundary violation — continuing after being told to stop, pushing past stated limits, disregarding explicit requests for space',
  },
  {
    id: 51,
    text: 'Czy osoba okazuje brak zainteresowania gdy rozmówca jest w złym stanie emocjonalnym?',
    pattern: 'manipulation_low_empathy',
    messageSignals: 'Lack of empathy when other person is struggling — changing topic, minimal "ok" responses to distress, no comfort or support offered',
  },

  // ── EMOTIONAL DISTANCE (52-57) ──
  {
    id: 52,
    text: 'Czy osoba odpowiada na wiadomości w sposób zdawkowy i suchy?',
    pattern: 'emotional_distance',
    messageSignals: 'Consistently terse responses — one-word answers, no elaboration, minimal engagement, dry factual replies to emotional messages',
  },
  {
    id: 53,
    text: 'Czy osoba rzadko używa emocjonalnego języka (czuję, kocham, tęsknię)?',
    pattern: 'emotional_distance',
    messageSignals: 'Absence of emotional vocabulary, never expressing feelings, purely factual/logistical communication, no warmth markers',
  },
  {
    id: 54,
    text: 'Czy osoba ignoruje emocjonalne wiadomości lub odpowiada na nie z dużym opóźnieniem?',
    pattern: 'emotional_distance',
    messageSignals: 'Selectively ignoring emotional content while responding to practical messages, long delays only on emotional topics',
  },
  {
    id: 55,
    text: 'Czy osoba preferuje komunikację czysto informacyjną?',
    pattern: 'emotional_distance',
    messageSignals: 'Messages are purely functional — logistics, facts, schedules — with no personal or emotional content, treating chat like email',
  },
  {
    id: 56,
    text: 'Czy osoba nie reaguje na próby zbliżenia emocjonalnego ze strony rozmówcy?',
    pattern: 'emotional_distance',
    messageSignals: 'No reciprocation when other person tries to connect emotionally, flat response to affection, not matching emotional energy',
  },
  {
    id: 57,
    text: 'Czy osoba wyraża preferencję do bycia sama lub dystansuje się od wspólnych aktywności?',
    pattern: 'emotional_distance',
    messageSignals: 'Expressing preference for solitude, declining invitations, avoiding joint activities, "wolę zostać sam/sama"',
  },

  // ── PASSIVE AGGRESSION (58-63) ──
  {
    id: 58,
    text: 'Czy osoba wyraża niezadowolenie w sposób pośredni (sarkazm, aluzje)?',
    pattern: 'passive_aggression',
    messageSignals: 'Sarcastic comments instead of direct complaints, "no jasne, super", veiled criticism, saying "fine" when clearly not fine',
  },
  {
    id: 59,
    text: 'Czy osoba "zapomina" o ustaleniach lub obietnicach gdy jest niezadowolona?',
    pattern: 'passive_aggression',
    messageSignals: 'Conveniently forgetting commitments after conflicts, selective memory, not following through on promises when upset',
  },
  {
    id: 60,
    text: 'Czy osoba stosuje ciszę milczenia jako karę?',
    pattern: 'passive_aggression',
    messageSignals: 'Silent treatment — prolonged non-response as punishment, ignoring messages deliberately, weaponized silence after disagreement',
  },
  {
    id: 61,
    text: 'Czy osoba mówi "nic mi nie jest" gdy wyraźnie coś jest nie tak?',
    pattern: 'passive_aggression',
    messageSignals: 'Denying upset while showing clear signs of it — "wszystko ok" with cold tone, "nic" when asked what is wrong, passive denial',
  },
  {
    id: 62,
    text: 'Czy osoba robi złośliwe komentarze ukryte za żartem?',
    pattern: 'passive_aggression',
    messageSignals: 'Hostile humor — mean comments disguised as jokes, "no żartowałem", hurtful remarks followed by "nie obrażaj się"',
  },
  {
    id: 63,
    text: 'Czy osoba sabotuje plany lub rozmowy gdy nie zgadza się z kierunkiem?',
    pattern: 'passive_aggression',
    messageSignals: 'Undermining plans through delays, half-hearted participation, creating obstacles, agreeing then not cooperating',
  },
];

// ============================================================
// CONSTANTS
// ============================================================

export const CPS_REQUIREMENTS: CPSScreeningRequirements = {
  minMessages: 2000,
  minTimespanMonths: 6,
  requiresCompletedPasses: [1],
};

export const CPS_DISCLAIMER =
  'To narzędzie analizuje wzorce komunikacji tekstowej i NIE stanowi diagnozy psychologicznej. Wyniki wskazują na powtarzające się wzorce w komunikacji — nie na zaburzenia osobowości.';

export const CPS_SECONDARY_DISCLAIMER =
  'Analiza oparta wyłącznie na wzorcach komunikacji tekstowej ma istotne ograniczenia. Wyniki dotyczą tego, JAK osoba komunikuje się w tej konkretnej relacji.';

// ============================================================
// HELPERS
// ============================================================

export function getPatternByKey(key: string): CPSPattern | undefined {
  return CPS_PATTERNS.find((p) => p.key === key);
}

export function getQuestionById(id: number): CPSQuestion | undefined {
  return CPS_QUESTIONS.find((q) => q.id === id);
}

/**
 * Derives a frequency level from the per-pattern percentage.
 * Percentage is (yesCount / totalAnswerable) * 100, so the scale
 * is normalized regardless of how many questions each pattern has.
 */
export function getPatternFrequency(percentage: number): CPSFrequencyLevel {
  if (percentage <= 0) return 'not_observed';
  if (percentage <= 25) return 'occasional';
  if (percentage <= 60) return 'recurring';
  return 'pervasive';
}

export function calculatePatternResults(
  answers: Record<number, CPSAnswer>,
): Record<string, CPSPatternResult> {
  const results: Record<string, CPSPatternResult> = {};

  for (const pattern of CPS_PATTERNS) {
    const patternAnswers: Record<number, CPSAnswer> = {};
    let yesCount = 0;
    let totalAnswerable = 0;
    let totalConfidence = 0;
    let answerCount = 0;

    for (const questionId of pattern.questions) {
      const answer = answers[questionId];
      if (answer) {
        patternAnswers[questionId] = answer;
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
      totalAnswerable > 0 ? Math.round((yesCount / totalAnswerable) * 100) : 0;
    const frequency = getPatternFrequency(percentage);

    results[pattern.key] = {
      yesCount,
      total: totalAnswerable,
      threshold: pattern.threshold,
      meetsThreshold: frequency === 'recurring' || frequency === 'pervasive',
      percentage,
      frequency,
      confidence: avgConfidence,
      answers: patternAnswers,
    };
  }

  return results;
}

export function getTopPatterns(
  results: Record<string, CPSPatternResult>,
  count: number = 4,
): Array<{ key: string; result: CPSPatternResult; pattern: CPSPattern }> {
  return Object.entries(results)
    .map(([key, result]) => ({
      key,
      result,
      pattern: getPatternByKey(key)!,
    }))
    .filter((item) => item.pattern)
    .sort((a, b) => b.result.percentage - a.result.percentage)
    .slice(0, count);
}

export function getOverallRiskLevel(results: Record<string, CPSPatternResult>): {
  level: 'niski' | 'umiarkowany' | 'podwyższony' | 'wysoki';
  description: string;
} {
  const thresholdMet = Object.values(results).filter((r) => r.meetsThreshold).length;
  const highPercentage = Object.values(results).filter((r) => r.percentage >= 75).length;

  if (thresholdMet >= 4 || highPercentage >= 5) {
    return {
      level: 'wysoki',
      description: 'Wiele wzorców komunikacyjnych przekracza progi — warto przyjrzeć się dynamice relacji.',
    };
  }
  if (thresholdMet >= 2 || highPercentage >= 3) {
    return {
      level: 'podwyższony',
      description: 'Wykryto wyraźne wzorce komunikacyjne wymagające uwagi.',
    };
  }
  if (thresholdMet >= 1 || highPercentage >= 1) {
    return {
      level: 'umiarkowany',
      description: 'Niektóre wzorce komunikacyjne mogą wymagać obserwacji.',
    };
  }
  return {
    level: 'niski',
    description: 'Nie wykryto istotnych powtarzających się wzorców problemowych.',
  };
}
