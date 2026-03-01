'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import type { ComparisonRecord } from '@/lib/compare';
import { COMPARISON_COLORS } from '@/lib/compare';
import {
  CHART_GRID_PROPS,
  CHART_AXIS_TICK,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  formatMonthSmart,
  formatMonthWithYear,
} from '@/components/analysis/chart-config';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

type TrendType = 'volume' | 'responseTime' | 'messageLength' | 'initiation' | 'sentiment' | 'intimacy';

interface TrendConfig {
  key: TrendType;
  label: string;
  description: string;
  unit: string;
  higherIs: 'better' | 'worse' | 'neutral';
  chartType: 'area' | 'line';
  formatValue: (v: number) => string;
  domain?: [number | string, number | string];
  referenceValue?: number;
  referenceLabel?: string;
}

const TREND_CONFIG: TrendConfig[] = [
  {
    key: 'volume',
    label: 'Aktywność',
    description: 'Ile wiadomości wysyłaliście łącznie w każdym miesiącu',
    unit: 'wiadomości / miesiąc',
    higherIs: 'neutral',
    chartType: 'area',
    formatValue: (v) => `${Math.round(v)} wiad.`,
  },
  {
    key: 'responseTime',
    label: 'Twój czas odpowiedzi',
    description: 'Jak szybko Ty odpowiadałeś/aś — im niżej, tym szybciej',
    unit: 'minuty',
    higherIs: 'worse',
    chartType: 'line',
    formatValue: (v) => {
      if (v < 1) return '<1 min';
      if (v < 60) return `${Math.round(v)} min`;
      const h = Math.floor(v / 60);
      const m = Math.round(v % 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    },
  },
  {
    key: 'messageLength',
    label: 'Długość wiadomości',
    description: 'Średnia długość Twoich wiadomości — dłuższe = więcej zaangażowania',
    unit: 'znaki',
    higherIs: 'neutral',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)} zn.`,
  },
  {
    key: 'initiation',
    label: 'Kto zaczyna rozmowy',
    description: 'Jak często Ty zaczynałeś/aś rozmowę — 50% = równowaga',
    unit: '%',
    higherIs: 'neutral',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}%`,
    domain: [0, 100],
    referenceValue: 50,
    referenceLabel: 'Równowaga',
  },
  {
    key: 'sentiment',
    label: 'Nastrój rozmowy',
    description: 'Pozytywność Twoich wiadomości — wyżej = bardziej pozytywne',
    unit: 'skala -1 do 1',
    higherIs: 'better',
    chartType: 'line',
    formatValue: (v) => {
      if (v > 0.3) return `+${v.toFixed(2)} 😊`;
      if (v < -0.3) return `${v.toFixed(2)} 😔`;
      return v.toFixed(2);
    },
    domain: [-1, 1],
    referenceValue: 0,
    referenceLabel: 'Neutralny',
  },
  {
    key: 'intimacy',
    label: 'Bliskość',
    description: 'Wskaźnik intymności konwersacji — łączy długość, czas odp., emocje',
    unit: '0–100',
    higherIs: 'better',
    chartType: 'line',
    formatValue: (v) => `${Math.round(v)}/100`,
    domain: [0, 100],
  },
];

// Custom tooltip with formatted values and units
function TrendTooltip({
  active,
  payload,
  config,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown>; color?: string; name?: string; value?: number }>;
  config: TrendConfig;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload?.month;
  const title = typeof raw === 'string' ? formatMonthWithYear(raw) : '';
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, marginBottom: 8 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {payload.filter(e => e.value != null).map((entry, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, fontSize: 13 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: entry.color, flexShrink: 0 }} />
              <span style={{ color: '#ccc' }}>{entry.name}</span>
            </span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono), monospace', color: '#fff' }}>
              {config.formatValue(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>{config.unit}</p>
    </div>
  );
}

// Summary stat card per relationship
function RelationshipSummary({
  record,
  color,
  config,
  data,
}: {
  record: ComparisonRecord;
  color: string;
  config: TrendConfig;
  data: Array<Record<string, unknown>>;
}) {
  const values = data
    .map(d => d[record.partnerName])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));

  if (values.length === 0) return null;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const first3 = values.slice(0, Math.min(3, Math.ceil(values.length / 3)));
  const last3 = values.slice(-Math.min(3, Math.ceil(values.length / 3)));
  const avgFirst = first3.reduce((s, v) => s + v, 0) / first3.length;
  const avgLast = last3.reduce((s, v) => s + v, 0) / last3.length;
  const diff = avgLast - avgFirst;
  const pctChange = avgFirst !== 0 ? (diff / Math.abs(avgFirst)) * 100 : 0;

  let trendIcon: React.ReactNode;
  let trendColor: string;
  let trendLabel: string;

  if (Math.abs(pctChange) < 10) {
    trendIcon = <Minus className="size-3.5" />;
    trendColor = '#888';
    trendLabel = 'stabilny';
  } else if (diff > 0) {
    trendIcon = <TrendingUp className="size-3.5" />;
    trendColor = config.higherIs === 'worse' ? '#ef4444' : config.higherIs === 'better' ? '#10b981' : '#3b82f6';
    trendLabel = `+${Math.abs(Math.round(pctChange))}%`;
  } else {
    trendIcon = <TrendingDown className="size-3.5" />;
    trendColor = config.higherIs === 'worse' ? '#10b981' : config.higherIs === 'better' ? '#ef4444' : '#3b82f6';
    trendLabel = `${Math.round(pctChange)}%`;
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="size-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium truncate block" style={{ color: '#ccc' }}>
          {record.partnerName}
        </span>
      </div>
      <span className="text-xs font-mono font-bold" style={{ color: '#fff' }}>
        {config.formatValue(avg)}
      </span>
      <span className="flex items-center gap-1 text-[11px] font-mono font-semibold" style={{ color: trendColor }}>
        {trendIcon}
        {trendLabel}
      </span>
    </div>
  );
}

