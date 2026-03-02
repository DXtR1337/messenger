/* ------------------------------------------------------------------ */
/*  methodology-data.ts — All algorithm descriptions for /metodologia  */
/* ------------------------------------------------------------------ */

export interface Source {
  author: string;
  year: number;
  doi?: string;
  url?: string;
}

export interface AlgorithmData {
  id: string;
  title: string;
  teaser: string;
  description: string;
  howItWorks: string;
  sources: Source[];
  limitations: string[];
  iconPath: string;
}

export interface SectionGroupData {
  id: string;
  title: string;
  accent: 'blue' | 'purple';
  algorithms: AlgorithmData[];
}

export interface MethodologySection {
  id: string;
  title: string;
  subtitle: string;
  accent: 'blue' | 'purple';
  groups: SectionGroupData[];
}

export interface SidebarItem {
  id: string;
  title: string;
  accent: 'blue' | 'purple';
  sectionId: string;
}

export const AI_GENERAL_LIMITATIONS = [
  'AI widzi do ~1500 celowanych wiadomości dzięki systemowi recon (Pass 0 + 0.5), nie losową próbkę',
  'AI NIE jest psychologiem ani terapeutą',
  'AI może się mylić — zwłaszcza przy sarkazmie, insajdach i żartach wewnętrznych',
  'Twoje surowe wiadomości NIGDY nie są zapisywane na serwerze',
];

/* ================================================================== */
/*  MATEMATYKA — 34 algorithms                                        */
/* ================================================================== */

const basicStats: AlgorithmData = {
  id: 'basic-stats',
  title: 'Licznik wiadomości',
  teaser: 'Zlicza ile wiadomości, słów, emoji i mediów wysłał każdy uczestnik.',
  description:
    'Liczymy dosłownie wszystko — ile wiadomości wysłałeś, ile słów napisałeś, jak długie były Twoje wiadomości, ile emoji wrzuciłeś, ile linków i zdjęć. Takie "statystyki profilu" ale dla Twojego czatu.',
  howItWorks:
    'Jeden przebieg przez wszystkie wiadomości, zliczamy per osoba: liczbę wiadomości, słów, znaków, emoji (z obsługą ZWJ — złożonych emoji jak 👨‍👩‍👧), mediów, linków, pytań (znaki "?").',
  sources: [],
  limitations: [
    'Nie rozróżniamy jakości wiadomości — "ok" i 500-słowowy esej to obie "1 wiadomość"',
    'Emoji ZWJ (np. 🏳️‍🌈) mogą się różnie liczyć w zależności od przeglądarki',
  ],
  iconPath: '/icons/methodology/basic-stats.png',
};

const activityMap: AlgorithmData = {
  id: 'activity-map',
  title: 'Mapa aktywności',
  teaser: 'Heatmapa pokazująca kiedy piszecie — każda godzina każdego dnia tygodnia.',
  description:
    'Taki "heatmap" Twojego czatu — pokazuje kiedy piszecie najwięcej. Każda godzina każdego dnia tygodnia ma swój kolor — od ciemnego (cisza) do jasnego (masakra wiadomości). Plus "najlepszy czas na wiadomość" — godzina, o której odpowiedzi przychodzą najszybciej.',
  howItWorks:
    'Siatka 7 dni × 24 godziny. Każda wiadomość ląduje w odpowiedniej komórce na podstawie timestampa. Kolor = natężenie.',
  sources: [],
  limitations: [
    'Używamy czasu z Twojej przeglądarki — jeśli rozmawiasz z kimś z innej strefy czasowej, ich godziny mogą wyglądać dziwnie',
    'Nie wiemy czy "cisza o 3 w nocy" to sen czy ignorowanie — widzimy tylko brak wiadomości',
  ],
  iconPath: '/icons/methodology/activity-map.png',
};

const responseTime: AlgorithmData = {
  id: 'response-time',
  title: 'Czas odpowiedzi',
  teaser: 'Mierzy ile czasu mija zanim ktoś odpisze — mediana, percentyle i trend.',
  description:
    'Mierzymy ile czasu mija zanim ktoś odpisze. Ale nie głupio — wiemy, że w polskim stylu pisania ludzie wysyłają 5 wiadomości pod rząd zamiast jednej długiej. Więc mierzymy od PIERWSZEJ nieodpowiedzianej wiadomości, nie od ostatniej.',
  howItWorks:
    'Mediana (nie średnia — bo jedna odpowiedź po 3 dniach rozwali średnią), percentyle (Q1, Q3, P90, P95), odchylenie standardowe, trend miesięczny (regresja liniowa), filtrowanie outlierów metodą IQR (odcinamy 3×IQR).',
  sources: [
    { author: 'Templeton et al.', year: 2022, doi: '10.1073/pnas.2116915119' },
    { author: 'Holtzman et al.', year: 2021 },
  ],
  limitations: [
    'Nie wiemy DLACZEGO ktoś nie odpisał — może spał, może pracował, może ignorował',
    'Wiadomości wysłane w nocy naturalnie mają długi czas odpowiedzi (ktoś śpi)',
    '2 minuty między wiadomościami od tej samej osoby traktujemy jako "kontynuację myśli", nie osobne wiadomości',
  ],
  iconPath: '/icons/methodology/response-time.png',
};

const responseTimeDistribution: AlgorithmData = {
  id: 'response-time-distribution',
  title: 'Rozkład czasów odpowiedzi',
  teaser: 'Histogram pokazujący ile odpowiedzi mieści się w każdym przedziale czasowym.',
  description:
    'Zamiast jednej średniej, pokazujemy PEŁNY rozkład Twoich czasów odpowiedzi. Ile razy odpowiedziałeś w mniej niż 10 sekund? Ile razy po godzinie? Histogram z 11 przedziałami — od błyskawicznych (<10s) do "odpisał po dobie" (24h+).',
  howItWorks:
    '11 binów czasowych: <10s, 10-30s, 30s-1m, 1-5m, 5-15m, 15-30m, 30m-1h, 1-2h, 2-6h, 6-24h, 24h+. Każdy czas odpowiedzi trafia do odpowiedniego bina. Wynik = count + procent per bin per osoba.',
  sources: [],
  limitations: [
    'Biny są stałe — nie dostosowują się do Twojego stylu pisania',
    'Nocne wiadomości automatycznie mają długi czas odpowiedzi (ktoś śpi)',
  ],
  iconPath: '/icons/methodology/response-time-distribution.png',
};

const sentiment: AlgorithmData = {
  id: 'sentiment',
  title: 'Sentyment wiadomości',
  teaser: 'Sprawdza czy Twoje wiadomości są pozytywne, negatywne czy neutralne.',
  description:
    'Sprawdzamy czy Twoje wiadomości są pozytywne, negatywne czy neutralne. Mamy słownik z ponad 13 000 polskich i angielskich słów z przypisanym "nastrojem". Rozumiemy też negacje — "nie lubię" to nie to samo co "lubię".',
  howItWorks:
    '7-warstwowy słownik: ręczny + plWordNet-emo + NAWL (Nencki Affective Word List) + rozszerzony PL + sentiment-polish + NAWL_PL + plWordNet 3.0. Każde słowo → wynik od -1 do +1. Negacja (nie/bez/ani) odwraca znak w oknie 2 słów. Polska odmiana: 12 reguł odcinania końcówek.',
  sources: [
    { author: 'Riegel et al.', year: 2015, doi: '10.1371/journal.pone.0132305' },
    { author: 'Maziarz et al.', year: 2016 },
    { author: 'Nielsen', year: 2011 },
  ],
  limitations: [
    'Słownik nie rozumie sarkazmu — "super, dzięki wielkie" po kłótni wyjdzie jako pozytywne',
    'Nie rozumie kontekstu — "zabiłam trening" (pozytywne potocznie) może wyjść neutralnie',
    'Emoji nie są analizowane pod kątem sentymentu (tylko zliczane)',
    '"Przepraszam" i "sorry" celowo NIE są negatywne — to zachowania naprawcze (Gottman)',
  ],
  iconPath: '/icons/methodology/sentiment.png',
};

const emotionalDiversity: AlgorithmData = {
  id: 'emotional-diversity',
  title: 'Paleta emocji',
  teaser: 'Sprawdza ile różnych kategorii emocji używasz — od radości po samotność.',
  description:
    'Czy piszesz tylko "haha" i "smutno" czy masz bogatą paletę emocji? Sprawdzamy ile różnych kategorii emocji używasz — od radości przez złość po dumę i samotność. Im więcej różnych emocji potrafisz wyrazić, tym wyższy wynik.',
  howItWorks:
    '12 kategorii emocji (Plutchik rozszerzony): radość, smutek, złość, strach, zaskoczenie, obrzydzenie, oczekiwanie, zaufanie, frustracja, czułość, samotność, duma. Wynik = 70% różnorodność + 30% gęstość. Korekcja V2: karamy "współwystępowanie" — jeśli zawsze piszesz te same emocje razem, to nie jest prawdziwa różnorodność.',
  sources: [
    { author: 'Kashdan et al.', year: 2015 },
    { author: 'Suvak et al.', year: 2011 },
    { author: 'Vishnubhotla et al.', year: 2024 },
  ],
  limitations: [
    'Leksykon ma 200+ słów PL+EN — nie pokrywa wszystkich sposobów wyrażania emocji',
    '"Nie wiem co czuję" to brak danych, nie niska granulacja',
    'Minimum 200 słów na osobę żeby wynik był sensowny',
  ],
  iconPath: '/icons/methodology/emotional-diversity.png',
};

const timeOrientation: AlgorithmData = {
  id: 'time-orientation',
  title: 'Przeszłość, teraźniejszość, przyszłość',
  teaser: 'Czy częściej mówisz o tym co było, co jest, czy co będzie?',
  description:
    'Czy częściej mówisz o tym co było ("wczoraj", "pamiętasz"), co jest ("teraz", "właśnie") czy co będzie ("jutro", "planuję")? To dużo mówi o tym jak myślisz o związku — osoby patrzące w przyszłość zwykle planują wspólne rzeczy.',
  howItWorks:
    'Markery czasowe PL+EN (20+ na kategorię). Liczymy per 1000 słów. futureIndex = przyszłość / (przeszłość + teraźniejszość + przyszłość). Klasyfikacja: prospektywny (≥0.35), prezentystyczny (≥0.20), retrospektywny (<0.20).',
  sources: [
    { author: 'Pennebaker et al.', year: 2007 },
    { author: 'Vanderbilt et al.', year: 2025 },
    { author: 'Park et al.', year: 2017 },
  ],
  limitations: [
    'Minimum 500 słów na osobę',
    'Nie rozumie kontekstu — "jutro" w "jutro mnie to nie obchodzi" to nie planowanie przyszłości',
    'Kalibracja na polski (język pro-drop zmienia proporcje vs angielski)',
  ],
  iconPath: '/icons/methodology/time-orientation.png',
};

