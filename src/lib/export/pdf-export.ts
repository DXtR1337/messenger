/**
 * PDF export for PodTeksT conversation analysis.
 *
 * Premium 9-page dark-themed A4 report using jsPDF with Inter font.
 * Pages: Cover, Summary, Statistics, Viral Scores, Personality Profiles,
 *        Dynamics, Flags, Badges, Insights.
 *
 * Uses embedded Inter font for proper Polish character support.
 */

import jsPDF from 'jspdf';
import type { StoredAnalysis } from '@/lib/analysis/types';
import type {
  ViralScores,
  Badge,
  PersonMetrics,
} from '@/lib/parsers/types';
import type {
  Pass2Result,
  PersonProfile,
  Pass4Result,
  KeyFinding,
  BigFiveApproximation,
} from '@/lib/analysis/types';
import { registerFonts, pdfSafe } from './pdf-fonts';

// ── Color palette ────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  bg: [5, 5, 5] as RGB,
  cardBg: [15, 15, 15] as RGB,
  cardBorder: [30, 30, 30] as RGB,
  textPrimary: [250, 250, 250] as RGB,
  textSecondary: [136, 136, 136] as RGB,
  textMuted: [85, 85, 85] as RGB,
  accent: [59, 130, 246] as RGB,
  purple: [168, 85, 247] as RGB,
  personA: [59, 130, 246] as RGB,
  personB: [168, 85, 247] as RGB,
  success: [16, 185, 129] as RGB,
  warning: [245, 158, 11] as RGB,
  danger: [239, 68, 68] as RGB,
  white: [255, 255, 255] as RGB,
  gradientStart: [59, 130, 246] as RGB,
  gradientEnd: [168, 85, 247] as RGB,
};

// ── Helpers ──────────────────────────────────────────────────

const A4_W = 210;
const A4_H = 297;
const MARGIN = 16;
const CONTENT_W = A4_W - MARGIN * 2;

function setColor(doc: jsPDF, rgb: RGB): void {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function setFill(doc: jsPDF, rgb: RGB): void {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: RGB): void {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function blendColors(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function drawPageBg(doc: jsPDF): void {
  setFill(doc, C.bg);
  doc.rect(0, 0, A4_W, A4_H, 'F');
}

function drawGradientHeader(doc: jsPDF): void {
  const steps = 20;
  const h = 3;
  const stepW = A4_W / steps;
  for (let i = 0; i < steps; i++) {
    const c = blendColors(C.gradientStart, C.gradientEnd, i / steps);
    setFill(doc, c);
    doc.rect(i * stepW, 0, stepW + 1, h, 'F');
  }
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  setColor(doc, C.textMuted);
  doc.setFontSize(7);
  doc.setFont('Inter', 'normal');
  doc.text('PodTeksT \u00B7 podtekst.app', MARGIN, A4_H - 8);
  doc.text(`${pageNum} / ${totalPages}`, A4_W - MARGIN, A4_H - 8, { align: 'right' });
}

function drawSectionHeader(doc: jsPDF, num: string, title: string): void {
  drawGradientHeader(doc);
  setColor(doc, C.accent);
  doc.setFontSize(11);
  doc.setFont('Inter', 'bold');
  doc.text(num, MARGIN, 18);
  setColor(doc, C.textPrimary);
  doc.setFontSize(18);
  doc.text(title, MARGIN + 14, 18);
  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 23, A4_W - MARGIN, 23);
}

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  setFill(doc, C.cardBg);
  setDraw(doc, C.cardBorder);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
}

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  color: RGB,
): void {
  setFill(doc, C.cardBorder);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  if (pct > 0) {
    setFill(doc, color);
    const barW = Math.max(h, w * Math.min(pct, 1));
    doc.roundedRect(x, y, barW, h, h / 2, h / 2, 'F');
  }
}

