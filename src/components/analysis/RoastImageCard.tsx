'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, Loader2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RoastResult } from '@/lib/analysis/types';

interface RoastImageCardProps {
    roast: RoastResult;
    participants: string[];
    /** Raw conversation messages for picking a random excerpt */
    messages?: Array<{ sender: string; content: string; timestamp: number }>;
}

/** Pick a random contiguous slice of interesting messages for the roast comic. */
function pickRandomExcerpt(
    messages: Array<{ sender: string; content: string; timestamp: number }>,
    size = 12,
): Array<{ sender: string; content: string }> {
    const candidates = messages.filter(
        m => m.content.trim().length > 5 && m.content.length < 300,
    );

    if (candidates.length <= size) {
        return candidates.map(m => ({ sender: m.sender, content: m.content }));
    }

    const startIdx = Math.floor(Math.random() * (candidates.length - size));
    return candidates
        .slice(startIdx, startIdx + size)
        .map(m => ({ sender: m.sender, content: m.content }));
}

export default function RoastImageCard({
    roast,
    participants,
    messages,
}: RoastImageCardProps) {
    const [imageData, setImageData] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);

        const excerpt = messages?.length
            ? pickRandomExcerpt(messages)
            : [
                { sender: participants[0], content: 'Hey, how are you?' },
                { sender: participants[1] ?? 'B', content: 'Good! What about you?' },
            ];

        const roastSnippets: string[] = [];
        for (const personRoasts of Object.values(roast.roasts_per_person)) {
            roastSnippets.push(...personRoasts.slice(0, 2));
        }

        const superlativeTitles = roast.superlatives.map(s => `${s.title} (${s.holder})`);

        try {
            const response = await fetch('/api/analyze/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participants,
                    conversationExcerpt: excerpt,
                    roastContext: {
                        verdict: roast.verdict,
                        roastSnippets,
                        superlativeTitles,
                    },
                }),
            });

            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || `Generation failed: ${response.status}`);
            }

            const { imageBase64, mimeType } = await response.json();
            setImageData(`data:${mimeType};base64,${imageBase64}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [roast, participants, messages]);

    const handleDownload = useCallback(() => {
        if (!imageData) return;
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `podtekst-roast-${participants.join('-')}-comic.png`;
        link.click();
    }, [imageData, participants]);

    return (
        <Card
            className="overflow-hidden"
            style={{
                borderColor: 'transparent',
                backgroundImage:
                    'linear-gradient(var(--bg-card, #111111), var(--bg-card, #111111)), linear-gradient(135deg, #ef4444, #f97316, #ef4444)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                borderWidth: '1px',
                borderStyle: 'solid',
            }}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Flame className="size-4 text-red-500" />
                        Komiks roast
                    </CardTitle>
                    {imageData && (
                        <div className="flex gap-1.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerate}
                                disabled={loading}
                                className="h-7 gap-1.5 px-2 text-xs"
                            >
                                <RefreshCw className="size-3" />
                                Nowa scena
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownload}
                                className="h-7 gap-1.5 px-2 text-xs"
                            >
                                <Download className="size-3" />
                                Pobierz
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {!imageData && !loading && !error && (
                    <button
                        onClick={handleGenerate}
                        className="group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-red-500/30 bg-red-500/5 py-12 transition-all hover:border-orange-500/50 hover:bg-red-500/10"
                    >
                        <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 transition-colors group-hover:from-red-500/30 group-hover:to-orange-500/30">
                            <Flame className="size-7 text-red-500/80 transition-colors group-hover:text-red-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground/80">
                                Wygeneruj komiks roast
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Satyryczny komiks z najlepszymi roastami • Gemini Pro
                            </p>
                        </div>
                    </button>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
                            <Loader2 className="relative size-8 animate-spin text-red-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Rysowanie roast komiksu...</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Gemini rysuje satyryczne sceny z Waszych roastów
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="space-y-3 py-6 text-center">
                        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerate}
                            className="gap-2"
                        >
                            <RefreshCw className="size-3.5" />
                            Spróbuj ponownie
                        </Button>
                    </div>
                )}

                {imageData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <div className="overflow-hidden rounded-lg border border-red-500/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageData}
                                alt={`Roast comic of conversation between ${participants.join(' & ')}`}
                                className="w-full object-cover"
                            />
                        </div>
                        <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
                            Wygenerowane przez Gemini 3 Pro • Satyryczny roast {participants.join(' & ')}
                        </p>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