const lsm: AlgorithmData = {
  id: 'lsm',
  title: 'Dopasowanie stylu (LSM)',
  teaser: 'Mierzy jak bardzo nieświadomie dopasowujecie do siebie styl pisania.',
  description:
    'Ludzie którzy się dogadują zaczynają nieświadomie pisać podobnie — używają tych samych "małych słówek" (przyimki, spójniki, zaimki). Im bardziej podobny styl, tym silniejsza więź. Sprawdzamy też kto się bardziej "dostosowuje" do kogo.',
  howItWorks:
    '9 kategorii słów funkcyjnych (LIWC): zaimki, przyimki, spójniki, przysłówki, negacje, kwantyfikatory itd. Dla każdej: LSM = 1 - |stawkaA - stawkaB| / (stawkaA + stawkaB). Średnia z kategorii gdzie oboje mają >0.1%.',
  sources: [
    { author: 'Ireland & Pennebaker', year: 2010, doi: '10.1177/0956797610392928' },
  ],
  limitations: [
    'Mierzy tylko słowa funkcyjne (jak, ale, więc) — nie treść rozmowy',
    '≥0.87 = bardzo wysokie, ale nawet obcy ludzie mają ~0.75 (język ma naturalną bazę)',
    'Nie znaczy, że niskie LSM = zły związek — może macie po prostu różne style i to jest OK',
  ],
  iconPath: '/icons/methodology/lsm.png',
};

const pronouns: AlgorithmData = {
  id: 'pronouns',
  title: 'Zaimki ja / my / ty',
  teaser: 'Ile razy mówisz "ja" vs "my" vs "ty" — i co to o Tobie mówi.',
  description:
    'Ile razy mówisz "ja" vs "my" vs "ty"? Dużo "my" = myślicie jako para. Dużo "ja" = skupienie na sobie. Dużo "ty" = albo zainteresowanie drugą osobą, albo obwinianie ("ty zawsze..."). W polskim to ekstra ciekawe bo normalnie nie musisz mówić "ja" — jak mówisz, to znaczy że to podkreślasz.',
  howItWorks:
    'Pełna polska odmiana (ja/mnie/mi/mną/moje + ty/ciebie/cię/ci/tobie + my/nas/nam/nami/nasze) + angielskie odpowiedniki. Per 1000 słów. Orientacja relacyjna = my/(ja+my) × 100%.',
  sources: [
    { author: 'Pennebaker', year: 2011 },
    { author: 'Karan et al.', year: 2019 },
  ],
  limitations: [
    'Minimum 200 słów na osobę (polski jest pro-drop — mniejsza próbka niż w angielskim)',
    'Nie rozróżniamy "ty" jako zainteresowanie vs "ty" jako atak',
    'W grupowych czatach "my" może oznaczać podgrupę, nie całą grupę',
  ],
  iconPath: '/icons/methodology/pronouns.png',
};

const vocabulary: AlgorithmData = {
  id: 'vocabulary',
  title: 'Bogactwo słownictwa',
  teaser: 'Algorytm MTLD mierzy różnorodność słownictwa niezależnie od długości tekstu.',
  description:
    'Czy powtarzasz te same 50 słów w kółko, czy masz bogate słownictwo? Używamy algorytmu MTLD, który jest jedynym wskaźnikiem różnorodności słownictwa, który NIE zależy od długości tekstu. Normalni ludzie w czacie: 40-60, formalni: 70-100, literaci: 100+.',
  howItWorks:
    'MTLD (Measure of Textual Lexical Diversity): idziemy przez tekst, liczymy stosunek nowych słów do wszystkich (TTR). Gdy TTR spadnie do 0.72, zaczynamy nowy segment. Powtarzamy od tyłu. MTLD = łączna liczba słów / liczba segmentów.',
  sources: [
    { author: 'McCarthy & Jarvis', year: 2010, doi: '10.3758/BRM.42.2.381' },
  ],
  limitations: [
    'Minimum 50 słów',
    'Czat ≠ esej — powtarzanie "haha" i "ok" jest normalne w messengerze',
    'Nie ocenia jakości słownictwa, tylko różnorodność',
  ],
  iconPath: '/icons/methodology/vocabulary.png',
};

const thinkingComplexity: AlgorithmData = {
  id: 'thinking-complexity',
  title: 'Złożoność myślenia',
  teaser: 'Szuka fraz pokazujących wielowymiarowe myślenie ("z jednej strony... ale z drugiej...").',
  description:
    'Czy widzisz świat czarno-biało ("to jest złe") czy potrafisz zobaczyć różne strony ("z jednej strony... ale z drugiej...")? Szukamy fraz które pokazują złożone myślenie — "jednakże", "mimo to", "biorąc pod uwagę". Im więcej takich fraz, tym wyższy wynik.',
  howItWorks:
    'Heurystyka oparta na Suedfeld & Tetlock — liczymy frazy dyferencjacyjne ("z drugiej strony", "jednak") i integracyjne ("biorąc pod uwagę", "w konsekwencji"). Wynik (0-100) = (dyf + integ×2) / wiadomości × 100 × 6.5 (kompresja na nieformalny czat).',
  sources: [
    { author: 'Suedfeld & Tetlock', year: 1977 },
    { author: 'Conway et al.', year: 2014, doi: '10.1111/pops.12021' },
  ],
  limitations: [
    'To HEURYSTYKA, nie walidowany AutoIC Conway\'a (który ma r=0.82 z ocenami ludzkimi, my nie)',
    'Minimum 30 wiadomości, ≥3 frazy IC',
    'Czat jest nieformalny — niski wynik NIE znaczy, że ktoś myśli prosto',
  ],
  iconPath: '/icons/methodology/thinking-complexity.png',
};

const conflicts: AlgorithmData = {
  id: 'conflicts',
  title: 'Wykrywacz kłótni',
  teaser: 'Szuka eskalacji, zimnej ciszy i typowych fraz kłótni typu "ty zawsze".',
  description:
    'Szukamy trzech sygnałów kłótni: (1) eskalacja — ktoś nagle pisze DUŻO WIĘCEJ niż zwykle, (2) zimna cisza — 3+ dni bez wiadomości po intensywnej wymianie, (3) rozwiązanie — rozmowa wraca po ciszy. Szukamy też typowych fraz kłótni jak "ty zawsze" i "ty nigdy".',
  howItWorks:
    'Eskalacja: rolling window 10 wiadomości, spike = 2× średnia długość w oknie 15 min. Bigramy: "ty zawsze", "ty nigdy", "twoja wina", "dlaczego ty". Cisza: ≥3 dni gap. Dedup: min 4h między raportowanymi wydarzeniami.',
  sources: [
    { author: 'Gottman & Levenson', year: 2000 },
  ],
  limitations: [
    'Nie wiemy czy długa wiadomość = kłótnia czy po prostu ktoś opowiada historię',
    '"Ty zawsze" może być żartem ("ty zawsze jesz moją pizzę")',
    '3 dni ciszy mogą być wakacjami, nie konfliktem',
  ],
  iconPath: '/icons/methodology/conflicts.png',
};

const conflictFingerprint: AlgorithmData = {
  id: 'conflict-fingerprint',
  title: 'Odcisk palca konfliktu',
  teaser: 'Profiluje jak każda osoba zachowuje się w kłótni vs normalnej rozmowie.',
  description:
    'Każdy kłóci się inaczej — jedni atakują wprost, inni dają cichą agresję, jeszcze inni uciekają. Analizujemy okna ±30 wiadomości wokół każdego wykrytego konfliktu i porównujemy zachowanie z bazą (normalną rozmową). Wynik: profil eskalacji, de-eskalacji i zmiana słownictwa w kłótni.',
  howItWorks:
    'Okno konfliktu = ±30 wiadomości od ConflictEvent. Per osoba: styl eskalacji (direct_attack / passive_aggressive / silent_withdrawal / mixed), styl de-eskalacji (apologize / deflect / ghost / topic_change / humor), stosunek długości wiadomości kłótnia/norma, zmiana czasu odpowiedzi, double-text rate w kłótni, interruption rate, top 20 słów konfliktowych.',
  sources: [
    { author: 'Gottman & Levenson', year: 2000 },
  ],
  limitations: [
    'Wymaga ≥3 wykrytych konfliktów żeby wynik był wiarygodny',
    'Okno ±30 wiadomości to heurystyka — kłótnia może trwać dłużej lub krócej',
    'Styl eskalacji to klasyfikacja, nie diagnoza — ludzie zmieniają styl zależnie od kontekstu',
  ],
  iconPath: '/icons/methodology/conflict-fingerprint.png',
};

const pursuitWithdrawal: AlgorithmData = {
  id: 'pursuit-withdrawal',
  title: 'Cykl pogoni i wycofania',
  teaser: 'Szuka cykli gdzie ktoś pisze i pisze, a druga osoba milczy godzinami.',
  description:
    'Klasyczny wzorzec w związkach: jedna osoba pisze i pisze (pogoń), druga milczy godzinami (wycofanie). Szukamy cykli gdzie ktoś wysyła 4+ wiadomości pod rząd bez odpowiedzi, a druga osoba milczy 4+ godziny.',
  howItWorks:
    'Demand markers: "halo?", "jesteś tam?", "odpowiedz", "??". ≥6 wiadomości pod rząd = zawsze flagujemy. 4-5 wiadomości = flagujemy tylko z demand markerami. Wycofanie = 4h+ bez odpowiedzi.',
  sources: [
    { author: 'Christensen & Heavey', year: 1990, doi: '10.1037/0022-3514.59.1.73' },
    { author: 'Schrodt et al.', year: 2014 },
  ],
  limitations: [
    '"Enter-as-comma" — Polacy często wysyłają 5 wiadomości w 30 sekund jako jedną myśl. To NIE jest pogoń',
    'Wycofanie może być snem, pracą, brak zasięgu',
    'Próg 4h jest arbitralny — dla kogoś 2h to dużo, dla kogoś 8h to norma',
  ],
  iconPath: '/icons/methodology/pursuit-withdrawal.png',
};

