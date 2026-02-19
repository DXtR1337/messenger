/**
 * PDF export for PodTeksT conversation analysis.
 *
 * Generates a multi-page dark-themed A4 report using jsPDF.
 * Pages: Cover, Key Statistics, Viral Scores, Health + Findings,
 *        Personality Profiles, Relationship Dynamics, Badges.
 */

import jsPDF from 'jspdf';
import type { StoredAnalysis } from '@/lib/analysis/types';
import type {
  QuantitativeAnalysis,
  ViralScores,
  Badge,
  PersonMetrics,
} from '@/lib/parsers/types';
import type {
  Pass1Result,
  Pass2Result,
  PersonProfile,
  Pass4Result,
  HealthScore,
  KeyFinding,
  BigFiveApproximation,
} from '@/lib/analysis/types';

// ── Color palette ────────────────────────────────────────────
const C = {
  bg: [10, 10, 10] as RGB,
  cardBg: [17, 17, 17] as RGB,
  cardBorder: [30, 30, 30] as RGB,
  textPrimary: [250, 250, 250] as RGB,
  textSecondary: [136, 136, 136] as RGB,
  textMuted: [85, 85, 85] as RGB,
  accent: [59, 130, 246] as RGB,
  personA: [59, 130, 246] as RGB,
  personB: [168, 85, 247] as RGB,
  success: [16, 185, 129] as RGB,
  warning: [245, 158, 11] as RGB,
  danger: [239, 68, 68] as RGB,
  white: [255, 255, 255] as RGB,
};

type RGB = [number, number, number];

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