function drawCircleScore(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  score: number,
  color: RGB,
  label?: string,
): void {
  setDraw(doc, C.cardBorder);
  doc.setLineWidth(2);
  doc.circle(cx, cy, r, 'S');
  setDraw(doc, color);
  doc.setLineWidth(2.5);
  doc.circle(cx, cy, r, 'S');
  doc.setLineWidth(0.5);

  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(18);
  doc.text(String(Math.round(score)), cx, cy + 2, { align: 'center' });
  setColor(doc, C.textMuted);
  doc.setFontSize(7);
  doc.setFont('Inter', 'normal');
  doc.text(label ?? '/100', cx, cy + 8, { align: 'center' });
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const safe = pdfSafe(text);
  const words = safe.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(test) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.round((ms % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / 86_400_000);
  const h = Math.round((ms % 86_400_000) / 3_600_000);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function personColor(index: number): RGB {
  return index === 0 ? C.personA : C.personB;
}

function truncate(str: string, maxLen: number): string {
  const safe = pdfSafe(str);
  if (safe.length <= maxLen) return safe;
  return safe.slice(0, maxLen - 3) + '...';
}

function scoreColor(score: number): RGB {
  if (score >= 70) return C.success;
  if (score >= 40) return C.warning;
  return C.danger;
}

function drawPTMonogram(doc: jsPDF, x: number, y: number, h: number): void {
  // PT monogram scaled from 580x370 viewBox to target height h
  const scale = h / 370;
  const w = 580 * scale;

  // Gradient approximation: blend blue→purple across width
  const steps = 8;
  const stepW = w / steps;

  // Draw P shape (simplified — solid rectangle with gradient)
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const c = blendColors(C.gradientStart, C.gradientEnd, t);
    setFill(doc, c);

    // P body: x to 240*scale, full height
    const px = x + i * stepW;
    const pxEnd = Math.min(px + stepW + 0.5, x + 240 * scale);
    if (px < x + 240 * scale) {
      // Top part (full width of P, from top to 200*scale)
      if (px < x + 85 * scale) {
        doc.rect(px, y, Math.min(stepW + 0.5, pxEnd - px), h, 'F');
      } else if (px < x + 240 * scale) {
        doc.rect(px, y, Math.min(stepW + 0.5, pxEnd - px), 200 * scale, 'F');
      }
    }

    // T shape: from 330*scale to 580*scale
    const tx = x + 330 * scale + i * stepW;
    if (tx >= x + 330 * scale && tx < x + w) {
      // T crossbar (top 85*scale)
      const txEnd = Math.min(tx + stepW + 0.5, x + w);
      doc.rect(tx, y, txEnd - tx, 85 * scale, 'F');
      // T stem (413-497 * scale, from 85 to 370)
      if (tx >= x + 413 * scale && tx < x + 497 * scale) {
        doc.rect(tx, y + 85 * scale, txEnd - tx, (370 - 85) * scale, 'F');
      }
    }
  }
}

// ── Page 1: Cover ───────────────────────────────────────────

function buildCoverPage(doc: jsPDF, analysis: StoredAnalysis): void {
  drawPageBg(doc);

  const { conversation } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  // Gradient header — wide
  const steps = 40;
  const headerH = 100;
  for (let i = 0; i < steps; i++) {
    const c = blendColors(C.gradientStart, C.gradientEnd, i / steps);
    const alpha = 1 - (i / steps) * 0.7;
    setFill(doc, [
      Math.round(c[0] * alpha + C.bg[0] * (1 - alpha)),
      Math.round(c[1] * alpha + C.bg[1] * (1 - alpha)),
      Math.round(c[2] * alpha + C.bg[2] * (1 - alpha)),
    ]);
    doc.rect(0, (i * headerH) / steps, A4_W, headerH / steps + 1, 'F');
  }

  // Brand — PT monogram + text
  drawPTMonogram(doc, MARGIN, 18, 12);
  setColor(doc, C.white);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(12);
  doc.text('PODTEKST', MARGIN + 22, 28);
  setColor(doc, [100, 100, 100]);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(8);
  doc.text('RAPORT ANALIZY KONWERSACJI', MARGIN + 67, 28);

  // Title
  setColor(doc, C.white);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(26);
  const titleLines = wrapText(doc, conversation.title, CONTENT_W);
  let titleY = 55;
  for (const line of titleLines) {
    doc.text(line, MARGIN, titleY);
    titleY += 11;
  }

  // Health score on cover if available
  const healthScore = analysis.qualitative?.pass4?.health_score.overall;
  if (healthScore !== undefined) {
    const hColor = scoreColor(healthScore);
    drawCircleScore(doc, A4_W - MARGIN - 30, 50, 22, healthScore, hColor, 'HEALTH');
  }

  // Participants
  const partY = 120;
  drawCard(doc, MARGIN, partY, CONTENT_W, 28 + participants.length * 14);
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(8);
  doc.text('UCZESTNICY', MARGIN + 10, partY + 12);

  participants.forEach((name, i) => {
    setFill(doc, personColor(i));
    doc.circle(MARGIN + 14, partY + 22 + i * 14, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(11);
    doc.text(pdfSafe(name), MARGIN + 22, partY + 24 + i * 14);
  });

  // Stats row
  const statsY = partY + 40 + participants.length * 14;
  const statItems = [
    { label: 'WIADOMO\u015ACI', value: formatNumber(conversation.metadata.totalMessages) },
    { label: 'OKRES', value: `${conversation.metadata.durationDays} dni` },
    { label: 'POCZ\u0104TEK', value: formatDate(conversation.metadata.dateRange.start) },
    { label: 'KONIEC', value: formatDate(conversation.metadata.dateRange.end) },
  ];

  const statW = CONTENT_W / statItems.length;
  statItems.forEach((stat, i) => {
    const sx = MARGIN + i * statW;
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text(stat.label, sx, statsY);
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(16);
    doc.text(stat.value, sx, statsY + 10);
  });

  // Conversation personality section (if available)
  const cp = analysis.qualitative?.pass4?.conversation_personality;
  if (cp) {
    const cpY = statsY + 30;
    drawCard(doc, MARGIN, cpY, CONTENT_W, 36);
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text('GDYBY TA ROZMOWA BY\u0141A...', MARGIN + 10, cpY + 12);

    const items = [
      { label: 'Gatunek filmowy', value: cp.if_this_conversation_were_a.movie_genre },
      { label: 'Pogoda', value: cp.if_this_conversation_were_a.weather },
      { label: 'Jedno s\u0142owo', value: cp.if_this_conversation_were_a.one_word },
    ];
    items.forEach((item, i) => {
      const ix = MARGIN + 10 + i * 60;
      setColor(doc, C.textSecondary);
      doc.setFontSize(7);
      doc.text(item.label, ix, cpY + 20);
      setColor(doc, C.accent);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(10);
      doc.text(truncate(item.value, 20), ix, cpY + 28);
      doc.setFont('Inter', 'normal');
    });
  }

  // Generation date
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(8);
  doc.text(`Wygenerowano: ${formatDate(Date.now())}`, MARGIN, A4_H - 20);
}

// ── Page 2: Executive Summary ────────────────────────────────

function buildSummaryPage(doc: jsPDF, pass4: Pass4Result): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '01', 'Podsumowanie');

  let curY = 34;

  // Executive summary
  drawCard(doc, MARGIN, curY, CONTENT_W, 55);
  setColor(doc, C.accent);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(9);
  doc.text('EXECUTIVE SUMMARY', MARGIN + 10, curY + 12);
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(9);
  const summaryLines = wrapText(doc, pass4.executive_summary, CONTENT_W - 20);
  summaryLines.slice(0, 8).forEach((line, i) => {
    doc.text(line, MARGIN + 10, curY + 22 + i * 5);
  });

  curY += 65;

  // Health score with components
  const hs = pass4.health_score;
  const hsColor = scoreColor(hs.overall);
  drawCard(doc, MARGIN, curY, CONTENT_W, 75);

  drawCircleScore(doc, MARGIN + 35, curY + 38, 22, hs.overall, hsColor, 'HEALTH');

  const components: Array<{ label: string; value: number }> = [
    { label: 'Balans', value: hs.components.balance },
    { label: 'Wzajemno\u015B\u0107', value: hs.components.reciprocity },
    { label: 'Wzorce odpowiedzi', value: hs.components.response_pattern },
    { label: 'Bezpiecze\u0144stwo emocjonalne', value: hs.components.emotional_safety },
    { label: 'Trajektoria wzrostu', value: hs.components.growth_trajectory },
  ];

  const barX = MARGIN + 75;
  const barW = CONTENT_W - 95;
  components.forEach((comp, i) => {
    const by = curY + 16 + i * 12;
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text(comp.label, barX, by);
    drawProgressBar(doc, barX, by + 2, barW, 3, comp.value / 100, hsColor);
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text(String(Math.round(comp.value)), barX + barW + 4, by + 5);
  });

  curY += 85;

  // Key findings
  setColor(doc, C.textSecondary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(10);
  doc.text('Kluczowe wnioski', MARGIN, curY);
  curY += 8;

  pass4.key_findings.slice(0, 6).forEach((finding: KeyFinding) => {
    if (curY > A4_H - 35) return;

    const dotColor: RGB =
      finding.significance === 'positive' ? C.success
        : finding.significance === 'concerning' ? C.danger
          : C.warning;

    drawCard(doc, MARGIN, curY, CONTENT_W, 24);
    setFill(doc, dotColor);
    doc.circle(MARGIN + 10, curY + 8, 2.5, 'F');

    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(truncate(finding.finding, 80), MARGIN + 18, curY + 10);

    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    const detailLines = wrapText(doc, finding.detail, CONTENT_W - 28);
    doc.text(detailLines[0] ?? '', MARGIN + 18, curY + 18);

    curY += 28;
  });
}

// ── Page 3: Statistics ──────────────────────────────────────

function buildStatsPage(doc: jsPDF, analysis: StoredAnalysis): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '02', 'Statystyki');

  const { quantitative, conversation } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  let curY = 34;

  // Per-person stats
  participants.forEach((name, idx) => {
    const metrics: PersonMetrics = quantitative.perPerson[name];
    if (!metrics) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 62);

    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 12, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(12);
    doc.text(truncate(name, 40), MARGIN + 18, curY + 14);

    // Stat grid
    const stats = [
      { label: 'Wiadomo\u015Bci', value: formatNumber(metrics.totalMessages) },
      { label: 'S\u0142owa', value: formatNumber(metrics.totalWords) },
      { label: '\u015Ar. d\u0142ugo\u015B\u0107', value: `${metrics.averageMessageLength.toFixed(1)}` },
      { label: 'Emoji', value: formatNumber(metrics.emojiCount) },
      { label: 'Pytania', value: formatNumber(metrics.questionsAsked) },
      { label: 'Media', value: formatNumber(metrics.mediaShared) },
      { label: 'Linki', value: formatNumber(metrics.linksShared) },
      { label: 'Reakcje', value: formatNumber(metrics.reactionsGiven) },
    ];

    const colCount = 4;
    const cellW = (CONTENT_W - 20) / colCount;
    stats.forEach((st, si) => {
      const col = si % colCount;
      const row = Math.floor(si / colCount);
      const sx = MARGIN + 10 + col * cellW;
      const sy = curY + 26 + row * 18;

      setColor(doc, C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(6);
      doc.text(st.label.toUpperCase(), sx, sy);
      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(13);
      doc.text(st.value, sx, sy + 8);
    });

    curY += 70;
  });

  // Timing section
  curY += 2;
  setColor(doc, C.textSecondary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(9);
  doc.text('CZASY ODPOWIEDZI', MARGIN, curY);
  curY += 8;

  participants.forEach((name, idx) => {
    const timing = quantitative.timing.perPerson[name];
    if (!timing) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 24);

    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 12, 3, 'F');

    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(9);
    doc.text(truncate(name, 25), MARGIN + 18, curY + 14);

    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8);
    doc.text(`Mediana: ${formatDuration(timing.medianResponseTimeMs)}`, MARGIN + 85, curY + 14);
    doc.text(`\u015Arednia: ${formatDuration(timing.averageResponseTimeMs)}`, MARGIN + 125, curY + 14);

    curY += 30;
  });

  // Engagement stats
  curY += 2;
  if (curY < A4_H - 60) {
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(9);
    doc.text('ZAANGA\u017BOWANIE', MARGIN, curY);
    curY += 8;

    drawCard(doc, MARGIN, curY, CONTENT_W, 28);

    const engStats = [
      { label: 'Sesje rozm\u00F3w', value: String(quantitative.engagement.totalSessions) },
      { label: '\u015Ar. wiad./sesja', value: quantitative.engagement.avgConversationLength.toFixed(1) },
      { label: 'Najd\u0142u\u017Csza cisza', value: formatDuration(quantitative.timing.longestSilence.durationMs) },
    ];

    const engCellW = (CONTENT_W - 20) / engStats.length;
    engStats.forEach((st, i) => {
      const sx = MARGIN + 10 + i * engCellW;
      setColor(doc, C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(6);
      doc.text(st.label.toUpperCase(), sx, curY + 10);
      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(13);
      doc.text(st.value, sx, curY + 20);
    });
  }
}

