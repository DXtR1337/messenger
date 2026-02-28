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
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden"
        >
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-4">
                <div>
                    <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">Top słowa</h3>
                    <p className="mt-0.5 text-xs text-white/50">
                        Najczęściej używane słowa i frazy (bez stopwords)
                    </p>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
                    <button
                        onClick={() => setActiveTab('words')}
                        className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${activeTab === 'words'
                                ? 'bg-white/[0.06] text-white/70'
                                : 'text-white/50 hover:text-white/60'
                            }`}
                    >
                        Słowa
                    </button>
                    <button
                        onClick={() => setActiveTab('phrases')}
                        className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${activeTab === 'phrases'
                                ? 'bg-white/[0.06] text-white/70'
                                : 'text-white/50 hover:text-white/60'
                            }`}
                    >
                        Frazy
                    </button>
                </div>
            </div>

            {/* Word list */}
            <div className="flex flex-col gap-2 px-4 sm:px-6 py-4">
                {items.map((entry) => {
                    const label = 'word' in entry ? entry.word : entry.phrase;
                    const pctA = maxCount > 0 ? (entry.a / maxCount) * 100 : 0;
                    const pctB = maxCount > 0 ? (entry.b / maxCount) * 100 : 0;

                    return (
                        <div key={label} className="flex items-center gap-2.5">
                            <span className="w-[55px] sm:w-[70px] lg:w-[100px] truncate text-[11px] text-white/60 font-medium">
                                {label}
                            </span>
                            <div
                                className="flex h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.04]"
                                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                            >
                                <div
                                    className="transition-all duration-500 rounded-full"
                                    style={{
                                        width: `${pctA}%`,
                                        background: 'linear-gradient(90deg, #3b82f690, #3b82f6)',
                                        boxShadow: '0 0 8px #3b82f625',
                                    }}
                                />
                                <div
                                    className="transition-all duration-500 rounded-full"
                                    style={{
                                        width: `${pctB}%`,
                                        background: 'linear-gradient(90deg, #a855f790, #a855f7)',
                                        boxShadow: '0 0 8px #a855f725',
                                    }}
                                />
                            </div>
                            <span className="w-8 sm:w-14 text-right font-display text-[11px] text-white/50">
                                {entry.total}×
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Vocabulary stats footer */}
            <div className="border-t border-white/[0.04] px-4 sm:px-6 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 text-xs">
                    {personA && metricsA && (
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block size-2.5 rounded-[3px] bg-chart-a" />
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
                            <span className="inline-block size-2.5 rounded-[3px] bg-chart-b" />
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
