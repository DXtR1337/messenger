/**
 * Moral Foundations Theory (MFT) — AI pass prompts and types.
 *
 * Analyzes which of Haidt's 6 moral foundations dominate
 * each participant's communication style in the conversation.
 *
 * References:
 * - Haidt, J. & Graham, J. (2007). When morality opposes justice.
 *   Social Justice Research, 20(1), 98-116.
 * - Rathje, S. et al. (2024). Linguistic signals of moral foundations
 *   in political messaging. PNAS, 121(8). r=0.59-0.77.
 */

export interface PersonMoralFoundations {
  care: number;        // 0-10: empathy, harm prevention, compassion
  fairness: number;    // 0-10: reciprocity, rules, equality
  loyalty: number;     // 0-10: solidarity, group-sacrifice, belonging
  authority: number;   // 0-10: hierarchy, respect, tradition
  sanctity: number;    // 0-10: purity norms, disgust, sacred values
  liberty: number;     // 0-10: autonomy, freedom from oppression
  dominantFoundation: 'care' | 'fairness' | 'loyalty' | 'authority' | 'sanctity' | 'liberty';
  interpretation: string; // Polish, 1-2 sentences
}

export interface MoralFoundationsResult {
  perPerson: Record<string, PersonMoralFoundations>;
  /** Values that differ most between participants (top 2) */
  conflicts: string[];
  /** Overall compatibility 0-100 (higher = more aligned foundations) */
  moralCompatibility: number;
  overallProfile: string;  // Polish, 2-3 sentences
}

export function buildMoralFoundationsPrompt(
  messages: Array<{ sender: string; content: string }>,
  participants: string[],
): string {
  const sampleText = messages
    .map(m => `[${m.sender}]: ${m.content}`)
    .join('\n');

  return `Przeanalizuj poniższe wiadomości pod kątem Teorii Fundamentów Moralnych (MFT) Haidta.

UCZESTNICY: ${participants.join(', ')}

WIADOMOŚCI (próbka):
${sampleText}

Oceń każdego uczestnika na 6 fundamentach moralnych w skali 0-10 bazując na tym, JAKIE WARTOŚCI KOMUNIKUJE w swoich wiadomościach (nie na tym co mówi o sobie).

Fundamenty:
- care (0-10): troska, empatia, zapobieganie krzywdzie, wrażliwość na ból innych
- fairness (0-10): sprawiedliwość, wzajemność, zasady, równość, uczciwość
- loyalty (0-10): lojalność, solidarność grupowa, poświęcenie dla bliskich, "my vs oni"
- authority (0-10): szacunek dla hierarchii, tradycji, zasad, starszych
- sanctity (0-10): czystość, normy moralne, wstręt wobec naruszeń norm
- liberty (0-10): autonomia, wolność wyboru, sprzeciw wobec kontroli i opresji

Zwróć JSON (bez markdown):
{
  "perPerson": {
    "${participants[0]}": {
      "care": 0-10,
      "fairness": 0-10,
      "loyalty": 0-10,
      "authority": 0-10,
      "sanctity": 0-10,
      "liberty": 0-10,
      "dominantFoundation": "care|fairness|loyalty|authority|sanctity|liberty",
      "interpretation": "2 zdania po polsku opisujące moralny profil tej osoby"
    }${participants.length > 1 ? `,
    "${participants[1]}": {
      "care": 0-10,
      "fairness": 0-10,
      "loyalty": 0-10,
      "authority": 0-10,
      "sanctity": 0-10,
      "liberty": 0-10,
      "dominantFoundation": "care|fairness|loyalty|authority|sanctity|liberty",
      "interpretation": "2 zdania po polsku opisujące moralny profil tej osoby"
    }` : ''}
  },
  "conflicts": ["2-3 zdania opisujące gdzie wartości uczestników się zderzają"],
  "moralCompatibility": 0-100,
  "overallProfile": "2-3 zdania o moralnym klimacie tej rozmowy"
}`;
}

export const MORAL_FOUNDATIONS_SYSTEM = `Jesteś ekspertem w Teorii Fundamentów Moralnych (Haidt 2007).
Analizujesz rozmowy pod kątem 6 fundamentów moralnych obecnych w języku uczestników.
Zwracasz tylko poprawny JSON bez żadnego otaczającego tekstu ani markdown.
Bądź precyzyjny — opieraj oceny na konkretnych wzorcach językowych, nie na powierzchownych deklaracjach.`;