// ── Page 4: Viral Scores ────────────────────────────────────

function buildViralScoresPage(
  doc: jsPDF,
  viralScores: ViralScores,
  participants: string[],
): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '03', 'Viral Scores');

  let curY = 34;

  // Compatibility — big circle + description
  drawCard(doc, MARGIN, curY, CONTENT_W, 60);
  drawCircleScore(doc, MARGIN + 35, curY + 30, 20, viralScores.compatibilityScore, C.accent, '%');
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(13);
  doc.text('Kompatybilno\u015B\u0107', MARGIN + 68, curY + 24);
  setColor(doc, C.textSecondary);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(8);
  const compatDesc = wrapText(
    doc,
    'Wska\u017Anik oparty na symetrii odpowiedzi, nak\u0142adaniu si\u0119 aktywno\u015Bci i balansie zaanga\u017Cowania.',
    CONTENT_W - 80,
  );
  compatDesc.forEach((line, i) => {
    doc.text(line, MARGIN + 68, curY + 34 + i * 5);
  });

  curY += 70;

  // Interest scores per person
  participants.forEach((name, idx) => {
    const score = viralScores.interestScores[name];
    if (score === undefined) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 32);
    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 16, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(10);
    doc.text(truncate(name, 30), MARGIN + 18, curY + 12);

    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text('ZAINTERESOWANIE', MARGIN + 18, curY + 20);
    drawProgressBar(doc, MARGIN + 18, curY + 24, CONTENT_W - 60, 4, score / 100, personColor(idx));
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(10);
    doc.text(`${Math.round(score)}`, A4_W - MARGIN - 15, curY + 28);

    curY += 38;
  });

  // Ghost risk
  curY += 4;
  setColor(doc, C.textSecondary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(9);
  doc.text('RYZYKO GHOSTINGU', MARGIN, curY);
  curY += 8;

  participants.forEach((name, idx) => {
    const ghost = viralScores.ghostRisk[name];
    if (!ghost) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 28);
    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 14, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(9);
    doc.text(truncate(name, 25), MARGIN + 18, curY + 12);

    const riskColor: RGB = ghost.score > 60 ? C.danger : ghost.score > 30 ? C.warning : C.success;
    drawProgressBar(doc, MARGIN + 18, curY + 18, CONTENT_W - 60, 4, ghost.score / 100, riskColor);
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.text(`${Math.round(ghost.score)}`, A4_W - MARGIN - 15, curY + 22);

    curY += 34;
  });

  // Delusion score
  curY += 4;
  drawCard(doc, MARGIN, curY, CONTENT_W, 32);
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('DELUSION SCORE', MARGIN + 10, curY + 10);
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(20);
  doc.text(`${Math.round(viralScores.delusionScore)}`, MARGIN + 10, curY + 24);
  if (viralScores.delusionHolder) {
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8);
    doc.text(`Bardziej: ${pdfSafe(viralScores.delusionHolder)}`, MARGIN + 40, curY + 24);
  }
}