function drawPageBg(doc: jsPDF): void {
  setFill(doc, C.bg);
  doc.rect(0, 0, A4_W, A4_H, 'F');
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  setColor(doc, C.textMuted);
  doc.setFontSize(8);
  doc.text('PodTeksT — podtekst.app', MARGIN, A4_H - 10);
  doc.text(`${pageNum} / ${totalPages}`, A4_W - MARGIN, A4_H - 10, { align: 'right' });
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
): void {
  // Background circle
  setDraw(doc, C.cardBorder);
  doc.setLineWidth(2);
  doc.circle(cx, cy, r, 'S');

  // Score arc (approximated by thicker foreground circle)
  setDraw(doc, color);
  doc.setLineWidth(2.5);
  // Draw partial arc by using a clipped approach — jsPDF lacks native arc,
  // so draw the full circle in the accent color and overlay with text
  doc.circle(cx, cy, r, 'S');
  doc.setLineWidth(0.5);

  // Score number
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text(String(Math.round(score)), cx, cy + 2, { align: 'center' });

  // "/100" label
  setColor(doc, C.textMuted);
  doc.setFontSize(8);
  doc.text('/100', cx, cy + 9, { align: 'center' });
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
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
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// ── Page builders ────────────────────────────────────────────

function buildCoverPage(doc: jsPDF, analysis: StoredAnalysis): void {
  drawPageBg(doc);

  const { conversation, quantitative } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  // Accent line at top
  setFill(doc, C.accent);
  doc.rect(0, 0, A4_W, 3, 'F');

  // Brand
  setColor(doc, C.textMuted);
  doc.setFontSize(10);
  doc.text('PODTEKST', MARGIN, 30);

  // Title
  setColor(doc, C.textPrimary);
  doc.setFontSize(28);
  const titleLines = wrapText(doc, conversation.title, CONTENT_W);
  let titleY = 60;
  for (const line of titleLines) {
    doc.text(line, MARGIN, titleY);
    titleY += 12;
  }

  // Subtitle: "Analiza konwersacji"
  setColor(doc, C.textSecondary);
  doc.setFontSize(14);
  doc.text('Analiza konwersacji', MARGIN, titleY + 8);

  // Participants card
  const cardY = titleY + 30;
  drawCard(doc, MARGIN, cardY, CONTENT_W, 50);

  setColor(doc, C.textMuted);
  doc.setFontSize(9);
  doc.text('UCZESTNICY', MARGIN + 10, cardY + 14);

  participants.forEach((name, i) => {
    setFill(doc, personColor(i));
    doc.circle(MARGIN + 14, cardY + 24 + i * 14, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFontSize(12);
    doc.text(name, MARGIN + 22, cardY + 26 + i * 14);
  });

  // Stats row
  const statsY = cardY + 70;
  const statItems = [
    { label: 'Wiadomości', value: formatNumber(conversation.metadata.totalMessages) },
    { label: 'Okres', value: `${conversation.metadata.durationDays} dni` },
    {
      label: 'Początek',
      value: formatDate(conversation.metadata.dateRange.start),
    },
    {
      label: 'Koniec',
      value: formatDate(conversation.metadata.dateRange.end),
    },
  ];

  const statW = CONTENT_W / statItems.length;
  statItems.forEach((stat, i) => {
    const sx = MARGIN + i * statW;
    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.text(stat.label.toUpperCase(), sx, statsY);
    setColor(doc, C.textPrimary);
    doc.setFontSize(16);
    doc.text(stat.value, sx, statsY + 10);
  });

  // Decorative line
  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, statsY + 20, A4_W - MARGIN, statsY + 20);

  // Generation date
  setColor(doc, C.textMuted);
  doc.setFontSize(9);
  doc.text(
    `Wygenerowano: ${formatDate(Date.now())}`,
    MARGIN,
    A4_H - 25,
  );

  // Health score preview if available
  const healthScore = analysis.qualitative?.pass4?.health_score.overall;
  if (healthScore !== undefined) {
    drawCircleScore(doc, A4_W - MARGIN - 25, statsY - 5, 18, healthScore, C.accent);
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text('HEALTH SCORE', A4_W - MARGIN - 25, statsY + 20, { align: 'center' });
  }
}

function buildStatsPage(doc: jsPDF, analysis: StoredAnalysis): void {
  drawPageBg(doc);

  const { quantitative, conversation } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  // Section header
  setColor(doc, C.accent);
  doc.setFontSize(10);
  doc.text('02', MARGIN, 22);
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text('Kluczowe statystyki', MARGIN + 14, 22);

  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 28, A4_W - MARGIN, 28);

  let curY = 38;

  // Per-person stats cards
  participants.forEach((name, idx) => {
    const metrics: PersonMetrics = quantitative.perPerson[name];
    if (!metrics) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 68);

    // Person indicator + name
    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 12, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFontSize(13);
    doc.text(truncate(name, 40), MARGIN + 18, curY + 14);

    // Stat grid
    const stats = [
      { label: 'Wiadomości', value: formatNumber(metrics.totalMessages) },
      { label: 'Słowa', value: formatNumber(metrics.totalWords) },
      { label: 'Śr. długość', value: `${metrics.averageMessageLength.toFixed(1)} słów` },
      { label: 'Emoji', value: formatNumber(metrics.emojiCount) },
      { label: 'Pytania', value: formatNumber(metrics.questionsAsked) },
      { label: 'Media', value: formatNumber(metrics.mediaShared) },
      { label: 'Linki', value: formatNumber(metrics.linksShared) },
      { label: 'Reakcje dane', value: formatNumber(metrics.reactionsGiven) },
    ];

    const colCount = 4;
    const cellW = (CONTENT_W - 20) / colCount;
    stats.forEach((st, si) => {
      const col = si % colCount;
      const row = Math.floor(si / colCount);
      const sx = MARGIN + 10 + col * cellW;
      const sy = curY + 28 + row * 20;

      setColor(doc, C.textMuted);
      doc.setFontSize(7);
      doc.text(st.label.toUpperCase(), sx, sy);
      setColor(doc, C.textPrimary);
      doc.setFontSize(12);
      doc.text(st.value, sx, sy + 8);
    });

    curY += 76;
  });

  // Timing section
  curY += 4;
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.text('Czasy odpowiedzi', MARGIN, curY);
  curY += 8;

  participants.forEach((name, idx) => {
    const timing = quantitative.timing.perPerson[name];
    if (!timing) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 28);

    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 14, 3, 'F');

    setColor(doc, C.textPrimary);
    doc.setFontSize(10);
    doc.text(truncate(name, 30), MARGIN + 18, curY + 16);

    setColor(doc, C.textSecondary);
    doc.setFontSize(9);
    doc.text(
      `Mediana: ${formatDuration(timing.medianResponseTimeMs)}`,
      MARGIN + 90,
      curY + 16,
    );
    doc.text(
      `Średnia: ${formatDuration(timing.averageResponseTimeMs)}`,
      MARGIN + 130,
      curY + 16,
    );

    curY += 34;
  });

  // Engagement row
  curY += 4;
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.text('Zaangażowanie', MARGIN, curY);
  curY += 8;

  drawCard(doc, MARGIN, curY, CONTENT_W, 32);

  const engStats = [
    { label: 'Sesje rozmów', value: String(quantitative.engagement.totalSessions) },
    {
      label: 'Śr. wiad./sesja',
      value: quantitative.engagement.avgConversationLength.toFixed(1),
    },
    {
      label: 'Najdłuższa cisza',
      value: formatDuration(quantitative.timing.longestSilence.durationMs),
    },
  ];

  const engCellW = (CONTENT_W - 20) / engStats.length;
  engStats.forEach((st, i) => {
    const sx = MARGIN + 10 + i * engCellW;
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text(st.label.toUpperCase(), sx, curY + 12);
    setColor(doc, C.textPrimary);
    doc.setFontSize(13);
    doc.text(st.value, sx, curY + 22);
  });
}

