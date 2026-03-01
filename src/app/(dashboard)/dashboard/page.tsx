'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, Brain, GitCompareArrows, MessageSquareText, BarChart3, ArrowRight, Layers, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [groupByConversation, setGroupByConversation] = useState(false);

  useEffect(() => {
    listAnalyses().then(entries => {
      setAnalyses(entries);
      setLoaded(true);
    }).catch(() => {
      setError('Nie udało się wczytać analiz. Spróbuj odświeżyć stronę.');
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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Twoje analizy</h1>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-8 text-center">
            <AlertCircle className="mx-auto mb-3 size-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Re-engagement banner: show if user has analyses but none in last 7 days
  const hasOldAnalyses = analyses.length > 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hasRecentAnalysis = analyses.some(a => a.createdAt > sevenDaysAgo);
  const showReengagement = hasOldAnalyses && !hasRecentAnalysis;

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
              Wrzu{'ć'} eksport z Messengera lub WhatsApp i odkryj, co naprawd{'ę'} si{'ę'} dzieje.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
            >
              <Button asChild className="gap-2 rounded-xl px-6 py-3 text-sm font-semibold">
                <Link href="/analysis/new">
                  Rozpocznij pierwsz{'ą'} analiz{'ę'}
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
      {showReengagement && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
              <MessageSquareText className="size-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Masz nowe rozmowy do przeanalizowania?
              </p>
              <p className="text-xs text-muted-foreground">
                Ostatnia analiza ponad 7 dni temu — sprawd{'ź'}, co si{'ę'} zmieni{'ł'}o.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 gap-1.5 rounded-lg">
            <Link href="/analysis/new">
              Nowa analiza
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Twoje analizy</h1>
        <div className="flex items-center gap-2">
          {analyses.some(e => e.conversationFingerprint) && (
            <Button
              variant={groupByConversation ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setGroupByConversation(g => !g)}
            >
              <Layers className="size-4" />
              Pogrupuj
            </Button>
          )}
          {analyses.length >= 2 && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/analysis/compare">
                <GitCompareArrows className="size-4" />
                Porównaj analizy
              </Link>
            </Button>
          )}
        </div>
      </div>

      {groupByConversation ? (
        <GroupedAnalysesList
          analyses={analyses}
          pendingDeleteId={pendingDeleteId}
          onDeleteClick={handleDeleteClick}
          onConfirmDelete={handleConfirmDelete}
          onCancelDelete={handleCancelDelete}
          router={router}
        />
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analyses.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
          >
            <Link href={`/analysis/${entry.id}`} className="block">
            <Card
              className="relative overflow-hidden border-border transition-all duration-200 hover:border-border-hover hover:-translate-y-[2px] hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader>
                <CardTitle className="truncate text-sm">{entry.title}</CardTitle>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(event) => handleDeleteClick(event, entry.id)}
                    aria-label="Usu{'ń'} analiz{'ę'}"
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
                    {entry.participants?.map((name) => (
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
                    Usun{'ąć'} t{'ę'} analiz{'ę'}?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(event) => handleConfirmDelete(event, entry.id)}
                    >
                      Tak, usu{'ń'}
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
            </Link>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
}

// ============================================================
// Grouped view — analyses grouped by conversation fingerprint
// ============================================================

interface GroupedListProps {
  analyses: AnalysisIndexEntry[];
  pendingDeleteId: string | null;
  onDeleteClick: (event: React.MouseEvent, id: string) => void;
  onConfirmDelete: (event: React.MouseEvent, id: string) => void;
  onCancelDelete: (event: React.MouseEvent) => void;
  router: ReturnType<typeof useRouter>;
}

function GroupedAnalysesList({ analyses, pendingDeleteId, onDeleteClick, onConfirmDelete, onCancelDelete, router }: GroupedListProps) {
  // Group by fingerprint; ungrouped entries get their own group
  const groups = new Map<string, AnalysisIndexEntry[]>();
  const ungrouped: AnalysisIndexEntry[] = [];

  for (const entry of analyses) {
    if (entry.conversationFingerprint) {
      const existing = groups.get(entry.conversationFingerprint) || [];
      existing.push(entry);
      groups.set(entry.conversationFingerprint, existing);
    } else {
      ungrouped.push(entry);
    }
  }

  const sortedGroups = [...groups.entries()].sort(
    (a, b) => b[1][0].createdAt - a[1][0].createdAt,
  );

  return (
    <div className="space-y-6">
      {sortedGroups.map(([fingerprint, entries]) => (
        <div key={fingerprint} className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">{entries[0].title}</h3>
            <Badge variant="secondary" className="text-[10px]">{entries.length} {entries.length === 1 ? 'analiza' : entries.length < 5 ? 'analizy' : 'analiz'}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 pl-6 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
              >
                <Link href={`/analysis/${entry.id}`} className="block">
                <Card
                  className="relative overflow-hidden border-border transition-all duration-200 hover:border-border-hover hover:-translate-y-[2px]"
                >
                  <CardContent className="space-y-2 pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(entry.createdAt)}</span>
                        <span className="font-mono">{formatNumber(entry.messageCount)} wiad.</span>
                      </div>
                      <Button variant="ghost" size="icon-xs" onClick={(e) => onDeleteClick(e, entry.id)} aria-label="Usuń">
                        <X className="size-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {entry.hasQualitative && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Brain className="size-3" />
                            AI
                          </Badge>
                        )}
                      </div>
                      {entry.healthScore != null && (
                        <MiniHealthRing score={entry.healthScore} />
                      )}
                    </div>
                  </CardContent>

                  {pendingDeleteId === entry.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/95 backdrop-blur-sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <p className="text-xs font-medium">Usun{'ąć'}?</p>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={(e) => onConfirmDelete(e, entry.id)}>Tak</Button>
                        <Button variant="outline" size="sm" onClick={onCancelDelete}>Nie</Button>
                      </div>
                    </motion.div>
                  )}
                </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-text-muted">Inne</h3>
          <div className="grid grid-cols-1 gap-3 pl-6 md:grid-cols-2 lg:grid-cols-3">
            {ungrouped.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
              >
                <Link href={`/analysis/${entry.id}`} className="block">
                <Card
                  className="relative overflow-hidden border-border transition-all duration-200 hover:border-border-hover"
                >
                  <CardContent className="space-y-2 pt-3 pb-3">
                    <div className="text-xs font-medium truncate">{entry.title}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(entry.createdAt)}</span>
                      <span className="font-mono">{formatNumber(entry.messageCount)} wiad.</span>
                    </div>
                  </CardContent>
                </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