// ── Page 5: Personality Profiles ────────────────────────────

function buildPersonalityPage(
  doc: jsPDF,
  profiles: Record<string, PersonProfile>,
  participants: string[],
  participantPhotos?: Record<string, string>,
): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '04', 'Profile osobowo\u015Bci');

  let curY = 34;

  participants.forEach((name, idx) => {
    const profile = profiles[name];
    if (!profile) return;

    // Main card — everything for this person
    const cardH = 115;
    if (curY + cardH > A4_H - 30) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, cardH);

    // Person header — photo or colored circle
    const photo = participantPhotos?.[name];
    let nameX = MARGIN + 18;
    if (photo) {
      try {
        doc.addImage(photo, 'JPEG', MARGIN + 4, curY + 4, 14, 14);
        nameX = MARGIN + 22;
      } catch {
        // Fallback to colored circle if image fails
        setFill(doc, personColor(idx));
        doc.circle(MARGIN + 10, curY + 12, 3, 'F');
      }
    } else {
      setFill(doc, personColor(idx));
      doc.circle(MARGIN + 10, curY + 12, 3, 'F');
    }
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(12);
    doc.text(truncate(name, 35), nameX, curY + 14);

    // MBTI badge
    if (profile.mbti) {
      setFill(doc, personColor(idx));
      doc.roundedRect(A4_W - MARGIN - 35, curY + 5, 25, 12, 2, 2, 'F');
      setColor(doc, C.white);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(10);
      doc.text(profile.mbti.type, A4_W - MARGIN - 22.5, curY + 13, { align: 'center' });
    }

    // Big Five bars (left column)
    const b5 = profile.big_five_approximation;
    const traits: Array<{ label: string; key: keyof BigFiveApproximation }> = [
      { label: 'Otwarto\u015B\u0107', key: 'openness' },
      { label: 'Sumienno\u015B\u0107', key: 'conscientiousness' },
      { label: 'Ekstrawersja', key: 'extraversion' },
      { label: 'Ugodowo\u015B\u0107', key: 'agreeableness' },
      { label: 'Neurotyzm', key: 'neuroticism' },
    ];

    const traitX = MARGIN + 10;
    const traitBarX = MARGIN + 45;
    const traitBarW = 55;
    traits.forEach((t, ti) => {
      const ty = curY + 28 + ti * 10;
      setColor(doc, C.textSecondary);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(6);
      doc.text(t.label, traitX, ty);

      const midpoint = (b5[t.key].range[0] + b5[t.key].range[1]) / 2;
      drawProgressBar(doc, traitBarX, ty - 2, traitBarW, 3, midpoint / 10, personColor(idx));

      setColor(doc, C.textMuted);
      doc.setFontSize(6);
      doc.text(`${b5[t.key].range[0]}-${b5[t.key].range[1]}`, traitBarX + traitBarW + 3, ty);
    });

    // Right column — attachment, communication, love language, EI
    const rightX = MARGIN + 110;

    // Attachment style
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(6);
    doc.text('STYL PRZYWI\u0104ZANIA', rightX, curY + 28);
    const attachmentLabels: Record<string, string> = {
      secure: 'Bezpieczny',
      anxious: 'L\u0119kowy',
      avoidant: 'Unikaj\u0105cy',
      disorganized: 'Zdezorganizowany',
      insufficient_data: 'Brak danych',
    };
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(9);
    doc.text(attachmentLabels[profile.attachment_indicators.primary_style] ?? profile.attachment_indicators.primary_style, rightX, curY + 36);

    // Communication style
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(6);
    doc.text('STYL KOMUNIKACJI', rightX, curY + 48);
    const styleLabels: Record<string, string> = {
      direct: 'Bezpo\u015Bredni',
      indirect: 'Po\u015Bredni',
      mixed: 'Mieszany',
    };
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(9);
    doc.text(styleLabels[profile.communication_profile.style] ?? profile.communication_profile.style, rightX, curY + 56);

    // Love language
    if (profile.love_language) {
      setColor(doc, C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(6);
      doc.text('J\u0118ZYK MI\u0141O\u015ACI', rightX, curY + 68);
      const llLabels: Record<string, string> = {
        words_of_affirmation: 'S\u0142owa uznania',
        quality_time: 'Wsp\u00F3lny czas',
        acts_of_service: 'Akty s\u0142u\u017Cby',
        gifts_pebbling: 'Prezenty',
        physical_touch: 'Dotyk',
      };
      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(9);
      doc.text(llLabels[profile.love_language.primary] ?? profile.love_language.primary, rightX, curY + 76);
    }

    // Emotional intelligence
    const ei = profile.emotional_intelligence;
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(6);
    doc.text('INTELIGENCJA EMOCJONALNA', rightX, curY + 88);
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(13);
    doc.text(`${Math.round(ei.overall)}/100`, rightX, curY + 100);

    // EI sub-scores as mini bars
    const eiTraits = [
      { label: 'Empatia', value: ei.empathy.score },
      { label: 'Samoregulacja', value: ei.emotional_regulation.score },
    ];
    eiTraits.forEach((t, ti) => {
      const ety = curY + 105 + ti * 7;
      setColor(doc, C.textMuted);
      doc.setFontSize(5);
      doc.text(t.label, rightX, ety);
      drawProgressBar(doc, rightX + 25, ety - 2, 40, 2, t.value / 100, personColor(idx));
    });

    curY += cardH + 8;
  });
}

