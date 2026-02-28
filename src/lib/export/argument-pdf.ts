/**
 * Messenger-style PDF export for Argument Simulation transcripts.
 *
 * Dark-themed A4 pages with chat bubbles (left/right aligned),
 * phase dividers, cover page, and post-simulation summary.
 */

import jsPDF from 'jspdf';
import type {
  ArgumentSimulationMessage,
  ArgumentSimulationResult,
} from '@/lib/analysis/types';
import { registerFonts, pdfSafe } from './pdf-fonts';

// ── Color palette ────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  bg: [5, 5, 5] as RGB,
  cardBg: [15, 15, 15] as RGB,
  bubbleLeft: [26, 26, 26] as RGB,
  bubbleRight: [35, 14, 14] as RGB,
  textPrimary: [238, 238, 238] as RGB,
  textSecondary: [136, 136, 136] as RGB,
  textMuted: [85, 85, 85] as RGB,
  senderA: [59, 130, 246] as RGB,
  senderB: [239, 68, 68] as RGB,
  border: [30, 30, 30] as RGB,
  white: [255, 255, 255] as RGB,

  phase: {
    trigger: [245, 158, 11] as RGB,
    escalation: [239, 68, 68] as RGB,
    peak: [220, 38, 38] as RGB,
    deescalation: [16, 185, 129] as RGB,
    aftermath: [107, 114, 128] as RGB,
  } as Record<string, RGB>,

  horseman: {
    criticism: [239, 68, 68] as RGB,
    contempt: [168, 85, 247] as RGB,
    defensiveness: [245, 158, 11] as RGB,
    stonewalling: [107, 114, 128] as RGB,
  } as Record<string, RGB>,

  gradientStart: [239, 68, 68] as RGB,
  gradientEnd: [249, 115, 22] as RGB,
};

// ── Constants ────────────────────────────────────────────────
const A4_W = 210;
const A4_H = 297;
const MARGIN = 16;
const CONTENT_W = A4_W - MARGIN * 2;
const BUBBLE_MAX_W = 120;
const BUBBLE_PAD_X = 5;
const BUBBLE_PAD_Y = 3.5;
const BUBBLE_RADIUS = 4;
const MSG_GAP = 4;
const CHAT_TOP = 28;
const CHAT_BOTTOM = A4_H - 16;

const PHASE_LABELS: Record<string, string> = {
  trigger: 'WYZWALACZ',
  escalation: 'ESKALACJA',
  peak: 'SZCZYT',
  deescalation: 'DEESKALACJA',
  aftermath: 'NASTĘPSTWA',
};

const HORSEMAN_LABELS: Record<string, string> = {
  criticism: 'Krytycyzm',
  contempt: 'Pogarda',
  defensiveness: 'Defensywność',
  stonewalling: 'Wycofanie',
};

// ── Helpers ──────────────────────────────────────────────────

