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

  const shareMegaRoast = useCallback(() => {
    const data = {
      targetName: result.targetName,
      opening: result.opening,
      roast_lines: result.roast_lines,
      what_others_say: result.what_others_say,
      self_owns: result.self_owns,
      superlatives: result.superlatives,
      verdict: result.verdict,
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

  const sectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: 0.15 + i * 0.1 },
    }),
  };

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
              Mega Roast {'\u2014'} {result.targetName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Ultra brutalny roast na podstawie całej konwersacji
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Opening */}
          <motion.div
            custom={0}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={sectionVariants}
            className="relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 px-6 py-5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5" />
            <p className="relative text-center text-base font-bold italic leading-relaxed text-foreground">
              &ldquo;{result.opening}&rdquo;
            </p>
          </motion.div>

          {/* Roast Lines */}
          <motion.div
            custom={1}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={sectionVariants}
            className="space-y-3"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {'\ud83d\udd25'} Roast
            </h3>
            <ol className="space-y-2">
              {result.roast_lines.map((line, lineIndex) => (
                <motion.li
                  key={lineIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, delay: 0.25 + lineIndex * 0.08 }}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-500">
                    {lineIndex + 1}
                  </span>
                  <span className="leading-relaxed">{line}</span>
                </motion.li>
              ))}
            </ol>
          </motion.div>

          {/* What Others Say */}
          {result.what_others_say.length > 0 && (
            <motion.div
              custom={2}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={sectionVariants}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="size-4 text-purple-500" />
                Co mówią inni
              </h3>
              <div className="space-y-2">
                {result.what_others_say.map((quote, quoteIndex) => (
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, x: -8 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                    transition={{ duration: 0.3, delay: 0.35 + quoteIndex * 0.08 }}
                    className="rounded-lg border-l-2 border-purple-500 bg-secondary/50 py-3 pl-4 pr-3"
                  >
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {quote}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Self Owns */}
          {result.self_owns.length > 0 && (
            <motion.div
              custom={3}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={sectionVariants}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Skull className="size-4 text-red-400" />
                Samobójcze gole
              </h3>
              <ul className="space-y-2">
                {result.self_owns.map((own, ownIndex) => (
                  <motion.li
                    key={ownIndex}
                    initial={{ opacity: 0, x: -8 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                    transition={{ duration: 0.3, delay: 0.4 + ownIndex * 0.08 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-0.5 shrink-0">{'\ud83d\udc80'}</span>
                    <span className="leading-relaxed">{own}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Superlatives */}
          {result.superlatives.length > 0 && (
            <motion.div
              custom={4}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={sectionVariants}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award className="size-4 text-orange-500" />
                Nagrody specjalne
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.superlatives.map((superlative, supIndex) => (
                  <motion.div
                    key={supIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={
                      isInView
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.95 }
                    }
                    transition={{ duration: 0.3, delay: 0.45 + supIndex * 0.1 }}
                    className="rounded-lg border border-border bg-secondary/50 p-4"
                  >
                    <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
                      {superlative.title}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {superlative.roast}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          <motion.div
            custom={5}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={sectionVariants}
            className="space-y-4 border-t border-border pt-5"
          >
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5" />
              <p className="relative text-center text-lg font-bold italic text-foreground">
                &ldquo;{result.verdict}&rdquo;
              </p>
            </div>

            {/* TLDR */}
            {result.tldr && (
              <p className="text-center text-xs text-muted-foreground/70">
                {result.tldr}
              </p>
            )}
          </motion.div>

          {/* Share button */}
          <motion.div
            custom={6}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={sectionVariants}
            className="flex justify-center border-t border-border pt-4"
          >
            <button
              onClick={shareMegaRoast}
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
          </motion.div>

          {/* Disclaimer */}
          <p className="text-center text-[11px] italic text-muted-foreground/50">
            Tryb rozrywkowy {'\u2014'} nie stanowi analizy psychologicznej ani profesjonalnej oceny
          </p>
        </div>
      </div>
    </motion.div>
  );
}