// ── Page 6: Relationship Dynamics ───────────────────────────

function buildDynamicsPage(
  doc: jsPDF,
  pass2: Pass2Result,
  pass4: Pass4Result | undefined,
  participants: string[],
): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '05', 'Dynamika relacji');

  let curY = 34;

  // Power dynamics
  drawCard(doc, MARGIN, curY, CONTENT_W, 48);
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('BALANS SI\u0141Y', MARGIN + 10, curY + 12);

  const pd = pass2.power_dynamics;
  const barY = curY + 18;
  setFill(doc, C.cardBorder);
  doc.roundedRect(MARGIN + 10, barY, CONTENT_W - 20, 6, 3, 3, 'F');

  const midX = MARGIN + 10 + (CONTENT_W - 20) / 2;
  const offset = (pd.balance_score / 100) * ((CONTENT_W - 20) / 2);
  setFill(doc, C.accent);
  doc.circle(midX + offset, barY + 3, 4, 'F');

  setColor(doc, C.textSecondary);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  if (participants[0]) doc.text(truncate(participants[0], 20), MARGIN + 10, barY + 14);
  if (participants[1]) doc.text(truncate(participants[1], 20), A4_W - MARGIN - 10, barY + 14, { align: 'right' });

  setColor(doc, C.textSecondary);
  doc.setFontSize(7);
  doc.text(`Dostosowuje si\u0119 bardziej: ${pdfSafe(pd.who_adapts_more)}`, MARGIN + 10, curY + 42);

  curY += 56;

  // Emotional labor
  drawCard(doc, MARGIN, curY, CONTENT_W, 32);
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('PRACA EMOCJONALNA', MARGIN + 10, curY + 10);
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(9);
  doc.text(`G\u0142\u00F3wny opiekun: ${pdfSafe(pass2.emotional_labor.primary_caregiver)}`, MARGIN + 10, curY + 20);
  setColor(doc, C.textSecondary);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text(`Balans: ${Math.round(pass2.emotional_labor.balance_score)}/100`, MARGIN + 10, curY + 27);

  curY += 40;

  // Conflict patterns
  drawCard(doc, MARGIN, curY, CONTENT_W, 28);
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('KONFLIKT', MARGIN + 10, curY + 10);
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(9);
  const freqLabels: Record<string, string> = {
    none_observed: 'Brak', rare: 'Rzadki', occasional: 'Okazjonalny', frequent: 'Cz\u0119sty',
  };
  doc.text(
    `Cz\u0119stotliwo\u015B\u0107: ${freqLabels[pass2.conflict_patterns.conflict_frequency] ?? pass2.conflict_patterns.conflict_frequency}`,
    MARGIN + 10,
    curY + 20,
  );

  curY += 36;

  // Intimacy markers
  const intm = pass2.intimacy_markers;
  drawCard(doc, MARGIN, curY, CONTENT_W, 28);
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('INTYMNO\u015A\u0106', MARGIN + 10, curY + 10);
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(9);
  const jokesCount = intm.shared_language.inside_jokes;
  const petNames = intm.shared_language.pet_names;
  doc.text(
    `\u017Carty wewn.: ${jokesCount} | Zdrobnienia: ${petNames ? 'Tak' : 'Nie'}`,
    MARGIN + 10,
    curY + 20,
  );
  if (intm.shared_language.unique_phrases.length > 0) {
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(6);
    doc.text(`Unikalne frazy: ${intm.shared_language.unique_phrases.slice(0, 3).map(p => pdfSafe(p)).join(', ')}`, MARGIN + 100, curY + 20);
  }

  curY += 36;

  // Trajectory
  if (pass4) {
    const traj = pass4.relationship_trajectory;
    drawCard(doc, MARGIN, curY, CONTENT_W, 32);
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text('TRAJEKTORIA RELACJI', MARGIN + 10, curY + 10);

    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(9);
    doc.text(`Faza: ${pdfSafe(traj.current_phase)}`, MARGIN + 10, curY + 20);

    const dirLabels: Record<string, string> = {
      strengthening: 'Wzmacnianie',
      stable: 'Stabilna',
      weakening: 'Os\u0142abienie',
      volatile: 'Niestabilna',
    };
    const dirColor: RGB =
      traj.direction === 'strengthening' ? C.success
        : traj.direction === 'weakening' ? C.danger
          : traj.direction === 'volatile' ? C.warning : C.textSecondary;
    setColor(doc, dirColor);
    doc.text(`Kierunek: ${dirLabels[traj.direction] ?? traj.direction}`, MARGIN + 80, curY + 20);
  }
}