function setColor(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function setFill(doc: jsPDF, rgb: RGB) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDraw(doc: jsPDF, rgb: RGB) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function blendColors(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function drawPageBg(doc: jsPDF) {
  setFill(doc, C.bg);
  doc.rect(0, 0, A4_W, A4_H, 'F');
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  setColor(doc, C.textMuted);
  doc.setFontSize(7);
  doc.setFont('Inter', 'normal');
  doc.text('PodTeksT \u00B7 Symulacja K\u0142\u00F3tni', MARGIN, A4_H - 8);
  doc.text(`${pageNum} / ${totalPages}`, A4_W - MARGIN, A4_H - 8, { align: 'right' });
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

// ── Cover page ───────────────────────────────────────────────

function buildCoverPage(
  doc: jsPDF,
  result: ArgumentSimulationResult,
  participants: string[],
) {
  drawPageBg(doc);

  // Red→Orange gradient header
  const steps = 30;
  const headerH = 90;
  for (let i = 0; i < steps; i++) {
    const c = blendColors(C.gradientStart, C.gradientEnd, i / steps);
    const alpha = 0.8 - (i / steps) * 0.6;
    setFill(doc, [
      Math.round(c[0] * alpha + C.bg[0] * (1 - alpha)),
      Math.round(c[1] * alpha + C.bg[1] * (1 - alpha)),
      Math.round(c[2] * alpha + C.bg[2] * (1 - alpha)),
    ]);
    doc.rect(0, (i * headerH) / steps, A4_W, headerH / steps + 1, 'F');
  }

  // Brand
  setColor(doc, C.white);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(10);
  doc.text('PODTEKST', MARGIN, 20);
  setColor(doc, [100, 100, 100]);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('SYMULACJA K\u0141\u00D3TNI', MARGIN + 33, 20);

  // Title: topic
  setColor(doc, C.white);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(24);
  const topicLines = wrapText(doc, `\u201E${result.topic}\u201D`, CONTENT_W);
  let titleY = 45;
  for (const line of topicLines) {
    doc.text(line, MARGIN, titleY);
    titleY += 10;
  }

  // Participants — VS layout
  const vsY = 110;
  setFill(doc, C.cardBg);
  setDraw(doc, C.border);
  doc.roundedRect(MARGIN, vsY, CONTENT_W, 50, 4, 4, 'FD');

  // Person A (left)
  setFill(doc, C.senderA);
  doc.circle(MARGIN + 16, vsY + 25, 8, 'F');
  setColor(doc, C.white);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(16);
  doc.text(pdfSafe(participants[0]?.charAt(0)?.toUpperCase() ?? 'A'), MARGIN + 16, vsY + 28, {
    align: 'center',
  });
  setColor(doc, C.textPrimary);
  doc.setFontSize(12);
  doc.text(pdfSafe(participants[0] ?? 'Osoba A'), MARGIN + 30, vsY + 28);

  // VS
  setColor(doc, C.gradientStart);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(18);
  doc.text('vs', A4_W / 2, vsY + 28, { align: 'center' });

  // Person B (right side)
  const bNameX = A4_W - MARGIN - 16;
  setFill(doc, C.senderB);
  doc.circle(bNameX, vsY + 25, 8, 'F');
  setColor(doc, C.white);
  doc.setFontSize(16);
  doc.text(pdfSafe(participants[1]?.charAt(0)?.toUpperCase() ?? 'B'), bNameX, vsY + 28, {
    align: 'center',
  });
  setColor(doc, C.textPrimary);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(12);
  doc.text(pdfSafe(participants[1] ?? 'Osoba B'), bNameX - 14, vsY + 28, { align: 'right' });

  // Stats
  const statsY = 180;
  const statItems = [
    { label: 'WIADOMOŚCI', value: String(result.messages.length) },
    { label: 'ESKALATOR', value: pdfSafe(result.summary.escalator) },
    { label: 'DOMINUJĄCY JEŹDZIEC', value: HORSEMAN_LABELS[result.summary.dominantHorseman] ?? result.summary.dominantHorseman },
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
    doc.setFontSize(14);
    doc.text(stat.value, sx, statsY + 10);
  });

  // Phase overview
  const phaseY = 210;
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('PRZEBIEG KONFLIKTU', MARGIN, phaseY);

  // Phase bar
  const phases = ['trigger', 'escalation', 'peak', 'deescalation', 'aftermath'];
  const phaseCounts: Record<string, number> = {};
  for (const msg of result.messages) {
    phaseCounts[msg.phase] = (phaseCounts[msg.phase] ?? 0) + 1;
  }
  const totalMsgs = result.messages.length || 1;
  let barX = MARGIN;
  const barY = phaseY + 5;
  const barH = 6;

  phases.forEach((phase) => {
    const count = phaseCounts[phase] ?? 0;
    const w = (count / totalMsgs) * CONTENT_W;
    if (w > 0) {
      setFill(doc, C.phase[phase] ?? C.textMuted);
      doc.rect(barX, barY, w, barH, 'F');
      barX += w;
    }
  });

  // Phase legend
  const legendY = phaseY + 18;
  let legendX = MARGIN;
  phases.forEach((phase) => {
    setFill(doc, C.phase[phase] ?? C.textMuted);
    doc.circle(legendX + 2, legendY, 1.5, 'F');
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(6);
    const label = PHASE_LABELS[phase] ?? phase;
    doc.text(label, legendX + 5, legendY + 1.5);
    legendX += doc.getTextWidth(label) + 10;
  });

  // Date
  const dateStr = new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(8);
  doc.text(`Wygenerowano: ${dateStr}`, MARGIN, A4_H - 20);
}

// ── Chat pages — Messenger-style bubbles ─────────────────────

function buildChatPages(
  doc: jsPDF,
  messages: ArgumentSimulationMessage[],
  participants: string[],
  startPage: number,
  totalPages: number,
): number {
  let curY = CHAT_TOP;
  let pageNum = startPage;
  let lastPhase = '';

  const newPage = () => {
    doc.addPage();
    drawPageBg(doc);

    // Subtle header line
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 18, A4_W - MARGIN, 18);

    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text('TRANSKRYPT ROZMOWY', MARGIN, 14);
    doc.text(`${pageNum} / ${totalPages}`, A4_W - MARGIN, 14, { align: 'right' });

    curY = CHAT_TOP;
    pageNum++;
  };

  // First chat page
  newPage();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLeft = msg.sender === participants[0];
    const senderColor = isLeft ? C.senderA : C.senderB;
    const bubbleBg = isLeft ? C.bubbleLeft : C.bubbleRight;

    // Phase divider
    if (msg.phase !== lastPhase) {
      const dividerH = 12;
      if (curY + dividerH > CHAT_BOTTOM) newPage();

      const phaseColor = C.phase[msg.phase] ?? C.textMuted;
      const phaseLabel = PHASE_LABELS[msg.phase] ?? msg.phase;

      // Divider line + label
      curY += 4;
      setDraw(doc, C.border);
      doc.setLineWidth(0.2);
      const labelW = 35;
      const lineY = curY + 3;
      doc.line(MARGIN, lineY, A4_W / 2 - labelW / 2 - 2, lineY);
      doc.line(A4_W / 2 + labelW / 2 + 2, lineY, A4_W - MARGIN, lineY);

      setColor(doc, phaseColor);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(6);
      doc.text(phaseLabel, A4_W / 2, curY + 4.5, { align: 'center' });

      // Phase dot
      setFill(doc, phaseColor);
      doc.circle(A4_W / 2 - doc.getTextWidth(phaseLabel) / 2 - 4, curY + 3, 1.5, 'F');

      curY += dividerH;
      lastPhase = msg.phase;
    }

    // Calculate bubble dimensions
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8.5);
    const maxTextW = BUBBLE_MAX_W - BUBBLE_PAD_X * 2;
    const textLines = wrapText(doc, msg.text, maxTextW);

    const senderH = 4;        // sender label height
    const lineH = 4;          // text line height
    const gapAfterSender = 1;
    const bubbleH =
      BUBBLE_PAD_Y +
      senderH +
      gapAfterSender +
      textLines.length * lineH +
      BUBBLE_PAD_Y;

    // Page break check
    if (curY + bubbleH + MSG_GAP > CHAT_BOTTOM) {
      drawFooter(doc, pageNum - 1, totalPages);
      newPage();
    }

    // Calculate bubble width (fit to text, but with min/max)
    doc.setFont('Inter', 'bold');
    doc.setFontSize(6);
    const senderW = doc.getTextWidth(pdfSafe(msg.sender).toUpperCase());
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8.5);
    const maxLineW = Math.max(
      senderW + 4,
      ...textLines.map((l) => doc.getTextWidth(l)),
    );
    const bubbleW = Math.min(BUBBLE_MAX_W, Math.max(35, maxLineW + BUBBLE_PAD_X * 2));

    // Position
    const bubbleX = isLeft ? MARGIN : A4_W - MARGIN - bubbleW;

    // Draw bubble background
    setFill(doc, bubbleBg);
    setDraw(doc, C.border);
    doc.setLineWidth(0.15);

    // Rounded rect with one corner less rounded (like Messenger)
    const tl = isLeft ? 1.5 : BUBBLE_RADIUS;
    const tr = isLeft ? BUBBLE_RADIUS : 1.5;
    doc.roundedRect(bubbleX, curY, bubbleW, bubbleH, tl, tr, 'FD');

    // Sender name
    let textY = curY + BUBBLE_PAD_Y + 3;
    setColor(doc, senderColor);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(6);
    doc.text(
      pdfSafe(msg.sender).toUpperCase(),
      bubbleX + BUBBLE_PAD_X,
      textY,
    );

    // Message text
    textY += senderH + gapAfterSender;
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8.5);
    for (const line of textLines) {
      doc.text(line, bubbleX + BUBBLE_PAD_X, textY);
      textY += lineH;
    }

    curY += bubbleH + MSG_GAP;
  }

  // Footer on last chat page
  drawFooter(doc, pageNum - 1, totalPages);
  return pageNum;
}

