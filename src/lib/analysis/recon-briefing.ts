/**
 * Pure function that builds the Intelligence Briefing text from recon passes.
 * No server-side dependencies — safe to use on client or server.
 */

import type { ReconResult, DeepReconResult } from './types';

export function formatReconInternal(recon: ReconResult): string {
    const lines: string[] = [];

    if (recon.flaggedDateRanges.length > 0) {
        lines.push('CRITICAL PERIODS:');
        for (const r of recon.flaggedDateRanges) {
            const pLabel = r.priority === 1 ? '!!!' : r.priority === 2 ? '!!' : '!';
            lines.push(`  ${pLabel} ${r.start} to ${r.end}: ${r.reason}`);
        }
    }

    if (recon.topicsToInvestigate.length > 0) {
        lines.push('');
        lines.push('KEY TOPICS:');
        for (const t of recon.topicsToInvestigate) {
            lines.push(`  - ${t.topic} (${t.searchKeywords.join(', ')}): ${t.reason}`);
        }
    }

    if (recon.emotionalPeaks.length > 0) {
        lines.push('');
        lines.push('EMOTIONAL PEAKS:');
        for (const p of recon.emotionalPeaks) {
            lines.push(`  - ~${p.approximateDate}: ${p.emotion} — ${p.description}`);
        }
    }

    if (recon.openQuestions.length > 0) {
        lines.push('');
        lines.push('OPEN QUESTIONS:');
        for (const q of recon.openQuestions) {
            lines.push(`  - ${q}`);
        }
    }

    return lines.join('\n');
}

export function buildReconBriefingText(recon: ReconResult, deepRecon?: DeepReconResult): string {
    const lines: string[] = ['=== INTELLIGENCE BRIEFING (from Recon Passes) ==='];

    lines.push(formatReconInternal(recon));

    if (deepRecon) {
        lines.push('');
        lines.push('--- DEEP RECON REFINEMENTS (Pass 0.5) ---');

        if (deepRecon.narrativeSummary) {
            lines.push('');
            lines.push('RELATIONSHIP NARRATIVE:');
            lines.push(`  ${deepRecon.narrativeSummary}`);
        }

        if (deepRecon.refinedDateRanges.length > 0) {
            lines.push('');
            lines.push('REFINED CRITICAL PERIODS:');
            for (const r of deepRecon.refinedDateRanges) {
                const pLabel = r.priority === 1 ? '!!!' : r.priority === 2 ? '!!' : '!';
                lines.push(`  ${pLabel} ${r.start} to ${r.end}: ${r.reason}`);
            }
        }

        if (deepRecon.refinedTopics.length > 0) {
            lines.push('');
            lines.push('ADDITIONAL TOPICS DISCOVERED:');
            for (const t of deepRecon.refinedTopics) {
                lines.push(`  - ${t.topic} (${t.searchKeywords.join(', ')}): ${t.reason}`);
            }
        }

        if (deepRecon.confirmedPeaks.length > 0) {
            lines.push('');
            lines.push('CONFIRMED EMOTIONAL PEAKS (with evidence):');
            for (const p of deepRecon.confirmedPeaks) {
                lines.push(`  - ~${p.approximateDate}: ${p.emotion} — ${p.description}`);
            }
        }

        if (deepRecon.confirmedThemes.length > 0) {
            lines.push('');
            lines.push('CONFIRMED THEMES: ' + deepRecon.confirmedThemes.join(', '));
        }

        if (deepRecon.newQuestions.length > 0) {
            lines.push('');
            lines.push('UNRESOLVED QUESTIONS:');
            for (const q of deepRecon.newQuestions) {
                lines.push(`  - ${q}`);
            }
        }
    }

    lines.push('');
    lines.push('TARGETED SAMPLE NOTE: The messages below include AI-targeted samples from the critical periods and topics identified by two rounds of reconnaissance. These are NOT random — pay special attention to messages from flagged date ranges and topics.');
    lines.push('===');

    return lines.join('\n');
}