// ── Page 7: Flags ───────────────────────────────────────────

function buildFlagsPage(
  doc: jsPDF,
  pass2: Pass2Result,
): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '06', 'Flagi');

  let curY = 34;

  // Red flags
  if (pass2.red_flags.length > 0) {
    setColor(doc, C.danger);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(11);
    doc.text('Czerwone flagi', MARGIN, curY);
    curY += 10;

    pass2.red_flags.slice(0, 6).forEach((flag) => {
      if (curY > A4_H - 40) return;
      drawCard(doc, MARGIN, curY, CONTENT_W, 20);
      setFill(doc, C.danger);
      doc.circle(MARGIN + 10, curY + 10, 2.5, 'F');
      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(8);
      doc.text(truncate(flag.pattern, 80), MARGIN + 18, curY + 8);
      setColor(doc, C.textSecondary);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(6);
      const sevLabels: Record<string, string> = { mild: '\u0141agodna', moderate: 'Umiarkowana', severe: 'Powa\u017Cna' };
      doc.text(`Waga: ${sevLabels[flag.severity] ?? flag.severity}`, MARGIN + 18, curY + 15);
      curY += 24;
    });

    curY += 4;
  }

  // Green flags
  if (pass2.green_flags.length > 0) {
    setColor(doc, C.success);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(11);
    doc.text('Zielone flagi', MARGIN, curY);
    curY += 10;

    pass2.green_flags.slice(0, 6).forEach((flag) => {
      if (curY > A4_H - 40) return;
      drawCard(doc, MARGIN, curY, CONTENT_W, 16);
      setFill(doc, C.success);
      doc.circle(MARGIN + 10, curY + 8, 2.5, 'F');
      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(8);
      doc.text(truncate(flag.pattern, 85), MARGIN + 18, curY + 10);
      curY += 20;
    });
  }
}