const repair: AlgorithmData = {
  id: 'repair',
  title: 'Naprawianie rozmów',
  teaser: 'Mierzy ile razy poprawiasz siebie ("tzn...") vs pytasz o wyjaśnienie ("co?").',
  description:
    'Kiedy coś powiesz źle, czy się poprawiasz ("tzn, miałem na myśli...") czy ignorujesz? A kiedy nie rozumiesz drugiej osoby, czy pytasz ("co masz na myśli?")? Więcej samonapraw = lepsza samoświadomość w komunikacji.',
  howItWorks:
    'Self-repair: "tzn", "to znaczy", "miałem na myśli", *poprawka (gwiazdka). Other-repair: "co?", "nie rozumiem", "what do you mean". Per 100 wiadomości. Repair initiation ratio = self / (self + other).',
  sources: [
    { author: 'Schegloff, Jefferson & Sacks', year: 1977 },
    { author: 'Norrick', year: 1991 },
  ],
  limitations: [
    'Minimum 10 wiadomości per osoba, ≥5 napraw łącznie',
    'Gwiazdka (*poprawka) to specyfika pisania — nie istnieje w mowie',
    '"Co?" może być zaskoczenie, nie prośba o wyjaśnienie',
  ],
  iconPath: '/icons/methodology/repair.png',
};

const conversationalNarcissism: AlgorithmData = {
  id: 'conversational-narcissism',
  title: 'Narcyzm konwersacyjny',
  teaser: 'Kto ciągnie koc na siebie? Mierzy shift-response vs support-response.',
  description:
    'Kiedy mówisz coś, a druga osoba odpowiada "u mnie też było tak..." i zmienia temat na siebie — to "shift-response" (przesunięcie). Gdy mówi "serio? opowiedz więcej!" — to "support-response" (wsparcie). Im więcej przesunięć, tym wyższy wskaźnik narcyzmu konwersacyjnego.',
  howItWorks:
    'Shift: odpowiedź zaczyna się od "ja/mi/mnie" + zero wspólnych słów z poprzednią wiadomością. Support: zawiera "?" lub słowa potwierdzające (tak/racja/serio/wow) lub ≥2 wspólne słowa. CNI = shift / (shift + support) × 100.',
  sources: [
    { author: 'Derber', year: 1979 },
    { author: 'Vangelisti et al.', year: 1990 },
  ],
  limitations: [
    'Heurystyka — nie każde "ja" to shift, nie każde "?" to support',
    'Wiadomości po 6h+ przerwie nie są liczone (inna rozmowa)',
    'Normalne jest mieć mix shift i support — 100% support byłoby dziwne',
  ],
  iconPath: '/icons/methodology/conversational-narcissism.png',
};

const bidResponse: AlgorithmData = {
  id: 'bid-response',
  title: 'Reagowanie na zaczepki',
  teaser: 'Mierzy czy odpowiadasz na pytania, dzielenie się i linki — benchmark Gottmana: 86%.',
  description:
    'Kiedy ktoś wysyła pytanie, dzieli się czymś osobistym lub linkuje coś ciekawego — to "bid" (zaczepka). Odpowiedź na nią to "turning toward". Zignorowani to "turning away". Badania Gottmana: stabilne pary reagują na 86% zaczepek. Pary które się rozchodzą — 33%.',
  howItWorks:
    'Bid = wiadomość z "?", albo "słuchaj", "wiesz co", "pamiętasz", albo URL z kontekstem. Toward = odpowiedź <4h z "?", ≥2 słowa lub ≥10 znaków. Away = dismissive ("spoko", "whatever") lub >4h lub <10 znaków.',
  sources: [
    { author: 'Driver & Gottman', year: 2004, doi: '10.1111/j.1545-5300.2004.00301.x' },
    { author: 'Gottman & Silver', year: 1999 },
  ],
  limitations: [
    'Minimum 10 zaczepek (bidów)',
    '4h to arbitralny próg — nocna wiadomość automatycznie = "odwrócenie" jeśli ktoś śpi',
    '86% benchmark dotyczy par w badaniu Gottmana — niekoniecznie uniwersalny',
  ],
  iconPath: '/icons/methodology/bid-response.png',
};

const chronotype: AlgorithmData = {
  id: 'chronotype',
  title: 'Sowa czy skowronek?',
  teaser: 'Chronotyp z timestampów + social jet lag (weekday vs weekend).',
  description:
    'Na podstawie KIEDY piszesz wiadomości, określamy czy jesteś sową (nocny marek) czy skowronkiem (ranny ptaszek). Porównujemy chronotypy obu osób — duża różnica może utrudniać komunikację. Sprawdzamy też "social jet lag" — czy w weekendy piszesz o zupełnie innych godzinach niż w tygodniu.',
  howItWorks:
    'Kołowy punkt środkowy: atan2(Σ sin(2πh/24)·count[h], Σ cos(2πh/24)·count[h]). Social jet lag = |środek w tygodniu - środek w weekend|. Kompatybilność: odległość kołowa, gładka krzywa kosinusowa (0h→100, 3h→50, 6h→0).',
  sources: [
    { author: 'Aledavood et al.', year: 2018 },
    { author: 'Roenneberg et al.', year: 2012 },
    { author: 'Randler et al.', year: 2017, doi: '10.1080/07420528.2017.1361437' },
  ],
  limitations: [
    'Minimum 20 wiadomości per osoba',
    'Czas wiadomości ≠ czas snu — możesz pisać o 2 w nocy i wstawać o 7',
    'Social jet lag z czatu ≠ social jet lag ze snu (ale koreluje)',
  ],
  iconPath: '/icons/methodology/chronotype.png',
};

const reciprocity: AlgorithmData = {
  id: 'reciprocity',
  title: 'Wzajemność',
  teaser: 'Mierzy 4 rodzaje balansu: wiadomości, inicjowanie, czas odpowiedzi, reakcje.',
  description:
    'Idealny związek to 50/50 — ale w praktyce nikt nie pisze dokładnie tyle samo. Mierzymy 4 rodzaje balansu: (1) ile kto pisze, (2) kto zaczyna rozmowy, (3) czy czas odpowiedzi jest symetryczny, (4) kto daje więcej reakcji.',
  howItWorks:
    '4 sub-wskaźniki (0-100 gdzie 50 = idealny balans): messageBalance, initiationBalance, responseTimeSymmetry (min/max RT), reactionBalance (min/max reakcji). Ogólny = 0.30×msg + 0.25×init + 0.15×RT + 0.30×react.',
  sources: [],
  limitations: [
    '50/50 nie zawsze jest zdrowe — może ktoś pisze mniej bo jest w pracy',
    'Minimum 30 wiadomości',
    'Nie oceniamy jakości — 50 "haha" vs 50 długich refleksji to "idealny balans"',
  ],
  iconPath: '/icons/methodology/reciprocity.png',
};

const intimacy: AlgorithmData = {
  id: 'intimacy',
  title: 'Progresja bliskości',
  teaser: 'Sprawdza miesiąc po miesiącu czy rozmowa staje się bardziej intymna.',
  description:
    'Miesiąc po miesiącu sprawdzamy czy rozmowa staje się bardziej intymna — czy wiadomości są dłuższe, bardziej emocjonalne, bardziej nieformalne, czy piszecie nocą. Trend rosnący = zbliżacie się. Malejący = oddalanie.',
  howItWorks:
    '4 składniki per miesiąc: długość wiadomości (cap 50 słów), gęstość słów emocjonalnych, nieformalność (emoji+wykrzykniki), % wiadomości nocnych (22:00-04:00). Regresja liniowa na wynikach miesięcznych.',
  sources: [],
  limitations: [
    'Nie każda "bliskość" wyraża się przez dłuższe wiadomości — niektórzy bliscy ludzie piszą krótko',
    'Nocne wiadomości to nie zawsze intymność — może ktoś pracuje na nocnej zmianie',
    'Trend zależy od ilości miesięcy — 2 miesiące to za mało',
  ],
  iconPath: '/icons/methodology/intimacy.png',
};

const communicationGaps: AlgorithmData = {
  id: 'communication-gaps',
  title: 'Przerwy w komunikacji',
  teaser: 'Wykrywa wszystkie znaczące przerwy (>7 dni) i klasyfikuje ich powagę.',
  description:
    'Skanuje wszystkie timestampy wiadomości i szuka przerw dłuższych niż 7 dni. Każdą klasyfikuje: "ochłodzenie" (7-14 dni), "potencjalny rozpad" (14-30 dni), "długa separacja" (30+ dni). Sprawdza też objętość wiadomości przed i po przerwie — nagły spadek może oznaczać początek końca.',
  howItWorks:
    'Liniowy skan timestampów, próg ≥7 dni. Klasyfikacja: cooling_off (<14d), potential_breakup (14-30d), extended_separation (>30d). Kontekst: volumeBefore i volumeAfter = wiadomości/miesiąc w 30 dniach przed/po przerwie. Max 15 przerw.',
  sources: [],
  limitations: [
    'Przerwa 7 dni to arbitralny próg — dla codziennie piszących par 3 dni to dużo, dla starych przyjaciół 30 dni to norma',
    'Nie wiemy DLACZEGO była przerwa — wakacje, awaria telefonu, rozstanie',
    'Używany głównie w Trybie Eks jako kontekst dla AI',
  ],
  iconPath: '/icons/methodology/communication-gaps.png',
};

