'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Czy moje wiadomości są bezpieczne?',
    answer:
      'Twoje wiadomości są analizowane statystycznie w przeglądarce. Dla analizy AI, niewielka próbka (~2% wiadomości) jest bezpiecznie przesyłana do serwera AI i natychmiast usuwana po przetworzeniu. Żadne wiadomości nie są nigdy zapisywane — przechowujemy jedynie zagregowane wyniki w pamięci lokalnej Twojego urządzenia. Możesz je usunąć w dowolnym momencie.',
  },
  {
    question: 'Jak wyeksportować rozmowę z Messengera?',
    answer:
      "Wejdź na Facebooka → Ustawienia → Twoje informacje → Pobierz swoje informacje → Zaznacz tylko 'Wiadomości' → Format JSON → Utwórz plik. Pobierz i rozpakuj archiwum — pliki JSON znajdziesz w folderze 'messages/inbox/[nazwa_rozmowy]/'.",
  },
  {
    question: 'Jakie formaty plików są obsługiwane?',
    answer:
      'Aktualnie obsługujemy eksport z Facebook Messengera w formacie JSON. Wsparcie dla WhatsApp, Instagram i Telegrama jest planowane.',
  },
  {
    question: 'Ile wiadomości potrzeba do analizy?',
    answer:
      'Minimum 100 wiadomości. Dla pełnej analizy psychologicznej i dokładnych wzorców rekomendujemy co najmniej 1000 wiadomości. Im dłuższa historia konwersacji, tym trafniejsze wyniki.',
  },
  {
    question: 'Czy analiza AI jest dokładna?',
    answer:
      'Analiza AI opiera się na modelach językowych i dostarcza przybliżone obserwacje, a nie diagnozy kliniczne. Wyniki powinny być traktowane jako punkt wyjścia do refleksji, nie jako profesjonalna ocena psychologiczna.',
  },
  {
    question: 'Czy mogę porównać wiele rozmów?',
    answer:
      'Każda rozmowa jest analizowana osobno. Funkcja porównywania rozmów jest w planach na przyszłe aktualizacje.',
  },
];

export default function LandingFAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section ref={ref} className="bg-background px-6 py-24">
      <div className="mx-auto max-w-3xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
            PYTANIA I ODPOWIEDZI
          </p>
          <h2 className="font-story-display text-2xl font-bold tracking-tight text-foreground">
            Często zadawane pytania
          </h2>
        </motion.div>

        {/* FAQ list */}
        <div className="divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.4, delay: 0.06 * (index + 1) }}
              >
                {/* Question button */}
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  id={`faq-q-${index}`}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-foreground"
                >
                  <span className="font-story-body text-sm font-medium text-foreground">
                    {item.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="shrink-0 text-muted-foreground"
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </motion.span>
                </button>

                {/* Answer with AnimatePresence */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`answer-${index}`}
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-q-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 font-story-body text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
