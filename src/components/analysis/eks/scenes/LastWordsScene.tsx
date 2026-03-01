'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Scene, toArr, EKGDivider } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface LastWordsSceneProps {
  lastWords: EksResult['lastWords'];
  deathDate?: string; // "YYYY-MM-DD" from EksResult
}

function formatTimeAgo(deathDate: string): string {
  const death = new Date(deathDate);
  if (isNaN(death.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - death.getTime();
  if (diffMs < 0) return '';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'dzisiaj';
  if (days === 1) return '1 dzień temu';
  if (days < 30) return `${days} dni temu`;

  const months = Math.floor(days / 30.44);
  if (months === 1) return '1 miesiąc temu';
  if (months < 12) {
    if (months >= 2 && months <= 4) return `${months} miesiące temu`;
    return `${months} miesięcy temu`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 1) {
    if (remainingMonths === 0) return '1 rok temu';
    return `1 rok i ${remainingMonths} mies. temu`;
  }
  if (remainingMonths === 0) {
    if (years >= 2 && years <= 4) return `${years} lata temu`;
    return `${years} lat temu`;
  }
  if (years >= 2 && years <= 4) return `${years} lata i ${remainingMonths} mies. temu`;
  return `${years} lat i ${remainingMonths} mies. temu`;
}

export default function LastWordsScene({ lastWords, deathDate }: LastWordsSceneProps) {
  // Parse sender from "[index] Name: content" format to align bubbles by person
  const messages = toArr(lastWords?.lastMeaningfulExchange);

  const parsed = useMemo(() => {
    const senderMap = new Map<string, 'left' | 'right'>();

    function parseSender(msg: string): { sender: string; content: string } {
      // Format: "[index] Name: content" or "[index] content"
      const match = msg.match(/^\[\d+\]\s*([^:]+?):\s*([\s\S]*)$/);
      if (match) return { sender: match[1].trim(), content: match[2].trim() };
      return { sender: '', content: msg.replace(/^\[\d+\]\s*/, '') };
    }

    // Assign sides: first unique sender → left, second → right
    for (const msg of messages) {
      const { sender } = parseSender(msg);
      if (sender && !senderMap.has(sender)) {
        senderMap.set(sender, senderMap.size === 0 ? 'left' : 'right');
      }
    }

    return messages.map((msg, i) => {
      const { sender, content } = parseSender(msg);
      const side = senderMap.get(sender) ?? (i % 2 === 0 ? 'left' : 'right');
      return { sender, content, isLeft: side === 'left' };
    });
  }, [messages]);

  const timeAgo = deathDate ? formatTimeAgo(deathDate) : '';

  return (
    <>
      <Scene id="eks-last-words">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
            style={{ color: '#6b3a3a' }}
          >
            ostatnia wymiana
          </p>
          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-2"
            style={{ color: '#dc2626' }}
          >
            OSTATNIE SŁOWA
          </h3>

          {/* Time ago badge */}
          {timeAgo && (
            <p
              className="font-mono text-[10px] uppercase tracking-widest text-center mb-10"
              style={{ color: '#4a4a4a' }}
            >
              {timeAgo}
            </p>
          )}
          {!timeAgo && <div className="mb-8" />}

          {lastWords && (
            <>
              {/* Chat bubbles — aligned by sender */}
              {parsed.length > 0 && (
                <div className="space-y-3 mb-8 max-w-lg mx-auto">
                  {parsed.map(({ sender, content, isLeft }, i) => (
                    <motion.div
                      key={i}
                      className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.15 }}
                    >
                      <div
                        className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                        style={{
                          background: isLeft ? '#1a0808' : 'rgba(153,27,27,0.15)',
                          border: `1px solid ${isLeft ? '#2a1010' : '#991b1b30'}`,
                          color: '#d4a07a',
                          borderBottomLeftRadius: isLeft ? '4px' : undefined,
                          borderBottomRightRadius: isLeft ? undefined : '4px',
                        }}
                      >
                        {/* Sender name above bubble */}
                        {sender && (
                          <p
                            className="font-mono text-[9px] uppercase tracking-widest mb-1"
                            style={{ color: '#6b3a3a' }}
                          >
                            {sender}
                          </p>
                        )}
                        {content || messages[i]}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Analysis */}
              {lastWords.analysis && (
                <div
                  className="rounded-xl p-5 md:p-6 mb-6"
                  style={{
                    background: '#1a0808',
                    border: '1px solid #2a1010',
                  }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-3"
                    style={{ color: '#4a4a4a' }}
                  >
                    Analiza
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
                    {lastWords.analysis}
                  </p>
                </div>
              )}

              {/* What was left unsaid */}
              {lastWords.whatWasLeftUnsaid && (
                <div className="text-center">
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-3"
                    style={{ color: '#4a4a4a' }}
                  >
                    Co zostało niewypowiedziane
                  </p>
                  <p
                    className="text-base md:text-lg italic leading-relaxed max-w-xl mx-auto"
                    style={{ color: '#4a4a4a', opacity: 0.6 }}
                  >
                    {lastWords.whatWasLeftUnsaid}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Scene>
      <EKGDivider />
    </>
  );
}
