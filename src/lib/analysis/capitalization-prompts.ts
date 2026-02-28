/**
 * Capitalization Response Detection — Active-Constructive Responding (ACR).
 *
 * Gable et al. (2004) identified 4 response types to good news sharing:
 * - Active-Constructive (AC): enthusiastic, asks follow-up questions
 * - Passive-Constructive (PC): quiet support without elaboration
 * - Active-Destructive (AD): finds problems, undermines the good news
 * - Passive-Destructive (PD): ignores, changes topic entirely
 *
 * 86% of happy couples vs 33% of divorcing couples respond Active-Constructively.
 *
 * References:
 * - Gable, S. L., Reis, H. T., Impett, E. A., & Asher, E. R. (2004). What do
 *   you do when things go right? JPSP, 87(2), 228-245.
 * - Peters, B. J. et al. (2018). InterCAP model. Social and Personality
 *   Psychology Compass, 12(7), e12398.
 */

export type ACRType = 'active_constructive' | 'passive_constructive' | 'active_destructive' | 'passive_destructive';

export interface CapitalizationExample {
  goodNews: string;
  response: string;
  responder: string;
  type: ACRType;
  explanation: string;
}

export interface PersonCapitalizationProfile {
  name: string;
  typeCounts: Record<ACRType, number>;
  dominantType: ACRType;
  /** Overall ACR score 0-100: higher = more Active-Constructive */
  acrScore: number;
}

export interface CapitalizationResult {
  perPerson: Record<string, PersonCapitalizationProfile>;
  examples: CapitalizationExample[];
  /** Dyadic overall ACR score */
  overallScore: number;
  /** Polish interpretation */
  interpretation: string;
  gottmanComparison: string;
}

export const CAPITALIZATION_SYSTEM_PROMPT = `Jesteś ekspertem od psychologii relacji interpersonalnych. Twoim zadaniem jest zidentyfikować momenty, w których jedna osoba dzieli się DOBRĄ WIADOMOŚCIĄ (sukcesem, pozytywnym wydarzeniem, radością) i sklasyfikować ODPOWIEDŹ partnera według modelu Active-Constructive Responding (Gable et al., 2004).

TYPY ODPOWIEDZI:
1. active_constructive (AC): Entuzjastyczna odpowiedź, pytania pogłębiające, dzielenie radości partnera. ("Wow, niesamowite! Opowiedz mi więcej! Jak się czujesz?")
2. passive_constructive (PC): Cichy, neutralny support. Krótkie potwierdzenie bez pogłębienia. ("Super, cieszę się.")
3. active_destructive (AD): Aktywne szukanie problemów, negatywny spin, podważanie dobrej wieści. ("Ale pamiętaj że to oznacza więcej pracy...")
4. passive_destructive (PD): Ignorowanie, nagła zmiana tematu, odpowiedź jakby dobra wiadomość nie padła. (Partner mówi o awansie, a osoba odpowiada o pogodzie)

WYJŚCIE JSON (koniecznie!):
{
  "events": [
    {
      "goodNewsMessage": "dosłowny cytat wiadomości z dobrą nowiną",
      "goodNewsSender": "imię osoby dzielącej się dobrą nowiną",
      "responseMessage": "dosłowny cytat odpowiedzi",
      "responseSender": "imię odpowiadającego",
      "type": "active_constructive|passive_constructive|active_destructive|passive_destructive",
      "explanation": "1-2 zdania uzasadnienia po polsku"
    }
  ],
  "perPerson": {
    "IMIĘ_OSOBY_A": {
      "ac": <liczba AC odpowiedzi tej osoby>,
      "pc": <liczba PC odpowiedzi tej osoby>,
      "ad": <liczba AD odpowiedzi tej osoby>,
      "pd": <liczba PD odpowiedzi tej osoby>
    },
    "IMIĘ_OSOBY_B": {
      "ac": <liczba AC odpowiedzi tej osoby>,
      "pc": <liczba PC odpowiedzi tej osoby>,
      "ad": <liczba AD odpowiedzi tej osoby>,
      "pd": <liczba PD odpowiedzi tej osoby>
    }
  },
  "interpretation": "2-3 zdania interpretacji po polsku dla całej relacji"
}

KRYTYCZNE ZASADY:
- W "perPerson" MUSZĄ znaleźć się WSZYSCY uczestnicy rozmowy — nawet jeśli ktoś odpowiadał rzadko, wpisz go z zerami
- Obie osoby mogą zarówno dzielić się dobrymi wieściami jak i odpowiadać — szukaj zdarzeń w OBU kierunkach
- Szukaj co najmniej 3-5 przykładów dzielenia się dobrą nowiną (po obu stronach rozmowy)
- Jeśli nie ma wystarczająco dużo przykładów, zwróć tyle ile jest (minimum 1)
- Klasyfikuj ODPOWIEDZI, nie same wiadomości z dobrą nowiną
- Bądź precyzyjny — AC wymaga aktywnego entuzjazmu, nie tylko pozytywności
- Pisz interpretację po polsku`;

export function buildCapitalizationPrompt(
  messagesText: string,
  participants: string[],
): string {
  return `Przeanalizuj poniższe fragmenty rozmowy między: ${participants.join(', ')}.

Zidentyfikuj momenty, w których ktoś dzieli się dobrą wiadomością (sukces, awans, pozytywne wydarzenie, radosna informacja) i sklasyfikuj odpowiedź partnera.

ROZMOWA:
${messagesText}`;
}
