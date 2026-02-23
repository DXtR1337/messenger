'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, Shield } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const PRICING_FAQ: FAQItem[] = [
  {
    question: 'Czy mogę anulować w każdej chwili?',
    answer:
      'Tak, bez żadnych opłat. Możesz anulować subskrypcję w dowolnym momencie z poziomu ustawień konta. Dostęp do planu utrzymuje się do końca okresu rozliczeniowego.',
  },
  {
    question: 'Czy moje rozmowy są bezpieczne?',
    answer:
      'Absolutnie. Analiza statystyczna dzieje się w Twojej przeglądarce — surowe wiadomości nigdy nie opuszczają Twojego urządzenia. Dla analizy AI przesyłamy jedynie ~2% próbkę wiadomości, która jest natychmiast usuwana po przetworzeniu. Nie przechowujemy żadnych treści rozmów.',
  },
  {
    question: 'Co się stanie z moimi analizami jeśli zrezygnuję?',
    answer:
      'Zostają w Twojej przeglądarce. Wszystkie wyniki analiz zapisane są lokalnie w IndexedDB — nie usuwamy ich po zakończeniu subskrypcji. Tracisz jedynie możliwość tworzenia nowych analiz AI powyżej limitu darmowego planu.',
  },
  {
    question: 'Czy mogę zmienić plan?',
    answer:
      'Tak, w dowolnym momencie. Przy upgrade natychmiast zyskujesz dostęp do nowych funkcji. Przy downgrade zmiana następuje na koniec bieżącego okresu rozliczeniowego. Różnica w cenie jest proporcjonalnie przeliczana.',
  },
];

export default function PricingFAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section ref={ref} className="mx-auto max-w-3xl px-6 pb-20">
      {/* FAQ header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          PYTANIA I ODPOWIEDZI
        </p>
        <h2 className="font-story-display text-xl font-bold tracking-tight text-foreground">
          Najczęściej zadawane pytania
        </h2>
      </motion.div>

      {/* FAQ list */}
      <div className="divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
        {PRICING_FAQ.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.4, delay: 0.06 * (index + 1) }}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-foreground"
              >
                <span className="text-sm font-medium text-foreground">
                  {item.question}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="shrink-0 text-muted-foreground"
                >
                  <ChevronDown className="size-4" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={`answer-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Money-back guarantee */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-[#1a1a1a] bg-[#111111] px-8 py-8 text-center"
      >
        <div
          className="flex size-12 items-center justify-center rounded-full"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))' }}
        >
          <Shield className="size-6 text-[#10b981]" />
        </div>
        <h3 className="font-story-display text-lg font-bold text-foreground">
          7-dniowa gwarancja zwrotu
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Bez pytań. Jeśli PodTeksT nie spełni Twoich oczekiwań w ciągu 7 dni od zakupu,
          zwrócimy Ci pełną kwotę. Zero ryzyka.
        </p>
      </motion.div>
    </section>
  );
}