const threatMeters: AlgorithmData = {
  id: 'threat-meters',
  title: 'Wskaźniki dynamiki',
  teaser: 'Cztery termometry: ghost risk, intensywność przywiązania, nierównowaga, zaufanie.',
  description:
    'Cztery "termometry" Twojego czatu: (1) Ryzyko ghostingu — czy ktoś zaczyna odpowiadać coraz wolniej? (2) Intensywność przywiązania — czy jedna osoba jest dużo bardziej zaangażowana? (3) Nierównowaga wpływu — czy ktoś dominuje w rozmowie? (4) Indeks zaufania — jak stabilna i wzajemna jest komunikacja?',
  howItWorks:
    'Każdy 0-100, 4 poziomy: niski/umiarkowany/podwyższony/krytyczny. Ghost Risk: asymetria RT + najdłuższa cisza. Attachment Intensity: nierównowaga inicjowania (0.35) + double-text (0.18) + asymetria RT (0.27) + pogoń (0.20). Power Imbalance: asymetria objętości + dominacja inicjowania. Trust: wzajemność (0.40) + stabilność RT (0.40) + odwrotność ghost risk (0.20).',
  sources: [],
  limitations: [
    'Wagi są autorskie, nie kalibrowane na dużej populacji',
    '"Podwyższony" wynik to NIE diagnoza — to sygnał do refleksji',
    'Nie uwzględniają kontekstu życiowego (zmiana pracy, choroba mogą zmienić wzorce)',
  ],
  iconPath: '/icons/methodology/threat-meters.png',
};

const damageReport: AlgorithmData = {
  id: 'damage-report',
  title: 'Raport zdrowia czatu',
  teaser: 'Zbiorczy raport: uszkodzenie emocjonalne, ocena A-F, potencjał naprawy.',
  description:
    'Zbiorczy "raport" Twojej komunikacji: (1) Uszkodzenie emocjonalne (ile negatywnych wzorców), (2) Ocena komunikacji (A-F jak w szkole), (3) Potencjał naprawy (czy da się to naprawić?), (4) Korzyść z konsultacji (czy warto pogadać ze specjalistą?).',
  howItWorks:
    'Emotional Damage = negatywny sentyment (0.30) + gęstość konfliktów (0.25) + brak wzajemności (0.20) + asymetria RT (0.15) + spadek aktywności (0.10). Ocena A-F z emotional damage + LSM + konflikty. Repair z trend długości + wzajemność + bid-response.',
  sources: [],
  limitations: [
    'Emotional Damage to NIE diagnoza kliniczna — to wynik matematyczny',
    'Ocena "F" nie znaczy że związek jest beznadziejny — może po prostu dużo piszecie o problemach (co jest zdrowe)',
    '"Korzyść z konsultacji" to gradient (wysoka/umiarkowana/niska), NIE nakaz terapii',
  ],
  iconPath: '/icons/methodology/damage-report.png',
};

const viralScores: AlgorithmData = {
  id: 'viral-scores',
  title: 'Wyniki viralowe',
  teaser: 'Kompatybilność, zainteresowanie, ghost risk i delusion — na story.',
  description:
    'Cztery wyniki stworzone żebyś mógł wrzucić na story: (1) Kompatybilność — jak bardzo pasujecie, (2) Zainteresowanie — kto jest bardziej zainteresowany, (3) Ghost Risk — szansa na ghosting, (4) Indeks złudzeń — kto jest bardziej "delulu".',
  howItWorks:
    'Compatibility: overlap aktywności (25%) + symetria RT (25%) + balans wiadomości (25%) + LSM (25%). Interest: wzajemne emoji + pytania + reakcje + trend. Ghost Risk: asymetria RT + cisza. Delusion: kto WIĘCEJ inwestuje (wiadomości, inicjowanie, double-texty).',
  sources: [],
  limitations: [
    'Stworzone dla zabawy, NIE jako poważna ocena związku',
    '"80% kompatybilności" nie znaczy nic naukowego — to nasz autorski wzór',
    'Delusion Score nie znaczy, że ktoś jest "szalony" — mierzy tylko asymetrię inwestycji',
  ],
  iconPath: '/icons/methodology/viral-scores.png',
};

const rankings: AlgorithmData = {
  id: 'rankings',
  title: 'Rankingi i odznaki',
  teaser: 'Heurystyczne percentyle (TOP X%) i 12+ odznak typu Night Owl, Ghost.',
  description:
    '"Jesteś w TOP 5% pod względem szybkości odpowiedzi!" — brzmi cool, ale to przybliżenie. Nie mamy bazy milionów czatów. Używamy rozkładu log-normalnego z szacowanymi medianami. Odznaki (Night Owl, Chatterbox, Ghost itp.) bazują na progach liczbowych.',
  howItWorks:
    'Rankingi: CDF rozkładu log-normalnego z ręcznie ustalonymi medianami (np. 3000 wiadomości, σ=1.2). Odznaki: 12+ typów z progami (np. Night Owl = >30% wiadomości nocnych).',
  sources: [],
  limitations: [
    'Rankingi to SZACUNKI (oznaczone jako "szacunkowe") — nie mamy realnej bazy porównawczej',
    'Mediany i odchylenia ustalone ręcznie, nie empirycznie',
    'Odznaki to zabawa, nie ocena — "Ghost" nie znaczy że ktoś jest złą osobą',
  ],
  iconPath: '/icons/methodology/rankings.png',
};

const engagement: AlgorithmData = {
  id: 'engagement',
  title: 'Zaangażowanie',
  teaser: 'Kto pisze więcej, kto double-textuje, kto wysyła 8 wiadomości pod rząd.',
  description:
    'Mierzymy 4 wymiary zaangażowania: (1) proporcja wiadomości (kto pisze więcej), (2) double-texty (kto pisze 2+ wiadomości bez odpowiedzi), (3) maksymalne serie (kto potrafi napisać 12 wiadomości pod rząd), (4) stosunek reakcji — kto daje vs dostaje więcej reakcji.',
  howItWorks:
    'messageRatio = wiadomości osoby / wszystkie. doubleTexts = 2+ kolejne od tej samej osoby. maxConsecutive = najdłuższa seria bez odpowiedzi. reactionGiveRate / reactionReceiveRate = reakcje dane/otrzymane per 100 wiadomości.',
  sources: [],
  limitations: [
    'Double-text w polskim stylu (enter-as-comma) to norma — 5 wiadomości w 30 sekund to nie "obsesja"',
    'Reakcje na Discordzie nie mają autora — zawsze 0 "danych"',
    'Proporcja 60/40 to normalne — nikt nie pisze DOKŁADNIE tyle samo',
  ],
  iconPath: '/icons/methodology/engagement.png',
};

const trends: AlgorithmData = {
  id: 'trends',
  title: 'Trendy i kamienie milowe',
  teaser: 'Regresja liniowa na miesięcznych danych + peak/worst month + zmiana rok do roku.',
  description:
    'Patrzymy na trend — czy piszecie coraz więcej, coraz mniej, czy stabilnie? Liczymy regresję liniową na miesięcznych danych. Plus "kamienie milowe": miesiąc z największą liczbą wiadomości (peak), miesiąc z najmniejszą (worst), i zmiana rok do roku.',
  howItWorks:
    'Monthly aggregation → linear regression slope (OLS). Peak/worst = argmax/argmin. YoY = (last 12 months volume) / (previous 12 months volume). Wszystko per osoba.',
  sources: [],
  limitations: [
    'Regresja liniowa nie widzi sezonowości — wakacyjny spadek wygląda jak "koniec związku"',
    'Wymaga ≥3 miesiące danych',
    'Spadek objętości ≠ pogorszenie relacji (może po prostu się spotykacie zamiast pisać)',
  ],
  iconPath: '/icons/methodology/trends.png',
};

const bursts: AlgorithmData = {
  id: 'bursts',
  title: 'Wykrywanie serii',
  teaser: 'Szuka dni kiedy pisaliście 3× więcej niż zwykle — z-score > 2.',
  description:
    'Szukamy "wybuchów aktywności" — dni kiedy pisaliście DUŻO więcej niż zwykle. Dzień z 200 wiadomościami przy średniej 30? To burst. Może to kłótnia, ekscytujące wydarzenie, albo po prostu ten jeden wieczór kiedy nie mogliście przestać gadać.',
  howItWorks:
    'Rolling 7-day average + standard deviation. Burst = dzień gdzie count > mean + 2×stddev. Z-score per dzień. Merge: jeśli burst trwa kilka dni pod rząd, łączymy w jeden okres.',
  sources: [],
  limitations: [
    'Nie wiemy DLACZEGO był burst — kłótnia i ekscytujący news wyglądają tak samo',
    'Krótkie czaty (<30 dni) mogą nie mieć wystarczającej bazy do porównania',
    'Próg z-score 2 jest standardowy w statystyce, ale arbitralny dla czatów',
  ],
  iconPath: '/icons/methodology/bursts.png',
};

const badges: AlgorithmData = {
  id: 'badges',
  title: 'Odznaki',
  teaser: '12+ odznak: Night Owl, Chatterbox, Double-Texter, Ghost, Speed Demon...',
  description:
    'System odznak jak w grze — dostajesz je za przekroczenie progów. Night Owl (>30% wiadomości nocnych), Chatterbox (>60% proporcji wiadomości), Double-Texter (>20% double-textów), Ghost (najdłuższa cisza >7 dni), Speed Demon (<30s mediana odpowiedzi), Emoji Master (>40% wiadomości z emoji), i więcej.',
  howItWorks:
    '12+ reguł progowych. Każda odznaka ma warunek liczbowy. Sprawdzane po zakończeniu analizy ilościowej. Przypisywane per osoba.',
  sources: [],
  limitations: [
    'Progi ustalone ręcznie — "Night Owl" przy 30% to arbitralny próg',
    '"Ghost" nie znaczy że ktoś jest złą osobą — może nie miał zasięgu',
    'To zabawa, nie ocena charakteru',
  ],
  iconPath: '/icons/methodology/badges.png',
};

