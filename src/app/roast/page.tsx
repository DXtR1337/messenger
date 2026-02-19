'use client';

import { useEffect, useState } from 'react';
import { decompressFromEncodedURIComponent } from 'lz-string';
import Link from 'next/link';

interface RoastData {
  verdict: string;
  roasts: Record<string, string[]>;
  superlatives: Array<{ category: string; winner: string; evidence: string }>;
  relationship_roast: string;
}

function decodeRoastData(): RoastData | null {
  if (typeof window === 'undefined') return null;
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    const json = decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function RoastPage() {
  const [roast, setRoast] = useState<RoastData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const data = decodeRoastData();
    if (data) {
      setRoast(data);
    } else {
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-6 text-white">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔥</div>
          <h1 className="mb-2 font-syne text-xl font-bold">Link wygasł lub jest nieprawidłowy</h1>
          <p className="mb-6 text-sm text-gray-400">
            Ten roast link nie zawiera prawidłowych danych.
          </p>
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-blue-700"
          >
            Stwórz własny roast →
          </Link>
        </div>
      </div>
    );
  }

  if (!roast) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  // Anonymize: replace names with Person A, Person B, etc.
  const personNames = Object.keys(roast.roasts);
  const anonMap: Record<string, string> = {};
  personNames.forEach((name, i) => {
    anonMap[name] = `Person ${String.fromCharCode(65 + i)}`;
  });

  function anonymize(text: string): string {
    let result = text;
    for (const [real, anon] of Object.entries(anonMap)) {
      result = result.replaceAll(real, anon);
    }
    return result;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="font-syne text-sm font-bold text-white/60 transition-colors hover:text-white">
            PodTeksT
          </Link>
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
            Anonymous Roast
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Fire header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🔥</div>
          <h1 className="font-syne text-2xl font-black tracking-tight">ROAST REPORT</h1>
          <p className="mt-2 text-xs text-gray-500">Anonimowa analiza roastowa • podtekst.app</p>
        </div>

        {/* Verdict */}
        <div className="mb-8 rounded-xl border border-red-500/10 bg-red-500/5 p-6">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-red-400/60">
            WERDYKT
          </div>
          <p className="font-space-grotesk text-sm leading-relaxed text-gray-200">
            {anonymize(roast.verdict)}
          </p>
        </div>

        {/* Per-person roasts */}
        <div className="mb-8 space-y-6">
          {personNames.map((name, i) => (
            <div key={name} className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex size-8 items-center justify-center rounded-full font-syne text-sm font-bold text-white"
                  style={{
                    background: i === 0 ? '#3b82f6' : '#a855f7',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="font-syne text-sm font-bold">
                  {anonMap[name]}
                </span>
              </div>
              <ul className="space-y-2">
                {roast.roasts[name]?.map((line, li) => (
                  <li key={li} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-0.5 text-red-400">•</span>
                    <span className="leading-relaxed">{anonymize(line)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Superlatives */}
        {roast.superlatives && roast.superlatives.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-gray-500">
              Superlatywy
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {roast.superlatives.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="mb-1 text-xs font-bold text-yellow-400">
                    🏅 {anonymize(s.category)}
                  </div>
                  <div className="text-sm text-gray-200">{anonymize(s.winner)}</div>
                  <div className="mt-1 font-mono text-[10px] text-gray-500">
                    {anonymize(s.evidence)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationship roast */}
        {roast.relationship_roast && (
          <div className="mb-10 rounded-xl border border-orange-500/10 bg-orange-500/5 p-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-orange-400/60">
              RELACJA
            </div>
            <p className="text-sm leading-relaxed text-gray-200">
              {anonymize(roast.relationship_roast)}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <div className="mb-4 text-sm text-gray-500">
            Chcesz roast swojej rozmowy?
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-6 py-3 text-sm font-bold transition-opacity hover:opacity-90"
          >
            🔥 Analizuj swoją rozmowę
          </Link>
          <div className="mt-3 font-mono text-[10px] text-gray-600">
            podtekst.app — Zobacz swoje relacje przez dane
          </div>
        </div>
      </div>
    </div>
  );
}
