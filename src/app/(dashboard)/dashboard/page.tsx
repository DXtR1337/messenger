'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, Brain, GitCompareArrows, MessageSquareText, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listAnalyses, deleteAnalysis, formatDate, formatNumber } from '@/lib/utils';
import type { AnalysisIndexEntry } from '@/lib/analysis/types';

function MiniHealthRing({ score }: { score: number }) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute font-mono text-[0.55rem] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisIndexEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    listAnalyses().then(entries => {
      setAnalyses(entries);
      setLoaded(true);
    });
  }, []);

  function handleDeleteClick(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    setPendingDeleteId(id);
  }

  function handleCancelDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setPendingDeleteId(null);
  }

  async function handleConfirmDelete(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    await deleteAnalysis(id);
    setPendingDeleteId(null);
    const updated = await listAnalyses();
    setAnalyses(updated);
  }

  // Avoid hydration mismatch: render nothing until client-side data is loaded
  if (!loaded) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Twoje analizy</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Twoje analizy</h1>
        <div className="flex min-h-[60vh] items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex w-full max-w-md flex-col items-center rounded-xl border border-border bg-card px-8 py-14 text-center"
          >
            {/* Icon cluster with gradient circle backdrop */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
              className="relative mb-8 flex items-center justify-center"
            >
              {/* Gradient glow behind the icon */}
              <div className="absolute size-24 rounded-full bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent blur-md" />
              <div className="relative flex size-20 items-center justify-center rounded-full border border-border/60 bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                <MessageSquareText className="size-8 text-blue-400" strokeWidth={1.5} />
                <BarChart3
                  className="absolute -bottom-1 -right-1 size-5 text-purple-400"
                  strokeWidth={2}
                />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mb-2 font-display text-xl font-bold tracking-tight text-foreground"
            >
              Brak analiz
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground"
            >
              Wrzu{'\u0107'} eksport z Messengera lub WhatsApp i odkryj, co naprawd{'\u0119'} si{'\u0119'} dzieje.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <Button asChild className="gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
                <Link href="/analysis/new">
                  Rozpocznij pierwsz{'\u0105'} analiz{'\u0119'}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Twoje analizy</h1>
        {analyses.length >= 2 && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/analysis/compare">
              <GitCompareArrows className="size-4" />
              Porównaj analizy
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analyses.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
          >
            <Card
              className="relative cursor-pointer overflow-hidden border-border transition-all duration-200 hover:border-border-hover hover:-translate-y-[2px] hover:shadow-lg hover:shadow-primary/5"
              onClick={() => router.push(`/analysis/${entry.id}`)}
            >
              <CardHeader>
                <CardTitle className="truncate text-sm">{entry.title}</CardTitle>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(event) => handleDeleteClick(event, entry.id)}
                    aria-label="Usu{'\u0144'} analiz{'\u0119'}"
                  >
                    <X className="size-3" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(entry.createdAt)}</span>
                  <span className="font-mono">
                    {formatNumber(entry.messageCount)} wiad.
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {entry.participants.map((name) => (
                      <Badge key={name} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                    {entry.hasQualitative && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Brain className="size-3" />
                        Analiza AI
                      </Badge>
                    )}
                  </div>
                  {entry.healthScore != null && (
                    <MiniHealthRing score={entry.healthScore} />
                  )}
                </div>
              </CardContent>

              {/* Inline delete confirmation overlay */}
              {pendingDeleteId === entry.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/95 backdrop-blur-sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <p className="text-sm font-medium text-foreground">
                    Usun{'\u0105\u0107'} t{'\u0119'} analiz{'\u0119'}?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(event) => handleConfirmDelete(event, entry.id)}
                    >
                      Tak, usu{'\u0144'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelDelete}
                    >
                      Anuluj
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
