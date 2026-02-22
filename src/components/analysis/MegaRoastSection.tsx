'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { Flame, Award, MessageCircle, Skull, Share2, Check } from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import type { MegaRoastResult } from '@/lib/analysis/types';

interface MegaRoastSectionProps {
  result: MegaRoastResult;
}

export default function MegaRoastSection({ result }: MegaRoastSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [linkCopied, setLinkCopied] = useState(false);

  const shareRoast = useCallback(() => {
    const data = {
      targetName: result.targetName,
      opening: result.opening,
      roast_lines: result.roast_lines,
      verdict: result.verdict,
      superlatives: result.superlatives,
      tldr: result.tldr,
    };
    const compressed = compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}/roast#${compressed}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [result]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="overflow-hidden rounded-xl border bg-card"
        style={{
          borderColor: 'transparent',
          backgroundImage:
            'linear-gradient(var(--bg-card, #111111), var(--bg-card, #111111)), linear-gradient(135deg, #f97316, #ef4444, #f97316)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          borderWidth: '2px',
          borderStyle: 'solid',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/15">
            <Flame className="size-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Mega Roast — {result.targetName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Ultra brutalny roast na podstawie całej konwersacji
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Opening */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 px-6 py-5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5" />
            <p className="relative text-center text-lg font-bold italic text-foreground">
              &ldquo;{result.opening}&rdquo;
            </p>
          </motion.div>

          {/* Roast Lines */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="space-y-3"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Flame className="size-4 text-red-500" />
              Roast
            </h3>
            <ul className="space-y-2">
              {result.roast_lines.map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-400">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* What Others Say */}
          {result.what_others_say.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="size-4 text-purple-500" />
                Co mówią inni
              </h3>
              <div className="space-y-2">
                {result.what_others_say.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                    className="rounded-lg border-l-2 border-purple-500 bg-secondary/50 py-2 pl-4 pr-3 text-sm text-muted-foreground"
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Self Owns */}
          {result.self_owns.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Skull className="size-4 text-red-400" />
                Samobójcze gole
              </h3>
              <ul className="space-y-2">
                {result.self_owns.map((line, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="shrink-0">💀</span>
                    <span>{line}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Superlatives */}
          {result.superlatives.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award className="size-4 text-orange-500" />
                Nagrody specjalne
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.superlatives.map((sup, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                    className="rounded-lg border border-border bg-secondary/50 p-4"
                  >
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                      {sup.title}
                    </div>
                    <p className="text-xs text-muted-foreground">{sup.roast}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className="space-y-3 border-t border-border pt-4"
          >
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5" />
              <p className="relative text-center text-lg font-bold italic text-foreground">
                &ldquo;{result.verdict}&rdquo;
              </p>
            </div>
            {result.tldr && (
              <p className="text-center text-xs text-muted-foreground/70">
                TLDR: {result.tldr}
              </p>
            )}
          </motion.div>

          {/* Disclaimer */}
          <p className="text-center text-[11px] italic text-muted-foreground/50">
            Tryb rozrywkowy — nie stanowi analizy psychologicznej ani profesjonalnej oceny
          </p>

          {/* Share button */}
          <div className="flex justify-center border-t border-border pt-4">
            <button
              onClick={shareRoast}
              className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/20"
            >
              {linkCopied ? (
                <>
                  <Check className="size-4" />
                  Link skopiowany!
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Udostępnij mega roast
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