// ── Page 8: Badges ──────────────────────────────────────────

function buildBadgesPage(doc: jsPDF, badges: Badge[], participants: string[]): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '07', 'Osi\u0105gni\u0119cia');

  const colW = (CONTENT_W - 6) / 2;
  const badgeH = 28;
  let curY = 34;

  badges.forEach((badge, i) => {
    const col = i % 2;
    const x = MARGIN + col * (colW + 6);

    if (col === 0 && i > 0) {
      curY += badgeH + 6;
    }
    if (curY > A4_H - 40) return;

    drawCard(doc, x, curY, colW, badgeH);

    const holderIdx = participants.indexOf(badge.holder);
    setFill(doc, holderIdx >= 0 ? personColor(holderIdx) : C.accent);
    doc.circle(x + 10, curY + 14, 3.5, 'F');

    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(truncate(badge.name, 25), x + 18, curY + 10);

    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(6);
    doc.text(truncate(`${badge.holder} \u2014 ${badge.description}`, 45), x + 18, curY + 18);
  });
}

// ── Page 9: Insights ────────────────────────────────────────

function buildInsightsPage(
  doc: jsPDF,
  pass4: Pass4Result,
  participants: string[],
): void {
  drawPageBg(doc);
  drawSectionHeader(doc, '08', 'Wskaz\u00F3wki');

  let curY = 34;

  // Insights grouped by person
  const allInsights = pass4.insights ?? [];

  participants.forEach((name, idx) => {
    const personInsights = allInsights.filter((ins) => ins.for === name);
    if (personInsights.length === 0) return;
    if (curY > A4_H - 50) return;

    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 4, curY + 3, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(10);
    doc.text(truncate(name, 40), MARGIN + 12, curY + 5);
    curY += 12;

    personInsights.slice(0, 4).forEach((ins) => {
      if (curY > A4_H - 35) return;

      drawCard(doc, MARGIN, curY, CONTENT_W, 22);

      const priorityColor: RGB =
        ins.priority === 'high' ? C.danger
          : ins.priority === 'medium' ? C.warning : C.textMuted;

      setFill(doc, priorityColor);
      doc.circle(MARGIN + 10, curY + 11, 2, 'F');

      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(8);
      const insightLines = wrapText(doc, ins.insight, CONTENT_W - 28);
      insightLines.slice(0, 2).forEach((line, li) => {
        doc.text(line, MARGIN + 18, curY + 10 + li * 5);
      });

      curY += 26;
    });

    curY += 4;
  });

  // CTA at bottom
  if (curY < A4_H - 60) {
    curY = Math.max(curY, A4_H - 70);

    // Gradient card
    const ctaY = curY;
    const ctaH = 40;
    const ctaSteps = 20;
    for (let i = 0; i < ctaSteps; i++) {
      const c = blendColors(C.gradientStart, C.gradientEnd, i / ctaSteps);
      const alpha = 0.15;
      setFill(doc, [
        Math.round(c[0] * alpha + C.cardBg[0] * (1 - alpha)),
        Math.round(c[1] * alpha + C.cardBg[1] * (1 - alpha)),
        Math.round(c[2] * alpha + C.cardBg[2] * (1 - alpha)),
      ]);
      doc.rect(MARGIN, ctaY + (i * ctaH) / ctaSteps, CONTENT_W, ctaH / ctaSteps + 0.5, 'F');
    }
    setDraw(doc, C.cardBorder);
    doc.roundedRect(MARGIN, ctaY, CONTENT_W, ctaH, 3, 3, 'S');

    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(12);
    doc.text('Sprawd\u017A swoj\u0105 rozmow\u0119 na PodTeksT', A4_W / 2, ctaY + 18, { align: 'center' });
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8);
    doc.text('podtekst.app \u2014 odkryj to, co kryje si\u0119 mi\u0119dzy wierszami', A4_W / 2, ctaY + 28, { align: 'center' });
  }
}