function buildViralScoresPage(
  doc: jsPDF,
  viralScores: ViralScores,
  participants: string[],
): void {
  drawPageBg(doc);

  setColor(doc, C.accent);
  doc.setFontSize(10);
  doc.text('03', MARGIN, 22);
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text('Viral Scores', MARGIN + 14, 22);

  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 28, A4_W - MARGIN, 28);

  let curY = 44;

  // Compatibility score — big circle
  drawCard(doc, MARGIN, curY, CONTENT_W, 65);
  drawCircleScore(doc, MARGIN + 35, curY + 33, 22, viralScores.compatibilityScore, C.accent);
  setColor(doc, C.textPrimary);
  doc.setFontSize(14);
  doc.text('Kompatybilność', MARGIN + 70, curY + 28);
  setColor(doc, C.textSecondary);
  doc.setFontSize(9);
  const compatLines = wrapText(
    doc,
    'Wskaźnik oparty na symetrii odpowiedzi, nakładaniu się aktywności i balansie zaangażowania.',
    CONTENT_W - 80,
  );
  compatLines.forEach((line, i) => {
    doc.text(line, MARGIN + 70, curY + 38 + i * 5);
  });

  curY += 75;

  // Interest scores per person
  participants.forEach((name, idx) => {
    const score = viralScores.interestScores[name];
    if (score === undefined) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 36);
    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 18, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFontSize(11);
    doc.text(truncate(name, 35), MARGIN + 18, curY + 14);

    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.text('ZAINTERESOWANIE', MARGIN + 18, curY + 22);

    // Bar
    drawProgressBar(doc, MARGIN + 18, curY + 26, CONTENT_W - 60, 4, score / 100, personColor(idx));
    setColor(doc, C.textPrimary);
    doc.setFontSize(11);
    doc.text(`${Math.round(score)}`, A4_W - MARGIN - 15, curY + 30);

    curY += 42;
  });

  // Ghost risk
  curY += 4;
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.text('Ryzyko ghostingu', MARGIN, curY);
  curY += 8;

  participants.forEach((name, idx) => {
    const ghost = viralScores.ghostRisk[name];
    if (!ghost) return;

    drawCard(doc, MARGIN, curY, CONTENT_W, 32);
    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 16, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFontSize(10);
    doc.text(truncate(name, 30), MARGIN + 18, curY + 14);

    const riskColor: RGB = ghost.score > 60 ? C.danger : ghost.score > 30 ? C.warning : C.success;
    drawProgressBar(doc, MARGIN + 18, curY + 20, CONTENT_W - 60, 4, ghost.score / 100, riskColor);
    setColor(doc, C.textPrimary);
    doc.setFontSize(10);
    doc.text(`${Math.round(ghost.score)}`, A4_W - MARGIN - 15, curY + 24);

    curY += 38;
  });

  // Delusion score
  curY += 4;
  drawCard(doc, MARGIN, curY, CONTENT_W, 36);
  setColor(doc, C.textMuted);
  doc.setFontSize(8);
  doc.text('DELUSION SCORE', MARGIN + 10, curY + 12);
  setColor(doc, C.textPrimary);
  doc.setFontSize(18);
  doc.text(`${Math.round(viralScores.delusionScore)}`, MARGIN + 10, curY + 27);
  if (viralScores.delusionHolder) {
    setColor(doc, C.textSecondary);
    doc.setFontSize(9);
    doc.text(`Bardziej: ${viralScores.delusionHolder}`, MARGIN + 40, curY + 27);
  }
}

