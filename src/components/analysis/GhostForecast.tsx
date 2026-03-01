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
  gradient: string;
}

function getForecastLevel(score: number): ForecastLevel {
  if (score < 15) return { icon: '\u2600\uFE0F', label: 'Bezpiecznie', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', gradient: 'linear-gradient(90deg, #a78bfa, #c4b5fd)' };
  if (score < 30) return { icon: '\uD83C\uDF24\uFE0F', label: 'Lekkie chmury', color: '#c084fc', bg: 'rgba(192,132,252,0.08)', gradient: 'linear-gradient(90deg, #c084fc, #d8b4fe)' };
  if (score < 45) return { icon: '\u26C5', label: 'Zachmurzenie', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', gradient: 'linear-gradient(90deg, #a855f7, #c084fc)' };
  if (score < 60) return { icon: '\uD83C\uDF27\uFE0F', label: 'Uwaga', color: '#d946ef', bg: 'rgba(217,70,239,0.08)', gradient: 'linear-gradient(90deg, #d946ef, #e879f9)' };
  if (score < 80) return { icon: '\u26C8\uFE0F', label: 'Zagro\u017Cenie', color: '#e879f9', bg: 'rgba(232,121,249,0.08)', gradient: 'linear-gradient(90deg, #e879f9, #f0abfc)' };
  return { icon: '\uD83C\uDF2A\uFE0F', label: 'Ewakuacja!', color: '#f0abfc', bg: 'rgba(240,171,252,0.1)', gradient: 'linear-gradient(90deg, #f0abfc, #f5d0fe)' };
}

const sv = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

export default function GhostForecast({ viralScores, participants }: GhostForecastProps) {
  const ghostRisk = viralScores.ghostRisk;
  if (!ghostRisk) return null;

  const entries = participants
    .map((name) => ({ name, data: ghostRisk[name] }))
    .filter((e): e is { name: string; data: NonNullable<typeof e.data> } => e.data != null);

  if (entries.length === 0) return null;

  return (
    <motion.div
      variants={sv}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
    >
      <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white mb-4">
        Prognoza Ghostingu
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
              className="overflow-hidden rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {name}
                </span>
                <span className="text-2xl">{forecast.icon}</span>
              </div>

              {/* Score bar — Plasma tube */}
              <div
                className="relative mb-2 h-[5px] overflow-hidden rounded-full"
                role="meter"
                aria-label={`Ryzyko ghostingu: ${name}`}
                aria-valuenow={data.score}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: forecast.gradient,
                    boxShadow: `0 0 12px ${forecast.color}30`,
                  }}
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
                <span className="font-mono text-xs text-muted-foreground">
                  {data.score}%
                </span>
              </div>

              {/* Factors — colored dots instead of bullet character */}
              {data.factors && data.factors.length > 0 && (
                <div className="space-y-1.5">
                  {data.factors.map((factor: string, fi: number) => (
                    <div
                      key={fi}
                      className="flex items-start gap-2 font-mono text-[11px] text-muted-foreground"
                    >
                      <span
                        className="mt-[5px] size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: forecast.color }}
                      />
                      <span>{factor}</span>
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