const catchphrases: AlgorithmData = {
  id: 'catchphrases',
  title: 'Frazesy i best time to text',
  teaser: 'Top frazy każdej osoby + godzina kiedy odpowiedzi przychodzą najszybciej.',
  description:
    'Dwa algorytmy w jednym: (1) Frazesy — frazy które WYRÓŻNIAJĄ Twoje pisanie. Nie chodzi o "haha" które mówi każdy, tylko o Twoje unikalne zwroty. TF-IDF-like scoring: fraza ważna dla Ciebie = częsta u Ciebie × rzadka u innych. (2) Best Time to Text — godzina dnia kiedy mediana czasu odpowiedzi jest najniższa.',
  howItWorks:
    'Catchphrases: bigram/trigram frequency per person, scorowane TF-IDF-like (unikalność vs częstotliwość). Top 10 per osoba. Best Time: per hour median response time → argmin.',
  sources: [],
  limitations: [
    'Frazesy wymagają ≥200 wiadomości per osoba',
    '"Best time" bazuje na historii — nie gwarantuje że o 19:00 zawsze odpisze szybko',
    'Nierozróżniamy ironicznych powtórzeń od szczerych',
  ],
  iconPath: '/icons/methodology/catchphrases.png',
};

const cognitiveFunction: AlgorithmData = {
  id: 'cognitive-functions',
  title: 'Funkcje poznawcze (MBTI → Jung)',
  teaser: 'Z typu MBTI (Pass 3) rozkładamy na 8 funkcji Jungowskich i porównujemy "clash".',
  description:
    'Kiedy AI określi Twój typ MBTI w Pass 3, rozkładamy go na 8 funkcji poznawczych Junga: dominująca, pomocnicza, trzeciorzędna, podrzędna (+ shadow). Porównujemy funkcje obu osób — gdzie się uzupełniacie (komplementarność), a gdzie zderzacie (clash).',
  howItWorks:
    'Mapowanie statyczne: 16 typów MBTI → 4-pozycyjny stos funkcji (np. INTJ = Ni-Te-Fi-Se). Kompatybilność 0-100 z porównania dominująca↔pomocnicza obu osób. Clash = te same pozycje z przeciwnymi funkcjami.',
  sources: [
    { author: 'Jung', year: 1921 },
    { author: 'Myers & Briggs', year: 1962 },
  ],
  limitations: [
    'Zależy od dokładności MBTI z Pass 3 — jeśli AI źle typuje, cała analiza jest błędna',
    'Kompatybilność funkcji to teoria, nie udowodnione empirycznie',
    'MBTI jako framework ma ograniczoną walidację naukową (ale funkcje Jungowskie są starsze i szerzej akceptowane)',
  ],
  iconPath: '/icons/methodology/cognitive-functions.png',
};

const gottmanHorsemen: AlgorithmData = {
  id: 'gottman-horsemen',
  title: 'Czterej Jeźdźcy Gottmana',
  teaser: 'Krytycyzm, pogarda, defensywność, mur milczenia — mapowane z CPS i danych.',
  description:
    'Gottman zidentyfikował 4 "jeźdźców apokalipsy" w związkach: (1) Krytycyzm — "ty zawsze/nigdy", (2) Pogarda — wyśmiewanie, sarkastyczne "brawo", (3) Defensywność — "to nie moja wina", (4) Mur milczenia — ghosting, ignorowanie. Mapujemy je z odpowiedzi CPS + danych ilościowych.',
  howItWorks:
    'Criticism: z CPS pasywna agresja + negatywny sentyment. Contempt: z CPS kontrola + dystans. Defensiveness: z CPS skupienie na sobie. Stonewalling: z ghost risk + pursuit-withdrawal wycofanie. Każdy 0-100, frequency labels.',
  sources: [
    { author: 'Gottman', year: 1994 },
    { author: 'Gottman & Levenson', year: 2000 },
    { author: 'Gottman & Silver', year: 1999 },
  ],
  limitations: [
    'Wymaga analizy CPS (63 pytań) — bez niej nie działa',
    'Mapowanie CPS→Horsemen to nasza interpretacja, nie oryginalna metodologia Gottmana (1994)',
    'Gottman badał PARY w laboratorium (SPAFF) — czat to inny kontekst',
  ],
  iconPath: '/icons/methodology/gottman-horsemen.png',
};

const network: AlgorithmData = {
  id: 'network',
  title: 'Graf interakcji (grupy)',
  teaser: 'Kto komu odpowiada? Kto jest w centrum? Kto jest na marginesie? Tylko 4+ osób.',
  description:
    'Dla czatów grupowych (4+ osób) budujemy graf interakcji: kto komu najczęściej odpowiada, kto jest "centralną postacią" (wysoka centrality), kto jest na marginesie. Szukamy też klik — podgrup które piszą głównie do siebie.',
  howItWorks:
    'Sequential reply patterns: A pisze po B = edge A→B. Centrality = in-degree + out-degree normalized. Clique detection: podgrupy z >70% wewnętrznych interakcji. Density = edges / max possible edges.',
  sources: [],
  limitations: [
    'Tylko 4+ uczestników — dla 2-3 osób nie ma sensu',
    'Sequential ≠ directed — A pisze po B nie znaczy że A odpowiada B (może pisze do C)',
    'Nie widzi "mentionek" (poza Discordem) — bazuje tylko na kolejności wiadomości',
  ],
  iconPath: '/icons/methodology/network.png',
};

const deepScanner: AlgorithmData = {
  id: 'deep-scanner',
  title: 'Skaner cytatów',
  teaser: 'Wyłapuje wyznania, wpadki, sprzeczności, obsesje tematyczne i power moves.',
  description:
    'Skanuje cały czat szukając "high-signal" momentów: (1) Wyznania — "nigdy nikomu tego nie mówiłem", (2) Wpadki — niezamierzenie zabawne wiadomości, (3) Sprzeczności — "nie lubię X" → tydzień później "uwielbiam X", (4) Obsesje tematyczne — kto o czym nie może przestać mówić, (5) Power moves — dominujące zachowania. Używane jako materiał dla Enhanced Roast.',
  howItWorks:
    'Keyword + pattern matching: confession markers ("przyznaję", "nie mów nikomu"), contradiction detection (antonimy w oknie 7 dni), topic frequency spikes, dominance markers ("musisz", "koniec dyskusji"). Top 10 per kategoria.',
  sources: [],
  limitations: [
    '"Sprzeczność" może być zmianą zdania (co jest normalne i zdrowe)',
    '"Power move" w czacie to nie to samo co manipulacja w życiu',
    'Cytaty wyrwane z kontekstu mogą wyglądać gorzej niż były',
  ],
  iconPath: '/icons/methodology/deep-scanner.png',
};

/* ================================================================== */
/*  SZTUCZNA INTELIGENCJA — 23 algorithms (2 recon + 4 analysis + 17) */
/* ================================================================== */

const aiRecon: AlgorithmData = {
  id: 'ai-recon',
  title: 'Rozpoznanie terenu (Pass 0)',
  teaser: 'AI-zwiadowca skanuje 500 wiadomości i mówi GDZIE szukać głębiej — daty, tematy, słowa kluczowe.',
  description:
    'Zanim AI zacznie właściwą analizę, wysyłamy "zwiadowcę". AI czyta 500 stratyfikowanych wiadomości i identyfikuje: (1) krytyczne okresy — kiedy coś się zmieniło, (2) tematy do zbadania — z konkretnymi słowami kluczowymi PL+EN do wyszukania, (3) szczyty emocjonalne — kłótnie, pojednania, wyznania, (4) otwarte pytania — czego nie widać z próbki. Na tej podstawie klient wyciąga CELOWANE wiadomości z pełnej rozmowy.',
  howItWorks:
    '500 wiadomości (stratified 300 + inflection 150 + head/tail 50) → Gemini AI (temp 0.1 = ultra-analityczna) → JSON: flaggedDateRanges (3-8, z priorytetem), topicsToInvestigate (3-10, z grep-friendly keywords PL+EN), emotionalPeaks (2-6), observedThemes (3-8), openQuestions (2-5). Klient wyciąga do 600 celowanych wiadomości na podstawie dat, słów kluczowych, emocji i nocnych wiadomości (23:00-05:00).',
  sources: [],
  limitations: [
    'Zwiadowca widzi 500 wiadomości — może przeoczyć wydarzenia widoczne tylko w reszcie',
    'Słowa kluczowe to heurystyka — mogą trafić na fałszywe pozytywne',
    'Przy rozmowach <500 wiadomości recon dostaje wszystko = mniej wartości dodanej',
  ],
  iconPath: '/icons/methodology/ai-overview.png',
};

const aiDeepRecon: AlgorithmData = {
  id: 'ai-deep-recon',
  title: 'Pogłębione rozpoznanie (Pass 0.5)',
  teaser: 'Starszy analityk AI czyta celowane wiadomości z Pass 0 i JESZCZE BARDZIEJ zawęża cel.',
  description:
    'Drugi przejazd zwiadowczy. "Starszy analityk" AI dostaje: (1) raport z Pass 0, (2) celowane wiadomości wyciągnięte na podstawie Pass 0. Jego zadanie: zawęzić okresy do konkretnych tygodni, odkryć NOWE tematy niewidoczne w losowej próbce, potwierdzić lub obalić hipotezy z Pass 0, i napisać krótką narrację relacji (3-5 zdań). Klient wyciąga kolejne do 400 wiadomości na podstawie nowych ustaleń.',
  howItWorks:
    'Celowane wiadomości z Pass 0 (do 600) + raport recon → Gemini AI (temp 0.1) → JSON: refinedDateRanges (2-6), refinedTopics (2-8, z NOWYMI keywords), confirmedPeaks (2-5, z dowodami), confirmedThemes (3-6), narrativeSummary (3-5 zdań), newQuestions (1-4). Klient wyciąga kolejną turę celowanych wiadomości. Łączna pula: recon (500) + targeted1 (600) + targeted2 (400) = do 1500 unikatowych wiadomości trafia do Passów 1-4.',
  sources: [],
  limitations: [
    'Podwójny recon kosztuje ~10-15 sekund więcej czasu analizy',
    'Deep recon działa najlepiej na rozmowach >2000 wiadomości — przy mniejszych różnica jest minimalna',
    'Narracja to hipoteza AI, nie fakt — może nadinterpretować',
  ],
  iconPath: '/icons/methodology/ai-overview.png',
};