function buildHealthFindingsPage(
  doc: jsPDF,
  pass4: Pass4Result,
): void {
  drawPageBg(doc);

  setColor(doc, C.accent);
  doc.setFontSize(10);
  doc.text('04', MARGIN, 22);
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text('Health Score i wnioski', MARGIN + 14, 22);

  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 28, A4_W - MARGIN, 28);

  // Health score circle
  const hs = pass4.health_score;
  drawCard(doc, MARGIN, 38, CONTENT_W, 80);

  const scoreColor: RGB = hs.overall >= 70 ? C.success : hs.overall >= 40 ? C.warning : C.danger;
  drawCircleScore(doc, MARGIN + 40, 78, 25, hs.overall, scoreColor);

  // Component bars
  const components: Array<{ label: string; value: number }> = [
    { label: 'Balans', value: hs.components.balance },
    { label: 'Wzajemność', value: hs.components.reciprocity },
    { label: 'Wzorce odpowiedzi', value: hs.components.response_pattern },
    { label: 'Bezpieczeństwo emocjonalne', value: hs.components.emotional_safety },
    { label: 'Trajektoria wzrostu', value: hs.components.growth_trajectory },
  ];

  const barX = MARGIN + 80;
  const barW = CONTENT_W - 100;
  components.forEach((comp, i) => {
    const by = 50 + i * 12;
    setColor(doc, C.textSecondary);
    doc.setFontSize(7);
    doc.text(comp.label, barX, by);
    drawProgressBar(doc, barX, by + 2, barW, 3, comp.value / 100, scoreColor);
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text(String(Math.round(comp.value)), barX + barW + 4, by + 5);
  });

  // Executive summary
  let curY = 128;
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.text('Podsumowanie', MARGIN, curY);
  curY += 8;

  drawCard(doc, MARGIN, curY, CONTENT_W, 40);
  setColor(doc, C.textPrimary);
  doc.setFontSize(9);
  const summaryLines = wrapText(doc, pass4.executive_summary, CONTENT_W - 20);
  summaryLines.slice(0, 6).forEach((line, i) => {
    doc.text(line, MARGIN + 10, curY + 12 + i * 5);
  });

  // Key findings
  curY += 50;
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.text('Kluczowe wnioski', MARGIN, curY);
  curY += 8;

  pass4.key_findings.slice(0, 6).forEach((finding: KeyFinding) => {
    if (curY > A4_H - 30) return;

    const dotColor: RGB =
      finding.significance === 'positive'
        ? C.success
        : finding.significance === 'concerning'
          ? C.danger
          : C.warning;

    drawCard(doc, MARGIN, curY, CONTENT_W, 22);
    setFill(doc, dotColor);
    doc.circle(MARGIN + 10, curY + 11, 2.5, 'F');

    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.text(truncate(finding.finding, 80), MARGIN + 18, curY + 10);

    setColor(doc, C.textSecondary);
    doc.setFontSize(7);
    doc.text(truncate(finding.detail, 100), MARGIN + 18, curY + 17);

    curY += 26;
  });
}

