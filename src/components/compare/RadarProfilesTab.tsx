'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ComparisonRecord } from '@/lib/compare';
import { COMPARISON_COLORS, normalize } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

interface RadarAxis {
  key: string;
  label: string;
  extractSelf: (r: ComparisonRecord) => number;
  extractPartner: (r: ComparisonRecord) => number;
  max: number;
}

const AXES: RadarAxis[] = [
  { key: 'messages', label: 'Wiadomości', extractSelf: (r) => r.self.totalMessages, extractPartner: (r) => r.partner.totalMessages, max: 0 },
  { key: 'speed', label: 'Szybkość', extractSelf: (r) => r.self.medianResponseTimeMs > 0 ? 1 / r.self.medianResponseTimeMs : 0, extractPartner: (r) => r.partner.medianResponseTimeMs > 0 ? 1 / r.partner.medianResponseTimeMs : 0, max: 0 },
  { key: 'initiation', label: 'Inicjowanie', extractSelf: (r) => r.self.conversationInitiations, extractPartner: (r) => r.partner.conversationInitiations, max: 0 },
  { key: 'emoji', label: 'Emoji', extractSelf: (r) => r.self.emojiRatePer1k, extractPartner: (r) => r.partner.emojiRatePer1k, max: 0 },
  { key: 'questions', label: 'Pytania', extractSelf: (r) => r.self.questionsAskedPer1k, extractPartner: (r) => r.partner.questionsAskedPer1k, max: 0 },
  { key: 'vocabulary', label: 'Słownictwo', extractSelf: (r) => r.self.vocabularyRichness, extractPartner: (r) => r.partner.vocabularyRichness, max: 0 },
  { key: 'lsm', label: 'LSM', extractSelf: (r) => (r.relationship.lsm?.overall ?? 0) * 100, extractPartner: (r) => (r.relationship.lsm?.overall ?? 0) * 100, max: 100 },
  { key: 'bid', label: 'Bid-Response', extractSelf: (r) => (r.self.bidResponseRate ?? 0) * 100, extractPartner: (r) => (r.partner.bidResponseRate ?? 0) * 100, max: 100 },
];

export default function RadarProfilesTab({ records, selfName }: Props) {
  const [overlay, setOverlay] = useState(false);
  const [view, setView] = useState<'self' | 'partner'>('self');

  // Compute per-axis max for normalization
  const axisMaxes = useMemo(() => {
    return AXES.map((axis) => {
      if (axis.max > 0) return axis.max;
      let m = 0;
      for (const r of records) {
        m = Math.max(m, axis.extractSelf(r), axis.extractPartner(r));
      }
      return m || 1;
    });
  }, [records]);

  // Build radar data
  const radarData = useMemo(() => {
    return AXES.map((axis, ai) => {
      const entry: Record<string, string | number> = { axis: axis.label };
      for (let ri = 0; ri < records.length; ri++) {
        const raw = view === 'self' ? axis.extractSelf(records[ri]) : axis.extractPartner(records[ri]);
        entry[records[ri].partnerName] = normalize(raw, 0, axisMaxes[ai]);
      }
      return entry;
    });
  }, [records, axisMaxes, view]);

  if (records.length === 0) return null;

  const displayRecords = overlay ? records.slice(0, 6) : records;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border">
          <button
            onClick={() => setView('self')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${view === 'self' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            {selfName}
          </button>
          <button
            onClick={() => setView('partner')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${view === 'partner' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground'}`}
          >
            Partner
          </button>
        </div>
        {records.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={overlay}
              onChange={(e) => setOverlay(e.target.checked)}
              className="rounded"
            />
            Tryb nakładki
          </label>
        )}
      </div>

      {overlay ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: '#888', fontSize: 11 }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              {displayRecords.map((r, i) => (
                <Radar
                  key={r.analysisId}
                  name={r.partnerName}
                  dataKey={r.partnerName}
                  stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
                  fill={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayRecords.map((r, i) => {
            const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length];
            const singleData = AXES.map((axis, ai) => ({
              axis: axis.label,
              value: normalize(
                view === 'self' ? axis.extractSelf(r) : axis.extractPartner(r),
                0,
                axisMaxes[ai],
              ),
            }));

            return (
              <div key={r.analysisId} className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 text-center text-sm font-semibold" style={{ color }}>
                  {r.partnerName}
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={singleData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: '#888', fontSize: 10 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar
                      dataKey="value"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
