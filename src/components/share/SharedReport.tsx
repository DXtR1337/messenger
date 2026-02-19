"use client";
import { useMemo } from "react";
import type { SharePayload } from "@/lib/share/types";
import SocialShareButtons from "./SocialShareButtons";
interface SharedReportProps { payload: SharePayload; shareUrl: string; }
function formatDate(ts: number): string { return new Date(ts).toLocaleDateString("pl-PL",{year:"numeric",month:"short",day:"numeric"}); }
function formatNumber(n: number): string { return n.toLocaleString("pl-PL"); }
function healthColor(s: number): string { if(s>70)return"#10b981";if(s>40)return"#f59e0b";return"#ef4444"; }
function healthLabel(s: number): string { if(s>70)return"Zdrowa relacja";if(s>40)return"Wymaga uwagi";return"Sygnal alarmowy"; }
function significanceColor(s:"positive"|"neutral"|"concerning"):string{switch(s){case"positive":return"#10b981";case"neutral":return"#f59e0b";case"concerning":return"#ef4444";}}
function significanceIcon(s:"positive"|"neutral"|"concerning"):string{switch(s){case"positive":return"v";case"neutral":return"o";case"concerning":return"\!";}}

export default function SharedReport({ payload, shareUrl }: SharedReportProps) {
  const durationDays = useMemo(() => {
    const diff = payload.dateRange.end - payload.dateRange.start;
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [payload.dateRange]);
  const shareText = payload.healthScore !== null ? "Health Score: " + String(payload.healthScore) + "/100" : "Sprawdz analize rozmowy na PodTeksT!";
  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <a href="/" className="font-display text-lg font-extrabold tracking-tight"><span className="text-[#3b82f6]">Pod</span><span className="text-[#a855f7]">TeksT</span></a>
          <span className="rounded-full border border-[#1a1a1a] bg-[#111111] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-widest text-[#555555]">udostepniony raport</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {payload.healthScore !== null && (
          <section className="mb-8 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 text-center">
            <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-[#555555]">Health Score</p>
            <div className="mx-auto mb-3 flex size-28 items-center justify-center rounded-full border-4" style={{ borderColor: healthColor(payload.healthScore) }}>
              <span className="font-display text-4xl font-extrabold" style={{ color: healthColor(payload.healthScore) }}>{payload.healthScore}</span>
            </div>
            <p className="mb-1 text-sm font-semibold" style={{ color: healthColor(payload.healthScore) }}>{healthLabel(payload.healthScore)}</p>
            <p className="text-xs text-[#888888]">na 100 punktow</p>
          </section>
        )}
        {payload.executiveSummary && (
          <section className="mb-6 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#888888]"><span className="inline-block size-1.5 rounded-full bg-[#3b82f6]" /> Podsumowanie</h2>
            <p className="text-sm leading-relaxed text-[#cccccc]">{payload.executiveSummary}</p>
          </section>
        )}
        <section className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-center"><p className="font-mono text-xl font-bold text-foreground">{formatNumber(payload.messageCount)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#555555]">wiadomosci</p></div>
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-center"><p className="font-mono text-xl font-bold text-foreground">{formatNumber(durationDays)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#555555]">dni</p></div>
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-center"><p className="font-mono text-xl font-bold text-foreground">{payload.participantCount}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#555555]">osoby</p></div>
        </section>
        <div className="mb-6 flex items-center justify-center gap-3 text-xs text-[#555555]">
          <span className="font-mono">{formatDate(payload.dateRange.start)}</span>
          <span className="inline-block h-px w-8 bg-[#1a1a1a]" />
          <span className="font-mono">{formatDate(payload.dateRange.end)}</span>
        </div>
        {payload.viralScores && (
          <section className="mb-6 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-5">
            <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#888888]"><span className="inline-block size-1.5 rounded-full bg-[#a855f7]" /> Wyniki</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-3"><p className="mb-1 text-[10px] uppercase tracking-wider text-[#555555]">Kompatybilnosc</p><p className="font-mono text-2xl font-bold text-[#3b82f6]">{payload.viralScores.compatibilityScore}%</p></div>
              <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-3"><p className="mb-1 text-[10px] uppercase tracking-wider text-[#555555]">Deluzja</p><p className="font-mono text-2xl font-bold text-[#a855f7]">{payload.viralScores.delusionScore}%</p></div>
            </div>
          </section>
        )}
        {payload.badges.length > 0 && (
          <section className="mb-6 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-5">
            <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#888888]"><span className="inline-block size-1.5 rounded-full bg-[#10b981]" /> Osiagniecia</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{payload.badges.map((badge) => (<div key={badge.id} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-3 text-center"><span className="mb-1 block text-2xl">{badge.emoji}</span><p className="text-xs font-semibold text-foreground">{badge.name}</p><p className="mt-0.5 text-[10px] text-[#555555]">{badge.holder}</p></div>))}</div>
          </section>
        )}
        {payload.roastVerdict && (
          <section className="mb-6 rounded-2xl border border-[#1a1a1a] bg-gradient-to-br from-[#1a0a0a] to-[#0a0a0a] p-5">
            <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#888888]">Werdykt roastu</h2>
            <p className="text-sm font-medium italic leading-relaxed text-[#ef4444]">{payload.roastVerdict}</p>
          </section>
        )}
        <section className="mb-8"><SocialShareButtons url={shareUrl} text={shareText} /></section>
        <section className="mb-8 rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#0a0a1a] to-[#0a0a0a] p-8 text-center">
          <h2 className="mb-2 font-display text-lg font-bold text-foreground">Sprawdz swoja rozmowe</h2>
          <p className="mb-5 text-sm text-[#888888]">Wrzuc eksport z Messengera i odkryj co kryje sie miedzy wierszami.</p>
          <a href="/" className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2563eb]">Analizuj swoja rozmowe<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
        </section>
        <div className="mb-12 text-center"><p className="text-xs text-[#555555]">Ponad <span className="font-semibold text-[#888888]">1,000</span> rozmow przeanalizowanych</p></div>
        <footer className="border-t border-[#1a1a1a] py-6 text-center">
          <a href="/" className="font-display text-sm font-extrabold tracking-tight"><span className="text-[#3b82f6]">Pod</span><span className="text-[#a855f7]">TeksT</span></a>
          <p className="mt-1 text-[10px] text-[#555555]">Zobacz swoje relacje przez dane</p>
        </footer>
      </main>
    </div>
  );
}