function buildPersonalityPage(
  doc: jsPDF,
  profiles: Record<string, PersonProfile>,
  participants: string[],
): void {
  drawPageBg(doc);

  setColor(doc, C.accent);
  doc.setFontSize(10);
  doc.text('05', MARGIN, 22);
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text('Profile osobowości', MARGIN + 14, 22);

  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 28, A4_W - MARGIN, 28);

  let curY = 38;

  participants.forEach((name, idx) => {
    const profile = profiles[name];
    if (!profile) return;
    if (curY > A4_H - 50) return;

    const cardH = 112;
    drawCard(doc, MARGIN, curY, CONTENT_W, cardH);

    // Person header
    setFill(doc, personColor(idx));
    doc.circle(MARGIN + 10, curY + 12, 3, 'F');
    setColor(doc, C.textPrimary);
    doc.setFontSize(12);
    doc.text(truncate(name, 40), MARGIN + 18, curY + 14);

    // MBTI badge
    if (profile.mbti) {
      setFill(doc, personColor(idx));
      doc.roundedRect(A4_W - MARGIN - 35, curY + 5, 25, 12, 2, 2, 'F');
      setColor(doc, C.white);
      doc.setFontSize(10);
      doc.text(profile.mbti.type, A4_W - MARGIN - 22.5, curY + 13, { align: 'center' });
    }

    // Big Five bars
    const b5 = profile.big_five_approximation;
    const traits: Array<{ label: string; key: keyof BigFiveApproximation }> = [
      { label: 'Otwartość', key: 'openness' },
      { label: 'Sumienność', key: 'conscientiousness' },
      { label: 'Ekstrawersja', key: 'extraversion' },
      { label: 'Ugodowość', key: 'agreeableness' },
      { label: 'Neurotyzm', key: 'neuroticism' },
    ];

    const traitX = MARGIN + 10;
    const traitBarX = MARGIN + 50;
    const traitBarW = 70;
    traits.forEach((t, ti) => {
      const ty = curY + 28 + ti * 11;
      setColor(doc, C.textSecondary);
      doc.setFontSize(7);
      doc.text(t.label, traitX, ty);

      const midpoint = (b5[t.key].range[0] + b5[t.key].range[1]) / 2;
      drawProgressBar(doc, traitBarX, ty - 2, traitBarW, 3, midpoint / 10, personColor(idx));

      setColor(doc, C.textMuted);
      doc.setFontSize(7);
      doc.text(`${b5[t.key].range[0]}-${b5[t.key].range[1]}`, traitBarX + traitBarW + 4, ty);
    });

    // Attachment style
    const attachment = profile.attachment_indicators;
    const rightColX = MARGIN + 100;
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text('STYL PRZYWIĄZANIA', rightColX, curY + 28);
    setColor(doc, C.textPrimary);
    doc.setFontSize(11);
    const attachmentLabels: Record<string, string> = {
      secure: 'Bezpieczny',
      anxious: 'Lękowy',
      avoidant: 'Unikający',
      disorganized: 'Zdezorganizowany',
      insufficient_data: 'Brak danych',
    };
    doc.text(
      attachmentLabels[attachment.primary_style] ?? attachment.primary_style,
      rightColX,
      curY + 37,
    );

    // Communication style
    const commProfile = profile.communication_profile;
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text('STYL KOMUNIKACJI', rightColX, curY + 50);
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    const styleLabels: Record<string, string> = {
      direct: 'Bezpośredni',
      indirect: 'Pośredni',
      mixed: 'Mieszany',
    };
    doc.text(styleLabels[commProfile.style] ?? commProfile.style, rightColX, curY + 58);

    // Love language
    if (profile.love_language) {
      setColor(doc, C.textMuted);
      doc.setFontSize(7);
      doc.text('JĘZYK MIŁOŚCI', rightColX, curY + 68);
      const llLabels: Record<string, string> = {
        words_of_affirmation: 'Słowa uznania',
        quality_time: 'Wspólny czas',
        acts_of_service: 'Akty służby',
        gifts_pebbling: 'Prezenty',
        physical_touch: 'Dotyk',
      };
      setColor(doc, C.textPrimary);
      doc.setFontSize(9);
      doc.text(
        llLabels[profile.love_language.primary] ?? profile.love_language.primary,
        rightColX,
        curY + 76,
      );
    }

    // Emotional intelligence score
    const ei = profile.emotional_intelligence;
    setColor(doc, C.textMuted);
    doc.setFontSize(7);
    doc.text('INTELIGENCJA EMOCJONALNA', rightColX, curY + 88);
    setColor(doc, C.textPrimary);
    doc.setFontSize(14);
    doc.text(`${Math.round(ei.overall)}/100`, rightColX, curY + 100);

    curY += cardH + 8;
  });
}