const aiOverview: AlgorithmData = {
  id: 'ai-overview',
  title: 'Pierwszy rzut oka (Pass 1)',
  teaser: 'AI czyta próbkę wiadomości i określa ton, styl i typ relacji.',
  description:
    'AI czyta próbkę Twoich wiadomości i odpowiada na podstawowe pytania: jaki jest ogólny ton rozmowy? Kto pisze w jakim stylu? Czy to relacja romantyczna, przyjaźń, rodzina? To taki "first impression" od AI. Otrzymuje też raport z rozpoznania terenu (Intelligence Briefing) z Pass 0 i 0.5.',
  howItWorks:
    '200-500 wybranych wiadomości + Intelligence Briefing z recon → Gemini AI → analiza tonu, stylu i typu relacji. Temperatura 0.3 (niska = konserwatywne, stabilne odpowiedzi).',
  sources: [],
  limitations: [
    'AI widzi próbkę, nie całość — ale recon znacząco poprawia jakość próbki',
    'Ton i styl mogą się różnić w zależności od wylosowanej próbki wiadomości',
  ],
  iconPath: '/icons/methodology/ai-overview.png',
};

const aiDynamics: AlgorithmData = {
  id: 'ai-dynamics',
  title: 'Dynamika relacji (Pass 2)',
  teaser: 'AI szuka nierównowag władzy, pracy emocjonalnej i wzorców konfliktu — z celowanymi wiadomościami z recon.',
  description:
    'AI szuka nierównowag: kto ma więcej "władzy" w rozmowie, kto wykonuje więcej "pracy emocjonalnej" (pocieszanie, inicjowanie, rozwiązywanie), jakie są wzorce konfliktu. Szuka też czerwonych (złe) i zielonych (dobre) flag. Dzięki recon (Pass 0 + 0.5) Pass 2 otrzymuje CELOWANE wiadomości z krytycznych okresów — nie losowe próbki.',
  howItWorks:
    'Wiadomości z momentami konfliktów i intymności + do 1000 celowanych wiadomości z recon + Intelligence Briefing → analiza dynamiki władzy, pracy emocjonalnej, wzorców konfliktu. Wymaga 3+ niezależnych wzorców żeby coś zaflagować. Token limit: 12288 (vs standard 8192) gdy dostępne celowane próbki.',
  sources: [
    { author: 'Gottman', year: 1999 },
    { author: 'Bowlby', year: 1969 },
  ],
  limitations: [
    'Zła komunikacja ≠ manipulacja — AI ma to rozróżniać, ale nie zawsze mu się udaje',
    '"Czerwone flagi" z czatu to nie to samo co czerwone flagi z życia — brakuje kontekstu',
    'Wymaga 3+ instancji żeby coś uznać za wzorzec (nie incydent)',
  ],
  iconPath: '/icons/methodology/ai-dynamics.png',
};

const aiPersonality: AlgorithmData = {
  id: 'ai-personality',
  title: 'Profil osobowości (Pass 3)',
  teaser: 'Big Five, MBTI, styl przywiązania i język miłości — z tego jak piszesz.',
  description:
    'Na podstawie TEGO JAK piszesz (nie co mówisz o sobie), AI określa: Wielką Piątkę (Big Five — 5 wymiarów osobowości), typ MBTI, styl przywiązania (bezpieczny/lękowy/unikający) i język miłości. Każdy z oceną pewności.',
  howItWorks:
    'Per-person wiadomości → 2 przejścia (A: osobowość, B: wzorce kliniczne). Big Five: 1-10 z zakresem [min, max]. MBTI: 4-literowy typ z pewnością. Attachment: max 65% pewności. Love language: zawsze próbuje, nawet z niską pewnością (20-50%).',
  sources: [
    { author: 'Costa & McCrae', year: 1992 },
    { author: 'Bowlby', year: 1969 },
    { author: 'Pennebaker', year: 2011 },
    { author: 'Park et al.', year: 2015 },
  ],
  limitations: [
    'Big Five z czatu ma korelację ~0.38 z testami (Park 2015) — to orientacja, NIE diagnoza',
    'MBTI z tekstu to bardzo przybliżone — nie zastępuje testu Myers-Briggs',
    'Styl przywiązania max 65% pewności — z tekstu nie widać wszystkiego',
    'To NIE jest diagnoza psychologiczna',
  ],
  iconPath: '/icons/methodology/ai-personality.png',
};

const aiSynthesis: AlgorithmData = {
  id: 'ai-synthesis',
  title: 'Ocena zdrowia + prognozy (Pass 4)',
  teaser: 'Health Score (0-100) z 5 składników + prognozy na przyszłość (max 75% pewności).',
  description:
    'AI zbiera wszystko razem i wystawia Health Score (0-100) z pięciu składników: balans (25%), wzajemność (20%), stabilność odpowiedzi (20%), bezpieczeństwo emocjonalne (20%), trajektoria wzrostu (15%). Plus prognozy na przyszłość — ale max 75% pewności. Otrzymuje Intelligence Briefing z recon — wie o krytycznych okresach i potwierdzonych tematach.',
  howItWorks:
    'Synteza z Pass 1-3 + dane ilościowe + Intelligence Briefing z recon → Health Score + inflection points + rekomendacje + predictions. Przynajmniej 1 prognoza musi być falsyfikowalna w 3 miesiące.',
  sources: [
    { author: 'Gottman', year: 1999 },
    { author: 'Bowlby', year: 1969 },
  ],
  limitations: [
    'Health Score to opinia AI oparta na wzorze, NIE obiektywna miara zdrowia',
    'Prognozy max 75% pewności — AI nie przepowiada przyszłości',
    '5 składników z wagami to NASZ autorski model, nie standard naukowy',
    'Niska ocena nie znaczy "zły związek" — może znaczyć "burzliwy ale głęboki"',
  ],
  iconPath: '/icons/methodology/ai-synthesis.png',
};

const aiRoast: AlgorithmData = {
  id: 'ai-roast',
  title: 'Standard Roast',
  teaser: 'AI roastuje Twój styl pisania — każdy żart MUSI mieć konkretną liczbę z danych.',
  description:
    'AI czyta Twój czat i pisze najgorsze żarty o Twoim stylu pisania. "Odpowiadasz średnio po 47 minutach, ale jak ktoś wspomni pizzę — 12 sekund". Każdy roast MUSI mieć konkretną liczbę z Twoich danych. Bez kontekstu osobowości — czyste dane.',
  howItWorks:
    'Próbka wiadomości + statystyki ilościowe → AI generuje roast z konkretnymi liczbami. Temperatura 0.3 (niska = precyzyjne dane, mniej halucynacji).',
  sources: [],
  limitations: [
    'To ŻARTY, nie ocena — traktuj z przymrużeniem oka',
    'AI może czasem "trafić" zbyt celnie w coś bolesnego',
    '"Enter-as-comma" — AI wie, że 5 wiadomości po 30s to polska norma, nie obsesja',
  ],
  iconPath: '/icons/methodology/ai-roast.png',
};

const aiCourt: AlgorithmData = {
  id: 'ai-court',
  title: 'Sąd Chatowy',
  teaser: 'AI stawia Ci zarzuty na podstawie PRAWDZIWYCH cytatów z czatu i wydaje wyrok.',
  description:
    'AI gra prokuratora i sędziego — stawia Ci zarzuty na podstawie PRAWDZIWYCH rzeczy z czatu (obelgi, spóźnione odpowiedzi, krinżowe wiadomości). Przesłuchuje świadków (cytuje Twoje słowa), wydaje wyrok i wymierza karę ("6 miesięcy zakazu używania emoji 🥺").',
  howItWorks:
    'AI szuka: wulgarności, kłamstw, cringey moments, ghostowania, passive aggression. Tworzy 5-8 zarzutów z cytatami. Temp 0.5.',
  sources: [],
  limitations: [
    '"Zarzuty" to żart — nie bierz ich poważnie',
    'AI szuka "najgorszych" momentów, co zniekształca obraz',
    'Prawdziwe cytaty mogą być wyrwane z kontekstu',
  ],
  iconPath: '/icons/methodology/ai-court.png',
};

const aiDating: AlgorithmData = {
  id: 'ai-dating',
  title: 'Profil randkowy',
  teaser: 'AI pisze Ci brutalnie szczery profil na Tindera na podstawie stylu pisania.',
  description:
    'AI pisze Ci "brutalnie szczery" profil na Tindera na podstawie tego jak naprawdę piszesz. Bio w Twoim stylu, statystyki z sarkastycznym komentarzem, prompty Hinge na które odpowiadasz jak TY byś odpowiedział, red/green flags. Plus generuje Ci "zdjęcie profilowe" z AI.',
  howItWorks:
    'AI analizuje styl pisania → generuje profil jak copywriter. Temp 0.7 (max kreatywność). Obraz: Gemini Pro Image.',
  sources: [],
  limitations: [
    'To karykatura, nie prawdziwy portret — przesadza dla efektu komicznego',
    '"Red flags" z czatu ≠ red flags z życia',
    'Generowane zdjęcie to interpretacja AI, nie prawdziwy portret',
  ],
  iconPath: '/icons/methodology/ai-dating.png',
};

const aiSimulator: AlgorithmData = {
  id: 'ai-simulator',
  title: 'Symulator odpowiedzi',
  teaser: 'Wpisujesz wiadomość, AI odpowiada w stylu drugiej osoby — z jej frazami i emoji.',
  description:
    'Wpisujesz wiadomość, a AI odpowiada TAK JAK odpowiedziałaby druga osoba — w jej stylu, z jej emoji, z jej typowymi frazami. AI "wciela się" w tę osobę na podstawie 20-30 prawdziwych przykładów + profilu osobowości.',
  howItWorks:
    'Top 50 słów + 20 fraz + 20-30 przykładów + profil osobowości → AI generuje odpowiedź w stylu tej osoby. Temp 0.5.',
  sources: [],
  limitations: [
    'To SYMULACJA, nie prawdziwa odpowiedź — nie podejmuj na tej podstawie decyzji życiowych',
    'AI kopiuje styl ale nie zna kontekstu życia (co ta osoba akurat robi, czuje)',
    'Im więcej wiadomości w czacie, tym lepsza symulacja',
  ],
  iconPath: '/icons/methodology/ai-simulator.png',
};

