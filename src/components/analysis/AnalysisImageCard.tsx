'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Loader2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Pass4Result } from '@/lib/analysis/types';

interface AnalysisImageCardProps {
    pass4: Pass4Result;
    participants: string[];
    /** Raw conversation messages for picking a random excerpt */
    messages?: Array<{ sender: string; content: string; timestamp: number }>;
    /** Previously saved image (base64 data URL) */
    savedImage?: string;
    /** Callback to persist generated image */
    onImageSaved?: (dataUrl: string) => void;
}

/** Pick a random contiguous slice of 8-15 interesting messages. */
function pickRandomExcerpt(
    messages: Array<{ sender: string; content: string; timestamp: number }>,
    size = 12,
): Array<{ sender: string; content: string }> {
    // Filter to text-only messages with real content
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

export default function AnalysisImageCard({
    pass4,
    participants,
    messages,
    savedImage,
    onImageSaved,
}: AnalysisImageCardProps) {
    const [imageData, setImageData] = useState<string | null>(savedImage ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Pick a random conversation excerpt
        const excerpt = messages?.length
            ? pickRandomExcerpt(messages)
            : [
                { sender: participants[0], content: 'Hey, how are you?' },
                { sender: participants[1] ?? 'B', content: 'Good! What about you?' },
            ];

        try {
            const response = await fetch('/api/analyze/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participants,
                    conversationExcerpt: excerpt,
                    executiveSummary: pass4?.executive_summary,
                    healthScore: pass4?.health_score?.overall,
                }),
            });

            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.error || `Generation failed: ${response.status}`);
            }

            const { imageBase64, mimeType } = await response.json();
            const dataUrl = `data:${mimeType};base64,${imageBase64}`;
            setImageData(dataUrl);
            onImageSaved?.(dataUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [pass4, participants, messages, onImageSaved]);

    const handleDownload = useCallback(() => {
        if (!imageData) return;
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `podtekst-${participants.join('-')}-comic.png`;
        link.click();
    }, [imageData, participants]);

    return (
        <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <ImageIcon className="size-4 text-primary" />
                        Komiks konwersacji
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
                        className="group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-secondary/30 py-12 transition-all hover:border-primary/40 hover:bg-secondary/50"
                    >
                        <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                            <ImageIcon className="size-7 text-primary/70 transition-colors group-hover:text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-foreground/80">
                                Wygeneruj komiks z rozmowy
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Losowy fragment konwersacji w stylu kreskówkowym • Gemini Pro
                            </p>
                        </div>
                    </button>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="relative">
                            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                            <Loader2 className="relative size-8 animate-spin text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium">Rysowanie komiksu...</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Gemini rysuje kreskówkowe sceny z Waszej rozmowy
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
                        <div className="overflow-hidden rounded-lg border border-border/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageData}
                                alt={`Comic-style visualization of conversation between ${participants.join(' & ')}`}
                                className="w-full object-cover"
                            />
                        </div>
                        <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
                            Wygenerowane przez Gemini 3 Pro • Losowy fragment rozmowy {participants.join(' & ')}
                        </p>
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