function buildDynamicsPage(
  doc: jsPDF,
  pass2: Pass2Result,
  pass4: Pass4Result | undefined,
  participants: string[],
): void {
  drawPageBg(doc);

  setColor(doc, C.accent);
  doc.setFontSize(10);
  doc.text('06', MARGIN, 22);
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text('Dynamika relacji', MARGIN + 14, 22);

  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 28, A4_W - MARGIN, 28);

  let curY = 38;

  // Power dynamics
  drawCard(doc, MARGIN, curY, CONTENT_W, 50);
  setColor(doc, C.textMuted);
  doc.setFontSize(8);
  doc.text('BALANS SIŁY', MARGIN + 10, curY + 12);

  // Power balance bar
  const pd = pass2.power_dynamics;
  const barY = curY + 20;
  setFill(doc, C.cardBorder);
  doc.roundedRect(MARGIN + 10, barY, CONTENT_W - 20, 6, 3, 3, 'F');

  const midX = MARGIN + 10 + (CONTENT_W - 20) / 2;
  const offset = (pd.balance_score / 100) * ((CONTENT_W - 20) / 2);
  setFill(doc, C.accent);
  doc.circle(midX + offset, barY + 3, 4, 'F');

  // Labels
  setColor(doc, C.textSecondary);
  doc.setFontSize(7);
  if (participants[0]) {
    doc.text(truncate(participants[0], 20), MARGIN + 10, barY + 14);
  }
  if (participants[1]) {
    doc.text(truncate(participants[1], 20), A4_W - MARGIN - 10, barY + 14, { align: 'right' });
  }

  setColor(doc, C.textSecondary);
  doc.setFontSize(8);
  doc.text(
    `Dostosowuje się bardziej: ${pd.who_adapts_more}`,
    MARGIN + 10,
    curY + 44,
  );

  curY += 58;

  // Emotional labor
  drawCard(doc, MARGIN, curY, CONTENT_W, 34);
  setColor(doc, C.textMuted);
  doc.setFontSize(8);
  doc.text('PRACA EMOCJONALNA', MARGIN + 10, curY + 12);
  setColor(doc, C.textPrimary);
  doc.setFontSize(10);
  doc.text(
    `Główny opiekun: ${pass2.emotional_labor.primary_caregiver}`,
    MARGIN + 10,
    curY + 22,
  );
  setColor(doc, C.textSecondary);
  doc.setFontSize(8);
  doc.text(
    `Balans: ${Math.round(pass2.emotional_labor.balance_score)}/100`,
    MARGIN + 10,
    curY + 29,
  );

  curY += 42;

  // Red flags
  if (pass2.red_flags.length > 0) {
    setColor(doc, C.danger);
    doc.setFontSize(10);
    doc.text('Czerwone flagi', MARGIN, curY);
    curY += 8;

    pass2.red_flags.slice(0, 4).forEach((flag) => {
      if (curY > A4_H - 40) return;
      drawCard(doc, MARGIN, curY, CONTENT_W, 18);
      setFill(doc, C.danger);
      doc.circle(MARGIN + 10, curY + 9, 2, 'F');
      setColor(doc, C.textPrimary);
      doc.setFontSize(8);
      doc.text(truncate(flag.pattern, 90), MARGIN + 18, curY + 11);
      curY += 22;
    });

    curY += 4;
  }

  // Green flags
  if (pass2.green_flags.length > 0) {
    setColor(doc, C.success);
    doc.setFontSize(10);
    doc.text('Zielone flagi', MARGIN, curY);
    curY += 8;

    pass2.green_flags.slice(0, 4).forEach((flag) => {
      if (curY > A4_H - 40) return;
      drawCard(doc, MARGIN, curY, CONTENT_W, 18);
      setFill(doc, C.success);
      doc.circle(MARGIN + 10, curY + 9, 2, 'F');
      setColor(doc, C.textPrimary);
      doc.setFontSize(8);
      doc.text(truncate(flag.pattern, 90), MARGIN + 18, curY + 11);
      curY += 22;
    });

    curY += 4;
  }

  // Relationship trajectory
  if (pass4) {
    const traj = pass4.relationship_trajectory;
    if (curY < A4_H - 50) {
      setColor(doc, C.textSecondary);
      doc.setFontSize(10);
      doc.text('Trajektoria relacji', MARGIN, curY);
      curY += 8;

      drawCard(doc, MARGIN, curY, CONTENT_W, 28);
      setColor(doc, C.textPrimary);
      doc.setFontSize(10);
      doc.text(`Faza: ${traj.current_phase}`, MARGIN + 10, curY + 12);

      const dirLabels: Record<string, string> = {
        strengthening: 'Wzmacnianie',
        stable: 'Stabilna',
        weakening: 'Osłabienie',
        volatile: 'Niestabilna',
      };
      const dirColor: RGB =
        traj.direction === 'strengthening'
          ? C.success
          : traj.direction === 'weakening'
            ? C.danger
            : traj.direction === 'volatile'
              ? C.warning
              : C.textSecondary;
      setColor(doc, dirColor);
      doc.setFontSize(10);
      doc.text(
        `Kierunek: ${dirLabels[traj.direction] ?? traj.direction}`,
        MARGIN + 10,
        curY + 22,
      );
    }
  }
}