const aiDelusion: AlgorithmData = {
  id: 'ai-delusion',
  title: 'Quiz złudzeń (Delusion Index)',
  teaser: '15 pytań: co MYŚLISZ vs PRAWDZIWE dane — czysta matematyka, zero AI.',
  description:
    '15 pytań typu "kto pisze więcej?" albo "jaki jest Twój średni czas odpowiedzi?". Odpowiadasz co MYŚLISZ, a my porównujemy z PRAWDZIWYMI danymi. Im większa różnica — tym większy "Delusion Index". Nie używa AI — to czysta matematyka.',
  howItWorks:
    '15 pytań z wagami (pytania o siebie ×2). Porównanie guess vs actual. Wynik 0-100: Bazowany / Realista / Lekko Odjechany / Total Delulu / Poza Rzeczywistością.',
  sources: [],
  limitations: [
    'To zabawa, nie test psychologiczny',
    '"Delulu" ≠ złe — może po prostu nie zwracasz uwagi na statystyki',
    '15 pytań to mała próbka samoświadomości',
  ],
  iconPath: '/icons/methodology/ai-delusion.png',
};

const aiCps: AlgorithmData = {
  id: 'ai-cps',
  title: 'CPS — 63 pytania',
  teaser: 'AI odpowiada na 63 pytań o wzorce komunikacji — od unikania po pasywną agresję.',
  description:
    'AI odpowiada na 63 pytań o Wasze wzorce komunikacji — od unikania bliskości po pasywną agresję. Każde pytanie = TAK/NIE na podstawie co najmniej 3 przykładów z czatu. Wynik per kategoria: ile % "tak".',
  howItWorks:
    '63 pytań w 3 batchach (po ~20) → 10 kategorii: unikanie bliskości, nadmierne uzależnienie, kontrola, podejrzliwość, skupienie na sobie, intensywność emocjonalna, dramatyzacja, nierównowaga wpływu, dystans emocjonalny, pasywna agresja.',
  sources: [],
  limitations: [
    'To analiza wzorców komunikacji, NIE screening zaburzeń osobowości',
    'AI musi znaleźć 3+ instancje żeby odpowiedzieć "tak"',
    'Nazwy kategorii mogą brzmieć "klinicznie" ale to opis stylu, nie diagnoza',
  ],
  iconPath: '/icons/methodology/ai-cps.png',
};

const aiSubtext: AlgorithmData = {
  id: 'ai-subtext',
  title: 'Translator podtekstów',
  teaser: 'AI tłumaczy co naprawdę ktoś miał na myśli — "Spoko" → "Wcale nie jest spoko".',
  description:
    'AI bierze konkretne wiadomości i tłumaczy "co NAPRAWDĘ chciał powiedzieć". "Spoko" → "Wcale nie jest spoko, ale nie mam siły się kłócić". Analizuje kontekst (3 wiadomości przed i po) i przypisuje kategorię: unik, ukryty gniew, szukanie walidacji, power move, itp.',
  howItWorks:
    '25 okien po 30+ wiadomości → AI szuka podtekstów. 12 kategorii. ~20-30% wyników to "genuine" (nie wszystko ma ukryty sens). Max 60 wyników.',
  sources: [],
  limitations: [
    'Podtekst to INTERPRETACJA AI — może się mylić',
    'Ironia i sarkazm mogą być źle odczytane',
    '~20-30% wyników to "genuine" celowo — nie wszystko ma drugie dno',
  ],
  iconPath: '/icons/methodology/ai-subtext.png',
};

const aiAcr: AlgorithmData = {
  id: 'ai-acr',
  title: 'Reakcje na dobre wieści (ACR)',
  teaser: 'Klasyfikuje reakcje na dobre wieści: aktywna/pasywna × konstruktywna/destruktywna.',
  description:
    'Kiedy ktoś mówi "dostałem awans!", są 4 sposoby reakcji: (1) aktywnie-konstruktywna ("Super! Opowiedz!"), (2) pasywnie-konstruktywna ("fajnie"), (3) aktywnie-destruktywna ("a mnie nigdy nie awansują"), (4) pasywnie-destruktywna (zmiana tematu). AI klasyfikuje Wasze reakcje.',
  howItWorks:
    'AI identyfikuje momenty "dzielenia się dobrymi wieściami" → klasyfikuje odpowiedzi do 4 kategorii (Gable 2004). Per-person stacked bars AC/PC/AD/PD.',
  sources: [
    { author: 'Gable et al.', year: 2004 },
    { author: 'Peters et al.', year: 2018 },
  ],
  limitations: [
    'AI musi najpierw rozpoznać "dobrą wiadomość" — co nie zawsze jest oczywiste',
    'Krótka odpowiedź ≠ pasywna — może ktoś odpowie szerzej za chwilę',
    'Bardzo zależy od próbki — jeśli mało dobrych wieści w czacie, mała próbka',
  ],
  iconPath: '/icons/methodology/ai-acr.png',
};

const aiMoral: AlgorithmData = {
  id: 'ai-moral',
  title: 'Wartości moralne',
  teaser: '6 fundamentów Haidta: troska, sprawiedliwość, lojalność, autorytet, czystość, wolność.',
  description:
    'Na podstawie tego CO mówisz w czacie (nie co deklarujesz), AI określa 6 fundamentów moralnych: troska, sprawiedliwość, lojalność, autorytet, czystość, wolność. Porównuje wartości obu osób i mierzy "moralną kompatybilność".',
  howItWorks:
    'AI analizuje wiadomości pod kątem 6 fundamentów Haidta (0-10 per fundament per osoba). Radar chart + konflikty wartości + kompatybilność 0-100.',
  sources: [
    { author: 'Haidt & Graham', year: 2007 },
    { author: 'Rathje et al.', year: 2024 },
  ],
  limitations: [
    'W czacie nie poruszamy WSZYSTKICH tematów moralnych — wynik oparty na tym co padło w rozmowie',
    'Żarty i ironia mogą zniekształcić wynik',
    '6 fundamentów Haidta to nie jedyny model moralności',
  ],
  iconPath: '/icons/methodology/ai-moral.png',
};

const aiEmotions: AlgorithmData = {
  id: 'ai-emotions',
  title: 'Przyczyny emocji',
  teaser: 'AI szuka par emocja + przyczyna — kto poczuł co i co to wywołało.',
  description:
    'AI szuka par "emocja + przyczyna" — kto poczuł co i co to wywołało. "Ania poczuła frustrację po tym jak Marek zignorował jej pytanie". Tworzy mapę: kto jest "głównym triggererem" emocji i jakich.',
  howItWorks:
    'SemEval-2024 Task 3 format. AI identyfikuje emocje (radość, smutek, złość, strach, frustracja itp.) → łączy z przyczyną (interpersonalna lub zewnętrzna). Max 10 par. Trigger map per osoba.',
  sources: [
    { author: 'Poria et al.', year: 2021 },
  ],
  limitations: [
    'Max 10 par emocja-przyczyna — to NIE jest kompletny obraz',
    'AI widzi tylko tekst — nie wie co ktoś czuł naprawdę',
    '"Trigger" to korelacja, nie przyczyna — A napisał coś → B zareagował, ale może B miał zły dzień',
  ],
  iconPath: '/icons/methodology/ai-emotions.png',
};

const aiEks: AlgorithmData = {
  id: 'ai-eks',
  title: 'Tryb Eks — sekcja zwłok związku',
  teaser: '3-fazowa autopsja zakończonej relacji: rekonesans → autopsja → werdykt.',
  description:
    'Tryb dla zakończonych relacji. AI przeprowadza 3-fazową "autopsję": (1) Rekonesans — szybki skan, identyfikacja faz i punktów zwrotnych. (2) Głęboka autopsja — fazy rozpadu, kto odszedł pierwszy, ostatnie słowa, przyczyna "śmierci", profil strat, rzeczy niewypowiedziane. (3) Werdykt — styl przywiązania, powtarzające się wzorce, listy od "terapeuty", symetria bólu, prognoza powrotu.',
  howItWorks:
    'Pass 1 (temp 0.3): 500 próbek → rozpoznanie faz. Klient wysyła targeted samples z flagged date ranges. Pass 2 (temp 0.3): głęboka autopsja z targeted samples. Pass 3 (temp 0.4): werdykt psychologiczny. 16 scen cinematic + 8 share cards.',
  sources: [
    { author: 'Gottman', year: 1999 },
    { author: 'Bowlby', year: 1969 },
  ],
  limitations: [
    'System bezpieczeństwa emocjonalnego: brama wejściowa, przycisk "Chcę przerwać", numer kryzysowy 116 123',
    'AI widzi TYLKO czat — nie wie o życiu poza telefonem',
    '"Kto odszedł pierwszy" to interpretacja z tekstu — może być niejednoznaczna',
    'Tryb zaprojektowany dla ZAKOŃCZONYCH relacji — nie używaj w trakcie kryzysu',
  ],
  iconPath: '/icons/methodology/ai-eks.png',
};

const aiImages: AlgorithmData = {
  id: 'ai-images',
  title: 'Obrazki AI',
  teaser: 'Komiks z czatu, roastowy komiks i zdjęcie profilowe — generowane przez Gemini.',
  description:
    'AI generuje obrazki na podstawie analizy: (1) Komiks z Waszego czatu (styl webtoon), (2) Satyryczny komiks roastowy, (3) "Zdjęcie profilowe" na randki. Wszystko generowane przez Gemini Pro Image.',
  howItWorks:
    'Gemini 3 Pro Image Preview z modalitami IMAGE + TEXT. Każdy typ ma swój prompt stylowy.',
  sources: [],
  limitations: [
    'Generowane obrazy to FIKCJA — nie odzwierciedlają wyglądu osób',
    'Mogą zawierać artefakty graficzne (AI image generation nie jest doskonałe)',
    '3 próby generowania z exponential backoff — czasem AI nie generuje niczego',
  ],
  iconPath: '/icons/methodology/ai-images.png',
};

