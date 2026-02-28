/**
 * Health Score computation with explicit, documented weights.
 *
 * Component weights are inspired by relationship psychology constructs:
 * - BALANCE (0.25): Investment reciprocity predicts satisfaction (Gottman, 1999)
 * - RECIPROCITY (0.20): Mutual engagement prevents resentment (Baucom et al., 2002)
 * - RESPONSE_PATTERN (0.20): Communication consistency as commitment signal
 * - EMOTIONAL_SAFETY (0.20): Safe expression predicts resilience (Gottman & Levenson, 2000)
 * - GROWTH (0.15): Trajectory matters — stagnation ≠ stability
 *
 * NOTE: Specific weight values are heuristic, not empirically derived from data.
 */

// ============================================================
// Weight Constants
// ============================================================

export const HEALTH_SCORE_WEIGHTS = {
    BALANCE: 0.25,
    RECIPROCITY: 0.20,
    RESPONSE_PATTERN: 0.20,
    EMOTIONAL_SAFETY: 0.20,
    GROWTH: 0.15,
} as const;

// ============================================================
// Types
// ============================================================

export interface HealthScoreComponents {
    balance: number;          // 0-100
    reciprocity: number;      // 0-100 (maps from old "engagement")
    response_pattern: number; // 0-100 (maps from old "communication_quality")
    emotional_safety: number; // 0-100
    growth_trajectory: number;// 0-100
}

export interface HealthScoreResult {
    overall: number;
    components: HealthScoreComponents;
    label: string;
    explanation: string;
}

// ============================================================
// Computation
// ============================================================

/**
 * Compute a deterministic weighted health score from component scores.
 * This can be used to re-compute or validate AI-generated health scores.
 */
export function computeHealthScore(
    components: HealthScoreComponents,
    explanation?: string,
): HealthScoreResult {
    const w = HEALTH_SCORE_WEIGHTS;

    const raw =
        components.balance * w.BALANCE +
        components.reciprocity * w.RECIPROCITY +
        components.response_pattern * w.RESPONSE_PATTERN +
        components.emotional_safety * w.EMOTIONAL_SAFETY +
        components.growth_trajectory * w.GROWTH;

    // Clamp to 0-100
    const overall = Math.round(Math.max(0, Math.min(100, raw)));

    return {
        overall,
        components,
        label: getHealthScoreLabel(overall),
        explanation: explanation ?? generateExplanation(overall, components),
    };
}

/**
 * Get a human-readable Polish label for a health score.
 */
export function getHealthScoreLabel(score: number): string {
    if (score >= 80) return 'Zdrowa';
    if (score >= 60) return 'Stabilna';
    if (score >= 40) return 'Wymaga uwagi';
    return 'Niepokojąca';
}

/**
 * Normalize a raw metric value to be stable across conversation sizes.
 * Uses logarithmic scaling so that a 100-message conversation and a
 * 10,000-message conversation produce comparable scores.
 */
export function normalizeByVolume(
    value: number,
    totalMessages: number,
    minMessages: number = 50,
): number {
    if (totalMessages < minMessages) {
        // Penalize very short conversations — not enough data
        const penalty = totalMessages / minMessages;
        return value * penalty;
    }
    // Log-normalize: diminishing returns past ~1000 messages
    const logFactor = Math.log10(Math.min(totalMessages, 10000)) / Math.log10(10000);
    return value * (0.7 + 0.3 * logFactor);
}

// ============================================================
// Internal Helpers
// ============================================================

function generateExplanation(
    overall: number,
    components: HealthScoreComponents,
): string {
    const sorted = Object.entries(components)
        .sort(([, a], [, b]) => a - b);

    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    const parts: string[] = [];

    if (overall >= 80) {
        parts.push('Relacja wykazuje zdrowe wzorce komunikacji.');
    } else if (overall >= 60) {
        parts.push('Relacja jest ogólnie stabilna, ale istnieją obszary do poprawy.');
    } else if (overall >= 40) {
        parts.push('Relacja wymaga uwagi — kilka wskaźników sygnalizuje nierównowagę.');
    } else {
        parts.push('Relacja wykazuje niepokojące wzorce wymagające głębszej refleksji.');
    }

    if (weakest && weakest[1] < 50) {
        const labels: Record<string, string> = {
            balance: 'równowaga sił',
            reciprocity: 'wzajemność',
            response_pattern: 'wzorce odpowiedzi',
            emotional_safety: 'bezpieczeństwo emocjonalne',
            growth_trajectory: 'trajektoria rozwoju',
        };
        parts.push(`Najsłabszy obszar: ${labels[weakest[0]] ?? weakest[0]} (${weakest[1]}/100).`);
    }

    if (strongest && strongest[1] >= 70) {
        const labels: Record<string, string> = {
            balance: 'równowaga sił',
            reciprocity: 'wzajemność',
            response_pattern: 'wzorce odpowiedzi',
            emotional_safety: 'bezpieczeństwo emocjonalne',
            growth_trajectory: 'trajektoria rozwoju',
        };
        parts.push(`Mocna strona: ${labels[strongest[0]] ?? strongest[0]} (${strongest[1]}/100).`);
    }

    return parts.join(' ');
}