function buildBadgesPage(doc: jsPDF, badges: Badge[], participants: string[]): void {
  drawPageBg(doc);

  setColor(doc, C.accent);
  doc.setFontSize(10);
  doc.text('07', MARGIN, 22);
  setColor(doc, C.textPrimary);
  doc.setFontSize(20);
  doc.text('Osiągnięcia', MARGIN + 14, 22);

  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 28, A4_W - MARGIN, 28);

  // Badge grid: 2 columns
  const colW = (CONTENT_W - 6) / 2;
  const badgeH = 30;
  let curY = 38;

  badges.forEach((badge, i) => {
    const col = i % 2;
    const x = MARGIN + col * (colW + 6);

    if (col === 0 && i > 0) {
      curY += badgeH + 6;
    }
    if (curY > A4_H - 40) return;

    drawCard(doc, x, curY, colW, badgeH);

    // Badge emoji (rendered as text — jsPDF cannot render emoji natively,
    // so we skip the emoji and use a colored dot instead)
    const holderIdx = participants.indexOf(badge.holder);
    setFill(doc, holderIdx >= 0 ? personColor(holderIdx) : C.accent);
    doc.circle(x + 10, curY + 15, 4, 'F');

    // Badge name
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.text(truncate(badge.name, 30), x + 18, curY + 12);

    // Holder + description
    setColor(doc, C.textSecondary);
    doc.setFontSize(7);
    doc.text(`${truncate(badge.holder, 20)} — ${truncate(badge.description, 40)}`, x + 18, curY + 20);
  });
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

  // Calculate total pages
  let totalPages = 2; // Cover + Stats always present
  if (hasViralScores) totalPages++;
  if (hasQualitative && qualitative?.pass4) totalPages++;
  if (hasQualitative && qualitative?.pass3) totalPages++;
  if (hasQualitative && qualitative?.pass2) totalPages++;
  if (hasBadges) totalPages++;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let pageNum = 0;

  const report = (label: string) => {
    pageNum++;
    onProgress?.({ current: pageNum, total: totalPages, label });
  };

  // Page 1: Cover
  report('Tworzenie okładki...');
  buildCoverPage(doc, analysis);
  drawFooter(doc, 1, totalPages);

  // Page 2: Key Statistics
  report('Statystyki...');
  doc.addPage();
  buildStatsPage(doc, analysis);
  drawFooter(doc, 2, totalPages);

  let nextPageIdx = 3;

  // Page 3: Viral Scores (optional)
  if (hasViralScores && quantitative.viralScores) {
    report('Viral Scores...');
    doc.addPage();
    buildViralScoresPage(doc, quantitative.viralScores, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 4: Health Score + Findings (optional)
  if (hasQualitative && qualitative?.pass4) {
    report('Health Score...');
    doc.addPage();
    buildHealthFindingsPage(doc, qualitative.pass4);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 5: Personality Profiles (optional)
  if (hasQualitative && qualitative?.pass3) {
    report('Profile osobowości...');
    doc.addPage();
    buildPersonalityPage(doc, qualitative.pass3, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 6: Relationship Dynamics (optional)
  if (hasQualitative && qualitative?.pass2) {
    report('Dynamika relacji...');
    doc.addPage();
    buildDynamicsPage(doc, qualitative.pass2, qualitative?.pass4, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Page 7: Badges (optional)
  if (hasBadges && quantitative.badges) {
    report('Osiągnięcia...');
    doc.addPage();
    buildBadgesPage(doc, quantitative.badges, participants);
    drawFooter(doc, nextPageIdx, totalPages);
    nextPageIdx++;
  }

  // Generate filename
  const titleSlug = conversation.title
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `podtekst-${titleSlug}-${dateStr}.pdf`;

  doc.save(filename);
}
