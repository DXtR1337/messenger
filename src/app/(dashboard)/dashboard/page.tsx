'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, X, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listAnalyses, deleteAnalysis, formatDate, formatNumber } from '@/lib/utils';
import type { AnalysisIndexEntry } from '@/lib/analysis/types';

export default function DashboardPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisIndexEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listAnalyses().then(entries => {
      setAnalyses(entries);
      setLoaded(true);
    });
  }, []);

  async function handleDelete(event: React.MouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      'Delete this analysis? This action cannot be undone.'
    );
    if (!confirmed) return;

    await deleteAnalysis(id);
    const updated = await listAnalyses();
    setAnalyses(updated);
  }

  // Avoid hydration mismatch: render nothing until client-side data is loaded
  if (!loaded) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Your Analyses</h1>
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
        <h1 className="font-display text-2xl font-bold">Your Analyses</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Upload className="mb-4 size-10 text-muted-foreground" />
          <p className="mb-1 text-lg font-medium text-foreground">
            No analyses yet
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Upload a Messenger export to get started.
          </p>
          <Button asChild>
            <Link href="/analysis/new">New Analysis</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Your Analyses</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analyses.map((entry) => (
          <Card
            key={entry.id}
            className="cursor-pointer border-border transition-colors hover:border-border/60"
            onClick={() => router.push(`/analysis/${entry.id}`)}
          >
            <CardHeader>
              <CardTitle className="truncate text-sm">{entry.title}</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(event) => handleDelete(event, entry.id)}
                  aria-label="Delete analysis"
                >
                  <X className="size-3" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(entry.createdAt)}</span>
                <span className="font-mono">
                  {formatNumber(entry.messageCount)} msgs
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {entry.participants.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {entry.hasQualitative && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Brain className="size-3" />
                    AI Analysis
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
