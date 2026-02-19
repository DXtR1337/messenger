'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { PersonMetrics } from '@/lib/parsers/types';

interface TopWordsCardProps {
    perPerson: Record<string, PersonMetrics>;
    participants: string[];
}

type TabType = 'words' | 'phrases';

export default function TopWordsCard({
    perPerson,
    participants,
}: TopWordsCardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('words');

    const personA = participants[0];
    const personB = participants[1];

    const metricsA = perPerson[personA];
    const metricsB = personB ? perPerson[personB] : undefined;

    // Merge words from both people for side-by-side comparison
    const mergedWords = useMemo(() => {
        const wordMap = new Map<string, { a: number; b: number; total: number }>();

        for (const { word, count } of metricsA?.topWords ?? []) {
            const existing = wordMap.get(word) ?? { a: 0, b: 0, total: 0 };
            existing.a += count;
            existing.total += count;
            wordMap.set(word, existing);
        }
        for (const { word, count } of metricsB?.topWords ?? []) {
            const existing = wordMap.get(word) ?? { a: 0, b: 0, total: 0 };
            existing.b += count;
            existing.total += count;
            wordMap.set(word, existing);
        }

        return [...wordMap.entries()]
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 15)
            .map(([word, counts]) => ({ word, ...counts }));
    }, [metricsA, metricsB]);

    const mergedPhrases = useMemo(() => {
        const phraseMap = new Map<string, { a: number; b: number; total: number }>();

        for (const { phrase, count } of metricsA?.topPhrases ?? []) {
            const existing = phraseMap.get(phrase) ?? { a: 0, b: 0, total: 0 };
            existing.a += count;
            existing.total += count;
            phraseMap.set(phrase, existing);
        }
        for (const { phrase, count } of metricsB?.topPhrases ?? []) {
            const existing = phraseMap.get(phrase) ?? { a: 0, b: 0, total: 0 };
            existing.b += count;
            existing.total += count;
            phraseMap.set(phrase, existing);
        }

        return [...phraseMap.entries()]
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10)
            .map(([phrase, counts]) => ({ phrase, ...counts }));
    }, [metricsA, metricsB]);

    const maxCount = useMemo(() => {
        if (activeTab === 'words') {
            return mergedWords.length > 0 ? mergedWords[0].total : 1;
        }
        return mergedPhrases.length > 0 ? mergedPhrases[0].total : 1;
    }, [activeTab, mergedWords, mergedPhrases]);

    const items = activeTab === 'words' ? mergedWords : mergedPhrases;

    if ((metricsA?.topWords?.length ?? 0) === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-xl border border-border bg-card"
        >
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
                <div>
                    <h3 className="font-display text-[15px] font-bold">Top słowa</h3>
                    <p className="mt-0.5 text-xs text-text-muted">
                        Najczęściej używane słowa i frazy (bez stopwords)
                    </p>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                    <button
                        onClick={() => setActiveTab('words')}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeTab === 'words'
                                ? 'bg-secondary text-white'
                                : 'text-text-muted hover:text-muted-foreground'
                            }`}
                    >
                        Słowa
                    </button>
                    <button
                        onClick={() => setActiveTab('phrases')}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeTab === 'phrases'
                                ? 'bg-secondary text-white'
                                : 'text-text-muted hover:text-muted-foreground'
                            }`}
                    >
                        Frazy
                    </button>
                </div>
            </div>

            {/* Word list */}
            <div className="flex flex-col gap-2 px-3 sm:px-5 py-4">
                {items.map((entry, i) => {
                    const label = 'word' in entry ? entry.word : entry.phrase;
                    const pctA = maxCount > 0 ? (entry.a / maxCount) * 100 : 0;
                    const pctB = maxCount > 0 ? (entry.b / maxCount) * 100 : 0;

                    return (
                        <div key={label} className="flex items-center gap-2.5">
                            <span className="hidden sm:inline w-5 text-right font-display text-xs text-text-muted">
                                {i + 1}
                            </span>
                            <span className="w-[55px] sm:w-[70px] lg:w-[100px] truncate text-[12px] sm:text-[13px] font-medium">
                                {label}
                            </span>
                            <div className="flex h-2.5 flex-1 overflow-hidden rounded-sm bg-muted">
                                <div
                                    className="bg-chart-a transition-all duration-500"
                                    style={{ width: `${pctA}%` }}
                                />
                                <div
                                    className="bg-chart-b transition-all duration-500"
                                    style={{ width: `${pctB}%` }}
                                />
                            </div>
                            <span className="w-8 sm:w-14 text-right font-display text-[11px] sm:text-xs text-text-muted">
                                {entry.total}×
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Vocabulary stats footer */}
            <div className="border-t border-border px-3 sm:px-5 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 text-xs">
                    {personA && metricsA && (
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm bg-chart-a" />
                            <span className="text-text-muted">{personA}</span>
                            <span className="ml-1 font-display text-white">
                                {metricsA.uniqueWords.toLocaleString()}
                            </span>
                            <span className="text-text-muted">unikalnych</span>
                            <span className="ml-1 font-display text-text-muted">
                                ({(metricsA.vocabularyRichness * 100).toFixed(1)}%)
                            </span>
                        </div>
                    )}
                    {personB && metricsB && (
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm bg-chart-b" />
                            <span className="text-text-muted">{personB}</span>
                            <span className="ml-1 font-display text-white">
                                {metricsB.uniqueWords.toLocaleString()}
                            </span>
                            <span className="text-text-muted">unikalnych</span>
                            <span className="ml-1 font-display text-text-muted">
                                ({(metricsB.vocabularyRichness * 100).toFixed(1)}%)
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
