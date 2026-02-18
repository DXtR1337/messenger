'use client';

import { motion } from 'framer-motion';
import type { ViralScores } from '@/lib/parsers/types';

interface GhostForecastProps {
  viralScores: ViralScores;
  participants: string[];
}

interface ForecastLevel {
  icon: string;
  label: string;
  color: string;
  bg: string;
}

function getForecastLevel(score: number): ForecastLevel {
  if (score < 15) return { icon: '☀️', label: 'Bezpiecznie', color: '#10b981', bg: 'rgba(16,185,129,0.08)' };
  if (score < 30) return { icon: '🌤️', label: 'Lekkie chmury', color: '#84cc16', bg: 'rgba(132,204,22,0.08)' };
  if (score < 45) return { icon: '⛅', label: 'Zachmurzenie', color: '#eab308', bg: 'rgba(234,179,8,0.08)' };
  if (score < 60) return { icon: '🌧️', label: 'Uwaga', color: '#f97316', bg: 'rgba(249,115,22,0.08)' };
  if (score < 80) return { icon: '⛈️', label: 'Zagrożenie', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' };
  return { icon: '🌪️', label: 'Ewakuacja!', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
}

const sv = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function GhostForecast({ viralScores, participants }: GhostForecastProps) {
  const ghostRisk = viralScores.ghostRisk;
  if (!ghostRisk) return null;

  const entries = participants
    .map((name) => ({ name, data: ghostRisk[name] }))
    .filter((e) => e.data);

  if (entries.length === 0) return null;

  return (
    <motion.div
      variants={sv}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
    >
      <h3 className="mb-4 text-lg font-bold text-foreground">
        👻 Prognoza Ghostingu
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(({ name, data }, i) => {
          const forecast = getForecastLevel(data.score);
          return (
            <motion.div
              key={name}
              variants={sv}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="overflow-hidden rounded-xl border border-border bg-card p-4"
              style={{ borderColor: `${forecast.color}20` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {name}
                </span>
                <span className="text-2xl">{forecast.icon}</span>
              </div>

              {/* Score bar */}
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-card-hover">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: forecast.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${data.score}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              </div>

              <div className="mb-3 flex items-center justify-between">
                <span
                  className="text-xs font-bold"
                  style={{ color: forecast.color }}
                >
                  {forecast.label}
                </span>
                <span className="font-mono text-xs text-text-secondary">
                  {data.score}%
                </span>
              </div>

              {/* Factors */}
              {data.factors && data.factors.length > 0 && (
                <div className="space-y-1">
                  {data.factors.map((factor: string, fi: number) => (
                    <div
                      key={fi}
                      className="font-mono text-[10px] text-text-muted"
                    >
                      • {factor}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