const aiEnhancedRoast: AlgorithmData = {
  id: 'ai-enhanced-roast',
  title: 'Enhanced Roast',
  teaser: 'Roast z pełnym profilem psychologicznym z Pass 1-4 — trafia celniej.',
  description:
    'Standard Roast widzi tylko dane. Enhanced Roast ma CAŁY profil psychologiczny z Pass 1-4 — wie jaką masz osobowość, jakie masz lęki, co jest Twoją słabością. Więc roastuje celniej. "Z Twoim lękowym stylem przywiązania i medianą odpowiedzi 47 minut — Twój telefon to w zasadzie tamagotchi które już nie żyje".',
  howItWorks:
    'Full Pass 1-4 context + Deep Scanner quotes → AI generuje roast z psychologicznym tłem. Temperatura 0.5 (balance: dane + kreatywność).',
  sources: [],
  limitations: [
    'Wymaga wcześniejszej analizy AI (Pass 1-4) — bez niej niedostępny',
    'Może trafić w czuły punkt — "zbyt celne" roasty mogą być nieprzyjemne',
    'Profil osobowości z Pass 3 może być nieprecyzyjny → roast bazuje na błędnych założeniach',
  ],
  iconPath: '/icons/methodology/ai-enhanced-roast.png',
};

const aiStandup: AlgorithmData = {
  id: 'ai-standup',
  title: 'Stand-Up Comedy (7 aktów)',
  teaser: '7-aktowy stand-up: setup, roast A, roast B, dynamika, red flags, finał, callback.',
  description:
    'Pełny stand-up comedy show w 7 aktach: (1) Setup — nawiązanie kontaktu z "publicznością", (2) Roast osoby A, (3) Roast osoby B, (4) Dynamika między wami, (5) Red flags i cringe moments, (6) Wielki finał, (7) Callback — nawiązanie do wcześniejszych żartów. Generuje PDF do pobrania.',
  howItWorks:
    'Próbka wiadomości → AI pisze 7 aktów sekwencyjnie z instrukcją utrzymania ciągłości. Temperatura 0.7 (max kreatywność). Eksport do PDF z formatowaniem scenicznym.',
  sources: [],
  limitations: [
    'Temperatura 0.7 = bardziej kreatywne ale mniej przewidywalne',
    'AI może powtarzać żarty między aktami (callback to feature, nie bug)',
    'Stand-up z czatu to gatunkowa nowość — AI nie ma idealnego wzorca',
  ],
  iconPath: '/icons/methodology/ai-standup.png',
};

const aiMegaRoast: AlgorithmData = {
  id: 'ai-mega-roast',
  title: 'Mega Roast',
  teaser: 'Wszystkie roasty w jednym: standard + enhanced + court + standup = totalna demolka.',
  description:
    'Kombajn roastowy — łączy elementy wszystkich formatów: dane liczbowe (Standard), profil psychologiczny (Enhanced), "zarzuty" (Court), format sceniczny (Stand-Up). Najdłuższy i najbardziej niszczycielski format.',
  howItWorks:
    'Agreguje kontekst ze wszystkich passów → jeden mega-prompt z instrukcją łączenia formatów. Temperatura 0.5.',
  sources: [],
  limitations: [
    'Bardzo długi output — może trwać 30-60 sekund generowania',
    'Wymaga wcześniejszej analizy AI',
    'Może być overwhelming — jeśli Standard Roast Cię boli, nie rób Mega',
  ],
  iconPath: '/icons/methodology/ai-mega-roast.png',
};

const aiPrzegryw: AlgorithmData = {
  id: 'ai-przegryw',
  title: 'Przegryw Tygodnia',
  teaser: 'AI wybiera kto jest największym przegrywem czatu — ceremonia z roastem.',
  description:
    'AI analizuje czat i wybiera "Przegrywa Tygodnia" — osobę która najbardziej się ośmieszyła w rozmowie. Ceremonia wręczenia z: powód nominacji, cytaty dowodowe, komentarz jury, sash/tytuł. Dostępne też jako komenda Discord bota.',
  howItWorks:
    'AI szuka: ghostowanie, desperackie double-texty, zostawione na czytaniu, cringe moments, failed jokes. Wybiera "zwycięzcę" z uzasadnieniem + cytatami. Temperatura 0.5.',
  sources: [],
  limitations: [
    'To rozrywka grupowa — nie używaj jako narzędzie do bullying',
    '"Przegryw" to żartobliwy tytuł, nie ocena wartości człowieka',
    'AI może źle zinterpretować kontekst grupowy',
  ],
  iconPath: '/icons/methodology/ai-przegryw.png',
};

const aiArgument: AlgorithmData = {
  id: 'ai-argument',
  title: 'Symulator kłótni',
  teaser: 'AI symuluje jak wyglądałaby kłótnia na dany temat — w stylu obu osób.',
  description:
    'Podajesz temat ("kto zmywa naczynia"), a AI generuje symulowaną kłótnię między Wami — w stylu każdej osoby (z ich frazami, emoji, sposobem pisania). Pokazuje jak eskalacja przebiega, kto pierwszy robi "power move", kto się wycofuje.',
  howItWorks:
    'Profile komunikacyjne obu osób (top frazy, styl, emoji, osobowość) → AI generuje wielowątkową kłótnię na zadany temat. Temperatura 0.5. Symuluje 10-15 wymian.',
  sources: [],
  limitations: [
    'To SYMULACJA — nie tak by naprawdę wyglądała wasza kłótnia',
    'AI przesadza dla dramatycznego efektu',
    'Nie uwzględnia kontekstu życiowego (może temat jest czuły)',
  ],
  iconPath: '/icons/methodology/ai-argument.png',
};

/* ================================================================== */
/*  Section & Group definitions                                        */
/* ================================================================== */

export const MATH_SECTION: MethodologySection = {
  id: 'math',
  title: 'Matematyka',
  subtitle: 'Algorytmy liczone w Twojej przeglądarce — czysta matematyka, zero AI. Twoje wiadomości nigdy nie opuszczają Twojego urządzenia.',
  accent: 'blue',
  groups: [
    {
      id: 'basics',
      title: 'Podstawy',
      accent: 'blue',
      algorithms: [basicStats, activityMap, engagement],
    },
    {
      id: 'time',
      title: 'Czas',
      accent: 'blue',
      algorithms: [responseTime, responseTimeDistribution, chronotype, trends],
    },
    {
      id: 'emotions',
      title: 'Emocje',
      accent: 'blue',
      algorithms: [sentiment, emotionalDiversity, timeOrientation],
    },
    {
      id: 'language',
      title: 'Język',
      accent: 'blue',
      algorithms: [lsm, pronouns, vocabulary, thinkingComplexity, catchphrases],
    },
    {
      id: 'patterns',
      title: 'Wzorce',
      accent: 'blue',
      algorithms: [conflicts, conflictFingerprint, pursuitWithdrawal, repair, conversationalNarcissism, bidResponse, bursts],
    },
    {
      id: 'health',
      title: 'Zdrowie i wyniki',
      accent: 'blue',
      algorithms: [reciprocity, intimacy, communicationGaps, threatMeters, damageReport, viralScores, rankings, badges],
    },
    {
      id: 'derived',
      title: 'Pochodne',
      accent: 'blue',
      algorithms: [cognitiveFunction, gottmanHorsemen, network, deepScanner],
    },
  ],
};

export const AI_SECTION: MethodologySection = {
  id: 'ai',
  title: 'Sztuczna Inteligencja',
  subtitle: 'Trójfazowy system rozpoznania: AI-zwiadowca skanuje 500 wiadomości (Pass 0), starszy analityk pogłębia (Pass 0.5), a klient wyciąga celowane wiadomości na podstawie AI-wskazówek. Passom 1-4 trafia do ~1500 ultra-celowanych wiadomości — nie losowa próbka. Model: Gemini od Google.',
  accent: 'purple',
  groups: [
    {
      id: 'ai-recon',
      title: 'Rozpoznanie',
      accent: 'purple',
      algorithms: [aiRecon, aiDeepRecon],
    },
    {
      id: 'ai-analysis',
      title: 'Analiza główna',
      accent: 'purple',
      algorithms: [aiOverview, aiDynamics, aiPersonality, aiSynthesis],
    },
    {
      id: 'ai-roasts',
      title: 'Roasty',
      accent: 'purple',
      algorithms: [aiRoast, aiEnhancedRoast, aiStandup, aiMegaRoast, aiPrzegryw],
    },
    {
      id: 'ai-entertainment',
      title: 'Interaktywne',
      accent: 'purple',
      algorithms: [aiCourt, aiDating, aiSimulator, aiArgument, aiDelusion],
    },
    {
      id: 'ai-diagnostics',
      title: 'Diagnostyka',
      accent: 'purple',
      algorithms: [aiCps, aiSubtext, aiAcr, aiMoral, aiEmotions],
    },
    {
      id: 'ai-eks',
      title: 'Tryb Eks',
      accent: 'purple',
      algorithms: [aiEks],
    },
    {
      id: 'ai-images',
      title: 'Obrazy',
      accent: 'purple',
      algorithms: [aiImages],
    },
  ],
};

export const ALL_SECTIONS: MethodologySection[] = [MATH_SECTION, AI_SECTION];

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'nav-basics', title: 'Podstawy', accent: 'blue', sectionId: 'basics' },
  { id: 'nav-time', title: 'Czas', accent: 'blue', sectionId: 'time' },
  { id: 'nav-emotions', title: 'Emocje', accent: 'blue', sectionId: 'emotions' },
  { id: 'nav-language', title: 'Język', accent: 'blue', sectionId: 'language' },
  { id: 'nav-patterns', title: 'Wzorce', accent: 'blue', sectionId: 'patterns' },
  { id: 'nav-health', title: 'Zdrowie', accent: 'blue', sectionId: 'health' },
  { id: 'nav-derived', title: 'Pochodne', accent: 'blue', sectionId: 'derived' },
  { id: 'nav-ai-recon', title: 'Recon', accent: 'purple', sectionId: 'ai-recon' },
  { id: 'nav-ai-analysis', title: 'Analiza', accent: 'purple', sectionId: 'ai-analysis' },
  { id: 'nav-ai-roasts', title: 'Roasty', accent: 'purple', sectionId: 'ai-roasts' },
  { id: 'nav-ai-entertainment', title: 'Interaktywne', accent: 'purple', sectionId: 'ai-entertainment' },
  { id: 'nav-ai-diagnostics', title: 'Diagnostyka', accent: 'purple', sectionId: 'ai-diagnostics' },
  { id: 'nav-ai-eks', title: 'Tryb Eks', accent: 'purple', sectionId: 'ai-eks' },
  { id: 'nav-ai-images', title: 'Obrazy', accent: 'purple', sectionId: 'ai-images' },
];
