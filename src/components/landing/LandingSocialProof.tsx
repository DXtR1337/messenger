'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import CardShowcase from './CardShowcase';

export default function LandingSocialProof() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [paused, setPaused] = useState(false);

  return (
    <>
      {/* Marquee keyframes */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 50s linear infinite;
        }
        @media (max-width: 640px) {
          .marquee-track {
            animation-duration: 35s;
          }
        }
        .marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      <section
        id="social-proof"
        ref={sectionRef}
        className="relative border-y border-border py-16"
        style={{
          overflowX: 'clip',
          background:
            'linear-gradient(135deg, rgba(59,130,246,0.02) 0%, rgba(168,85,247,0.02) 100%), var(--bg-card, #111111)',
        } as Record<string, string>}
      >
        <div className="mx-auto max-w-5xl px-6">
          {/* Manifesto */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mb-14 max-w-3xl"
          >
            <h2 className="font-story-display text-xl font-bold leading-normal text-foreground md:text-2xl">
              Bez marketingowego pierdolenia.
            </h2>

            <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground/80 md:text-base">
              <p>
                PodTeksT analizuje twoje czaty na serio.{' '}
                <span className="text-foreground">80+ metryk</span> obliczanych
                w przeglądarce — od czasu odpowiedzi po{' '}
                <span className="text-foreground">Language Style Matching</span>,
                od{' '}
                <span className="text-foreground">Gottman Four Horsemen</span>{' '}
                po Pursuit-Withdrawal, od Integrative Complexity po Emotional
                Granularity. Każda metryka ma opis skąd się bierze i jakie ma
                ograniczenia. Otwarcie piszemy co jest twarde a co
                eksperymentalne, zamiast udawać że wszystko jest nieomylne.
              </p>

              <p>
                Ale nasza strona to nie tylko nudne liczby.{' '}
                <span className="text-foreground">14 trybów AI</span>: roast
                psychologiczny, symulator kłótni, stand-up z waszego czatu{' '}
                <span className="text-muted-foreground/50 text-xs">
                  (7 aktów, PDF)
                </span>
                , profil randkowy, sąd nad czatem z wyrokiem, translator
                podtekstów, quiz na deluzję, CPS z 63 pytaniami, fundacje
                moralne Haidta i przyczyny emocji.{' '}
                <span className="text-foreground">23 formaty kart</span> do
                pobrania — od paragonu po nekrolog związku.{' '}
                <span className="text-foreground">15 odznak</span>, Wrapped w 10
                scenach. Bez cenzury, na własną odpowiedzialność.
              </p>

              <p>
                Twoje dane zostają u ciebie. Parsowanie i obliczenia dzieją się
                w przeglądarce — surowe wiadomości{' '}
                <span className="text-foreground">
                  nie opuszczają urządzenia
                </span>
                . Do AI trafia ~2% konwersacji.{' '}
                <span className="text-foreground">5 platform</span>: Messenger,
                WhatsApp, Instagram, Telegram, Discord.
              </p>
            </div>
          </motion.div>

          {/* Card showcase — infinite marquee with hover previews */}
          <div style={{ overflowX: 'clip' }}>
            <CardShowcase inView={inView} paused={paused} onPause={setPaused} />
          </div>
        </div>
      </section>
    </>
  );
}
