/**
 * Emotion Cause Extraction — AI pass prompts and types.
 *
 * Identifies emotion-cause pairs in the conversation:
 * who felt what, and what triggered it (a partner's message or external event).
 *
 * References:
 * - Poria, S. et al. (2021). Recognizing Emotion Cause in Conversations.
 *   Cognitive Computation, 13, 1317-1332.
 * - SemEval-2024 Task 3: Multimodal Emotion Cause Analysis in Conversations.
 */

export type EmotionType =
  | 'radość'
  | 'smutek'
  | 'złość'
  | 'strach'
  | 'zaskoczenie'
  | 'frustracja'
  | 'czułość'
  | 'pustka';

export interface EmotionCausePair {
  /** Who experienced the emotion */
  emotionHolder: string;
  emotion: EmotionType;
  /** What caused it — summary of the trigger */
  trigger: string;
  /** Who sent the triggering message (if interpersonal), or 'external' */
  triggerSender: string;
  /** 'interpersonal' (partner triggered) or 'external' (outside event) */
  type: 'interpersonal' | 'external';
  /** Short quote from the conversation as evidence */
  snippet: string;
}

export interface EmotionCausesResult {
  causePairs: EmotionCausePair[];
  /** How many times each person triggers emotions in each other person */
  triggerMap: Record<string, Record<string, number>>;
  /** Plain-language dominant trigger description */
  dominantTrigger: string;
  interpretation: string;
  /** Fraction of interpersonal emotional triggers each person is responsible for (0-1) */
  emotionalResponsibility: Record<string, number>;
}

export function buildEmotionCausesPrompt(
  messages: Array<{ sender: string; content: string; index: number }>,
  participants: string[],
): string {
  const sampleText = messages
    .map(m => `[${m.index}][${m.sender}]: ${m.content}`)
    .join('\n');

  return `Przeanalizuj poniższe wiadomości i zidentyfikuj pary emocja-przyczyna.

UCZESTNICY: ${participants.join(', ')}

WIADOMOŚCI (próbka z indeksami):
${sampleText}

Dla każdej WYRAŹNEJ ekspresji emocji zidentyfikuj:
1. Kto wyraża emocję (emotionHolder)
2. Jaka emocja (z listy: radość, smutek, złość, strach, zaskoczenie, frustracja, czułość, pustka)
3. Co ją wywołało (konkretna wiadomość lub zewnętrzne wydarzenie)
4. Kto to wywołał (triggerSender — imię uczestnika lub "external")
5. Krótki cytat jako dowód (snippet — max 60 znaków)

Zwróć JSON (bez markdown):
{
  "causePairs": [
    {
      "emotionHolder": "${participants[0]}",
      "emotion": "frustracja",
      "trigger": "opis triggera 1 zdanie",
      "triggerSender": "${participants.length > 1 ? participants[1] : 'external'}",
      "type": "interpersonal",
      "snippet": "cytat max 60 znaków"
    }
  ],
  "triggerMap": {
    ${participants.map(p => `"${p}": { ${participants.filter(o => o !== p).map(o => `"${o}": 0`).join(', ')}, "external": 0 }`).join(',\n    ')}
  },
  "dominantTrigger": "1 zdanie kto najczęściej wywołuje emocje u kogo",
  "interpretation": "2-3 zdania po polsku o emocjonalnej dynamice tej rozmowy",
  "emotionalResponsibility": {
    ${participants.map(p => `"${p}": 0.0`).join(',\n    ')}
  }
}

Zwróć TYLKO pary gdzie emocja jest WYRAŹNIE widoczna w tekście. Maksimum 10 causePairs.
triggerMap: zlicz ile razy dana osoba wywołuje emocje u innych.
emotionalResponsibility: dla każdej osoby — jaki ułamek (0-1) WSZYSTKICH interpersonalnych triggerów pochodzi od niej.`;
}

export const EMOTION_CAUSES_SYSTEM = `Jesteś ekspertem w analizie emocji i przyczyn emocji w konwersacjach (SemEval-2024 Task 3, Poria 2021).
Identyfikujesz pary emocja-przyczyna tylko gdy emocja jest wyraźnie widoczna w tekście wiadomości.
Nie wnioskujesz o emocjach — tylko wykrywasz jawne ekspresje.
Zwracasz tylko poprawny JSON bez żadnego otaczającego tekstu ani markdown.`;
