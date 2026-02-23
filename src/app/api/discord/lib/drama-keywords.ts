/**
 * Drama keywords for Discord Search API.
 * PL + EN lists of conflict/drama/cringe words to search for.
 */

// Top 3 are always included — highest drama signal
const TOP_KEYWORDS = ['kurwa', 'przepraszam', 'idiota'];

const PL_KEYWORDS = [
    'pierdol', 'chuj', 'debil', 'kretyn', 'kłótnia',
    'sorry', 'żałuję', 'nienawidzę', 'wkurwia',
    'rozstanie', 'zerwać', 'zdrada', 'kłamiesz',
    'manipulacja', 'cringe', 'simp', 'cwel',
    'patola', 'debilu', 'spierdalaj', 'jebany',
    'beka', 'żenada', 'wstyd', 'płaczę',
    'zdradzić', 'oszust', 'kłamca',
];

const EN_KEYWORDS = [
    'fuck', 'shit', 'idiot', 'stupid', 'hate',
    'fight', 'argue', 'sorry', 'apologize',
    'breakup', 'cheat', 'lie', 'manipulate',
    'cringe', 'simp',
];

const ALL_EXTRA = [...PL_KEYWORDS, ...EN_KEYWORDS];

/**
 * Select drama keywords for search.
 * Always includes top 3 high-impact keywords + random picks from the rest.
 * @param count Total keywords to return (including top 3). Default 6.
 */
export function selectDramaKeywords(count = 6): string[] {
    const topCount = Math.min(TOP_KEYWORDS.length, count);
    const selected = TOP_KEYWORDS.slice(0, topCount);

    const remaining = count - topCount;
    if (remaining <= 0) return selected;

    // Shuffle extras and pick
    const shuffled = [...ALL_EXTRA];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Avoid duplicates with top keywords
    const topSet = new Set(selected);
    const extras = shuffled.filter((k) => !topSet.has(k)).slice(0, remaining);
    return [...selected, ...extras];
}

/** Get all available keywords (for UI display or manual selection). */
export function getAllDramaKeywords(): string[] {
    return [...TOP_KEYWORDS, ...ALL_EXTRA];
}