export default function TimelineCompareTab({ records, selfName }: Props) {
  const [trendKey, setTrendKey] = useState<TrendType>('volume');
  const config = TREND_CONFIG.find(t => t.key === trendKey)!;

  const chartData = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();

    for (const r of records) {
      let monthlyData: Array<{ month: string; value: number }> = [];

      switch (trendKey) {
        case 'volume':
          monthlyData = (r.relationship.monthlyVolume ?? []).map(m => ({
            month: m.month,
            value: m.total,
          }));
          break;
        case 'responseTime':
          monthlyData = (r.relationship.trends?.responseTimeTrend ?? []).map(t => ({
            month: t.month,
            value: (t.perPerson[selfName] ?? 0) / 60000, // ms → minutes
          }));
          break;
        case 'messageLength':
          monthlyData = (r.relationship.trends?.messageLengthTrend ?? []).map(t => ({
            month: t.month,
            value: t.perPerson[selfName] ?? 0,
          }));
          break;
        case 'initiation':
          monthlyData = (r.relationship.trends?.initiationTrend ?? []).map(t => ({
            month: t.month,
            value: (t.perPerson[selfName] ?? 0) * 100,
          }));
          break;
        case 'sentiment':
          monthlyData = (r.relationship.trends?.sentimentTrend ?? []).map(t => ({
            month: t.month,
            value: t.perPerson[selfName] ?? 0,
          }));
          break;
        case 'intimacy':
          monthlyData = (r.relationship.intimacyProgression?.trend ?? []).map(t => ({
            month: t.month,
            value: t.score,
          }));
          break;
      }

      for (const { month, value } of monthlyData) {
        const existing = monthMap.get(month) ?? {};
        existing[r.partnerName] = value;
        monthMap.set(month, existing);
      }
    }

    const months = [...monthMap.keys()].sort();
    return months.map(m => ({
      month: m,
      label: formatMonthSmart(m, months),
      ...monthMap.get(m),
    }));
  }, [records, trendKey, selfName]);

  if (records.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Dodaj więcej analiz, aby porównać trendy.
      </p>
    );
  }

  const ChartComponent = config.chartType === 'area' ? AreaChart : LineChart;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Jak zmieniały się Twoje relacje w czasie?
        </h3>
        <p className="text-xs text-muted-foreground">
          Porównaj trendy między różnymi relacjami. Każda linia = jedna relacja, oś X = miesiące.
        </p>
      </div>

      {/* Trend selector — pills with descriptions */}
      <div className="flex flex-wrap gap-1.5">
        {TREND_CONFIG.map(opt => (
          <button
            key={opt.key}
            onClick={() => setTrendKey(opt.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              trendKey === opt.key
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Active trend description + direction hint */}
      <div
        className="flex items-start gap-3 rounded-lg px-3 py-2.5"
        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}
      >
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground">{config.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {config.higherIs === 'better' && (
            <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: '#10b981' }}>
              <ArrowUp className="size-3" /> lepiej
            </span>
          )}
          {config.higherIs === 'worse' && (
            <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: '#ef4444' }}>
              <ArrowDown className="size-3" /> lepiej
            </span>
          )}
          {config.higherIs === 'neutral' && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {config.unit}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Brak danych trendowych dla tej metryki.
          </p>
        ) : (
          <>
            {/* Y-axis label */}
            <p className="text-[10px] font-mono text-muted-foreground mb-2 pl-1">
              {config.unit}
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <ChartComponent data={chartData}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
                <YAxis
                  tick={CHART_AXIS_TICK}
                  domain={config.domain ?? ['auto', 'auto']}
                  width={45}
                  tickFormatter={(v: number) => {
                    if (trendKey === 'sentiment') return v.toFixed(1);
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                    return Math.round(v).toString();
                  }}
                />
                <Tooltip
                  content={<TrendTooltip config={config} />}
                />
                {/* Reference lines */}
                {config.referenceValue != null && (
                  <ReferenceLine
                    y={config.referenceValue}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="6 4"
                    label={{
                      value: config.referenceLabel ?? '',
                      position: 'insideTopRight',
                      fill: '#666',
                      fontSize: 10,
                    }}
                  />
                )}
                {records.map((r, i) => {
                  const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length];
                  return config.chartType === 'area' ? (
                    <Area
                      key={r.analysisId}
                      type="monotone"
                      dataKey={r.partnerName}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.08}
                      strokeWidth={2}
                      connectNulls
                      dot={false}
                      activeDot={{ r: 5, fill: color, stroke: '#111', strokeWidth: 2 }}
                    />
                  ) : (
                    <Line
                      key={r.analysisId}
                      type="monotone"
                      dataKey={r.partnerName}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      activeDot={{ r: 5, fill: color, stroke: '#111', strokeWidth: 2 }}
                    />
                  );
                })}
              </ChartComponent>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Per-relationship summary cards */}
      {chartData.length > 0 && (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Średnia i trend za cały okres
          </p>
          <div className="grid gap-2">
            {records.map((r, i) => (
              <RelationshipSummary
                key={r.analysisId}
                record={r}
                color={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
                config={config}
                data={chartData}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