// ── Main export function ─────────────────────────────────────

export interface PdfExportProgress {
  current: number;
  total: number;
  label: string;
}

export async function generateAnalysisPdf(
  analysis: StoredAnalysis,
  onProgress?: (progress: PdfExportProgress) => void,
): Promise<void> {
  const { quantitative, qualitative, conversation } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  const hasQualitative = qualitative?.status === 'complete';
  const hasViralScores = !!quantitative.viralScores;
  const hasBadges = !!quantitative.badges && quantitative.badges.length > 0;
  const hasPass4 = hasQualitative && !!qualitative?.pass4;
  const hasPass3 = hasQualitative && !!qualitative?.pass3;
  const hasPass2 = hasQualitative && !!qualitative?.pass2;

  // Calculate total pages
  let totalPages = 2; // Cover + Stats always present
  if (hasPass4) totalPages++; // Summary page
  if (hasViralScores) totalPages++;
  if (hasPass3) totalPages++;
  if (hasPass2) totalPages++; // Dynamics
  if (hasPass2) totalPages++; // Flags
  if (hasBadges) totalPages++;
  if (hasPass4) totalPages++; // Insights

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register Inter font for Polish character support
  registerFonts(doc);

  let pageNum = 0;
  const report = (label: string) => {
    pageNum++;
    onProgress?.({ current: pageNum, total: totalPages, label });
  };

  // Page 1: Cover
  report('Ok\u0142adka...');
  buildCoverPage(doc, analysis);
  drawFooter(doc, 1, totalPages);

  let nextPageIdx = 2;

  // Page 2: Executive Summary (if qualitative available)
  if (hasPass4 && qualitative?.pass4) {
    report('Podsumowanie...');
    doc.addPage();
    buildSummaryPage(doc, qualitative.pass4);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 3: Statistics
  report('Statystyki...');
  doc.addPage();
  buildStatsPage(doc, analysis);
  drawFooter(doc, nextPageIdx, totalPages);
  nextPageIdx++;

  // Page 4: Viral Scores
  if (hasViralScores && quantitative.viralScores) {
    report('Viral Scores...');
    doc.addPage();
    buildViralScoresPage(doc, quantitative.viralScores, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 5: Personality Profiles
  if (hasPass3 && qualitative?.pass3) {
    report('Profile osobowo\u015Bci...');
    doc.addPage();
    buildPersonalityPage(doc, qualitative.pass3, participants, analysis.participantPhotos);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 6: Relationship Dynamics
  if (hasPass2 && qualitative?.pass2) {
    report('Dynamika relacji...');
    doc.addPage();
    buildDynamicsPage(doc, qualitative.pass2, qualitative?.pass4, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 7: Flags
  if (hasPass2 && qualitative?.pass2) {
    report('Flagi...');
    doc.addPage();
    buildFlagsPage(doc, qualitative.pass2);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 8: Badges
  if (hasBadges && quantitative.badges) {
    report('Osi\u0105gni\u0119cia...');
    doc.addPage();
    buildBadgesPage(doc, quantitative.badges, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 9: Insights
  if (hasPass4 && qualitative?.pass4) {
    report('Wskaz\u00F3wki...');
    doc.addPage();
    buildInsightsPage(doc, qualitative.pass4, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Generate filename
  const titleSlug = conversation.title
    .toLowerCase()
    .replace(/[^a-z0-9\u0105\u0107\u0119\u0142\u0144\u00F3\u015B\u017A\u017C]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `podtekst-${titleSlug}-${dateStr}.pdf`;

  doc.save(filename);
}
