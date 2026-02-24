'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  BarChart3,
  MessageSquare,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listAnalyses } from '@/lib/utils';
import { useTier } from '@/lib/tiers/tier-context';
import { createClient } from '@/lib/supabase/client';
import PTLogo from '@/components/shared/PTLogo';
import type { AnalysisIndexEntry } from '@/lib/analysis/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// -------------------------------------------------------------------
// Stats helpers
// -------------------------------------------------------------------

interface ProfileStats {
  totalAnalyses: number;
  totalMessages: number;
  platforms: Record<string, number>;
  firstAnalysis: number | null;
}

function computeStats(analyses: AnalysisIndexEntry[]): ProfileStats {
  const platforms: Record<string, number> = {};
  let totalMessages = 0;
  let firstAnalysis: number | null = null;

  for (const a of analyses) {
    totalMessages += a.messageCount;
    const platform = a.platform || 'unknown';
    platforms[platform] = (platforms[platform] || 0) + 1;
    if (firstAnalysis === null || a.createdAt < firstAnalysis) {
      firstAnalysis = a.createdAt;
    }
  }

  return {
    totalAnalyses: analyses.length,
    totalMessages,
    platforms,
    firstAnalysis,
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  messenger: 'Messenger',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  discord: 'Discord',
  unknown: 'Inne',
};

// -------------------------------------------------------------------
// Profile page
// -------------------------------------------------------------------

interface DbProfile {
  tier: string;
  is_admin: boolean;
}

export default function ProfilePage() {
  const { tier } = useTier();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [dbProfile, setDbProfile] = useState<DbProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (supabase) {
      // Use getSession (reads local storage, no network request) + onAuthStateChange
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null;
        setUser(u);
        if (u) fetchProfile(supabase, u.id);
      }).catch(() => { });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) fetchProfile(supabase, u.id);
      });

      // Load local stats
      listAnalyses().then((analyses) => {
        setStats(computeStats(analyses));
        setLoaded(true);
      });

      return () => subscription.unsubscribe();
    } else {
      // Supabase not configured — load local stats only
      listAnalyses().then((analyses) => {
        setStats(computeStats(analyses));
        setLoaded(true);
      });
    }
  }, []);

  async function fetchProfile(supabase: NonNullable<ReturnType<typeof createClient>>, userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('tier, is_admin')
      .eq('id', userId)
      .single();
    if (error) console.warn('[profile] fetch error:', error.message, error.code);
    if (data) setDbProfile(data as DbProfile);
    else console.warn('[profile] no data for user', userId);
  }

  if (!loaded) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Profil</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Użytkownik';
  const email = user?.email;
  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const initials = displayName.slice(0, 2).toUpperCase();

  const effectiveTier = dbProfile?.tier || tier;
  const isAdmin = dbProfile?.is_admin ?? false;
  const tierLabel = effectiveTier === 'free' ? 'Darmowy' : effectiveTier === 'pro' ? 'Pro' : 'Unlimited';
  const tierColor = effectiveTier === 'free'
    ? 'bg-muted-foreground/20 text-muted-foreground'
    : effectiveTier === 'pro'
      ? 'bg-blue-500/20 text-blue-400'
      : 'bg-purple-500/20 text-purple-400';

  return (
    <div className="space-y-6 pb-12">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-2xl font-bold"
      >
        Profil
      </motion.h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <Card className="border-border/60 bg-card overflow-hidden">
            {/* Gradient banner */}
            <div className="h-20 bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-blue-500/10" />

            <CardContent className="-mt-10">
              {/* Avatar */}
              <div className="mb-4 flex items-end gap-4">
                <div
                  className="flex size-16 items-center justify-center rounded-2xl border-4 border-card text-lg font-bold text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #a855f7)' }}
                >
                  {initials}
                </div>
                <Badge className={tierColor}>{tierLabel}</Badge>
                {isAdmin && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Admin</Badge>
                )}
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{displayName}</h2>
                  {email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5" />
                      {email}
                    </div>
                  )}
                </div>

                {createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    Dołączono {createdAt.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}

                {!user && (
                  <div className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Zaloguj się, aby zapisać profil i uzyskać dostęp do dodatkowych funkcji.
                    </p>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href="/auth/login">
                        <User className="size-3.5" />
                        Zaloguj się
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <Card className="border-border/60 bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <CardTitle className="text-[15px]">Statystyki</CardTitle>
              </div>
              <CardDescription className="text-xs">Podsumowanie aktywności</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {stats && (
                <>
                  {/* Big numbers */}
                  <div className="grid grid-cols-2 gap-4">
                    <StatBox
                      icon={<BarChart3 className="size-4 text-blue-400" />}
                      value={stats.totalAnalyses}
                      label="Analiz"
                    />
                    <StatBox
                      icon={<MessageSquare className="size-4 text-purple-400" />}
                      value={stats.totalMessages}
                      label="Wiadomości"
                      formatLarge
                    />
                  </div>

                  {/* Platforms */}
                  {Object.keys(stats.platforms).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Platformy</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stats.platforms)
                          .sort((a, b) => b[1] - a[1])
                          .map(([platform, count]) => (
                            <Badge key={platform} variant="secondary" className="gap-1 text-xs">
                              {PLATFORM_LABELS[platform] || platform}
                              <span className="font-mono text-muted-foreground">{count}</span>
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* First analysis */}
                  {stats.firstAnalysis && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      Pierwsza analiza:{' '}
                      {new Date(stats.firstAnalysis).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Privacy note */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <Card className="border-border/60 bg-card">
          <CardContent className="flex items-start gap-3 pt-5">
            <Shield className="size-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">Twoje dane są bezpieczne</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Wszystkie analizy są przechowywane lokalnie w Twojej przeglądarce (IndexedDB).
                Żadne rozmowy nie są zapisywane na naszych serwerach. Tylko próbka 200-500 wiadomości
                jest wysyłana do AI Gemini API podczas analizy.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// -------------------------------------------------------------------
// Stat box component
// -------------------------------------------------------------------

function StatBox({
  icon,
  value,
  label,
  formatLarge,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  formatLarge?: boolean;
}) {
  const formatted = formatLarge
    ? value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1)}K`
        : String(value)
    : String(value);

  return (
    <div className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{formatted}</p>
    </div>
  );
}