// ── Summary page ─────────────────────────────────────────────

function buildSummaryPage(
  doc: jsPDF,
  result: ArgumentSimulationResult,
  participants: string[],
  pageNum: number,
  totalPages: number,
) {
  doc.addPage();
  drawPageBg(doc);

  // Header
  const steps = 20;
  const h = 3;
  const stepW = A4_W / steps;
  for (let i = 0; i < steps; i++) {
    const c = blendColors(C.gradientStart, C.gradientEnd, i / steps);
    setFill(doc, c);
    doc.rect(i * stepW, 0, stepW + 1, h, 'F');
  }

  setColor(doc, C.gradientStart);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(11);
  doc.text('09', MARGIN, 18);
  setColor(doc, C.textPrimary);
  doc.setFontSize(18);
  doc.text('Podsumowanie', MARGIN + 14, 18);
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 23, A4_W - MARGIN, 23);

  let curY = 34;
  const { summary } = result;

  // ── Conflict dynamics card ──
  setFill(doc, C.cardBg);
  setDraw(doc, C.border);
  doc.roundedRect(MARGIN, curY, CONTENT_W, 50, 3, 3, 'FD');

  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('DYNAMIKA KONFLIKTU', MARGIN + 8, curY + 10);

  // Escalator
  setColor(doc, C.senderB);
  doc.setFont('Inter', 'bold');
  doc.setFontSize(8);
  doc.text('Eskalator:', MARGIN + 8, curY + 20);
  setColor(doc, C.textPrimary);
  doc.text(pdfSafe(summary.escalator), MARGIN + 35, curY + 20);

  // De-escalator
  setColor(doc, [16, 185, 129]);
  doc.text('Deeskalacja:', MARGIN + 8, curY + 28);
  setColor(doc, C.textPrimary);
  doc.text(pdfSafe(summary.firstDeescalator), MARGIN + 40, curY + 28);

  // Escalation messages
  setColor(doc, [245, 158, 11]);
  doc.text('Eskalacja:', MARGIN + 8, curY + 36);
  setColor(doc, C.textPrimary);
  doc.text(`${summary.escalationMessageCount} wiadomości`, MARGIN + 35, curY + 36);

  // Pattern description (right side)
  if (summary.patternDescription) {
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    const descLines = wrapText(doc, summary.patternDescription, CONTENT_W / 2 - 10);
    descLines.slice(0, 5).forEach((line, i) => {
      doc.text(line, MARGIN + CONTENT_W / 2, curY + 18 + i * 4);
    });
  }

  curY += 58;

  // ── Gottman Four Horsemen ──
  setFill(doc, C.cardBg);
  setDraw(doc, C.border);
  doc.roundedRect(MARGIN, curY, CONTENT_W, 60, 3, 3, 'FD');

  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('CZTEREJ JEŹDŹCY APOKALIPSY (GOTTMAN)', MARGIN + 8, curY + 10);

  const horsemen = ['criticism', 'contempt', 'defensiveness', 'stonewalling'] as const;
  horsemen.forEach((h, i) => {
    const hy = curY + 20 + i * 10;
    const score = summary.horsemanScores[h] ?? 0;
    const color = C.horseman[h] ?? C.textMuted;
    const isDominant = summary.dominantHorseman === h;

    // Label
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text(HORSEMAN_LABELS[h] ?? h, MARGIN + 8, hy);

    // Dominant badge
    if (isDominant) {
      setColor(doc, color);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(5);
      doc.text('DOMINUJĄCY', MARGIN + 42, hy);
    }

    // Bar background
    const barX = MARGIN + 60;
    const barW = CONTENT_W - 80;
    setFill(doc, C.border);
    doc.roundedRect(barX, hy - 2.5, barW, 3, 1.5, 1.5, 'F');

    // Bar fill
    if (score > 0) {
      setFill(doc, color);
      const fillW = Math.max(3, barW * (score / 100));
      doc.roundedRect(barX, hy - 2.5, fillW, 3, 1.5, 1.5, 'F');
    }

    // Score
    setColor(doc, color);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(String(score), A4_W - MARGIN - 8, hy, { align: 'right' });
  });

  curY += 68;

  // ── Per-person breakdown ──
  setFill(doc, C.cardBg);
  setDraw(doc, C.border);
  const breakdownH = 50;
  doc.roundedRect(MARGIN, curY, CONTENT_W, breakdownH, 3, 3, 'FD');

  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('PROFIL UCZESTNIKÓW', MARGIN + 8, curY + 10);

  const halfW = (CONTENT_W - 16) / 2;
  participants.forEach((name, idx) => {
    const breakdown = summary.personBreakdown?.[name];
    if (!breakdown) return;

    const px = MARGIN + 8 + idx * (halfW + 6);
    const color = idx === 0 ? C.senderA : C.senderB;

    // Avatar circle
    setFill(doc, color);
    doc.circle(px + 4, curY + 20, 4, 'F');
    setColor(doc, C.white);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(pdfSafe(name.charAt(0).toUpperCase()), px + 4, curY + 22, { align: 'center' });

    // Name
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.text(pdfSafe(name), px + 12, curY + 22);

    // Stats
    const stats = [
      { label: 'Wiadomości', value: String(breakdown.messagesCount) },
      { label: 'Śr. długość', value: `${Math.round(breakdown.avgLength)} słów` },
      { label: 'Eskalacja', value: `${breakdown.escalationContribution}%` },
    ];

    stats.forEach((st, si) => {
      const sy = curY + 30 + si * 6;
      setColor(doc, C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(6);
      doc.text(st.label, px + 4, sy);
      setColor(doc, C.textPrimary);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(7);
      doc.text(st.value, px + 30, sy);
    });
  });

  curY += breakdownH + 8;

  // ── Comparison with reality ──
  if (summary.comparisonWithReal) {
    setFill(doc, C.cardBg);
    setDraw(doc, C.border);

    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8);
    const compLines = wrapText(doc, summary.comparisonWithReal, CONTENT_W - 16);
    const compH = 14 + compLines.length * 4;

    if (curY + compH < CHAT_BOTTOM) {
      doc.roundedRect(MARGIN, curY, CONTENT_W, compH, 3, 3, 'FD');

      setColor(doc, C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(7);
      doc.text('PORÓWNANIE Z RZECZYWISTOŚCIĄ', MARGIN + 8, curY + 10);

      setColor(doc, C.textPrimary);
      doc.setFontSize(8);
      compLines.forEach((line, i) => {
        doc.text(line, MARGIN + 8, curY + 18 + i * 4);
      });
    }
  }

  // Disclaimer
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(6);
  doc.text(
    'Tryb rozrywkowy \u2014 symulacja oparta na wzorcach komunikacji, nie stanowi analizy psychologicznej.',
    A4_W / 2,
    A4_H - 20,
    { align: 'center' },
  );

  drawFooter(doc, pageNum, totalPages);
}

// ── Main export ──────────────────────────────────────────────

export async function generateArgumentPdf(
  result: ArgumentSimulationResult,
  participants: string[],
): Promise<void> {
  const { messages } = result;

  // Calculate total pages: 1 cover + N chat pages + 1 summary
  // Estimate chat pages by rough message count (~8 messages/page)
  const estimatedChatPages = Math.max(1, Math.ceil(messages.length / 8));
  const totalPages = 1 + estimatedChatPages + 1;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  registerFonts(doc);

  // Page 1: Cover
  buildCoverPage(doc, result, participants);
  drawFooter(doc, 1, totalPages);

  // Pages 2+: Chat transcript
  const nextPage = buildChatPages(doc, messages, participants, 2, totalPages);

  // Final page: Summary
  buildSummaryPage(doc, result, participants, nextPage, totalPages);

  // Save
  const dateStr = new Date().toISOString().slice(0, 10);
  const topicSlug = result.topic
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);
  doc.save(`podtekst-klotnia-${topicSlug}-${dateStr}.pdf`);
}
