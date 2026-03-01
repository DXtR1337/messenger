/**
 * Discord-style PDF export for Argument Simulation transcripts.
 *
 * Dark-themed A4 pages with left-aligned messages, colored usernames,
 * message grouping, phase dividers, cover page, and N-person summary.
 */

import jsPDF from 'jspdf';
import type {
  ArgumentSimulationMessage,
  ArgumentSimulationResult,
} from '@/lib/analysis/types';
import { ARGUMENT_PERSON_COLORS_RGB } from '@/lib/analysis/constants';
import { registerFonts, pdfSafe } from './pdf-fonts';

// ── Color palette — Discord-inspired ────────────────────────
type RGB = [number, number, number];

const C = {
  bg: [30, 31, 34] as RGB,           // Discord dark bg (#1e1f22)
  chatBg: [49, 51, 56] as RGB,       // Discord chat area (#313338)
  cardBg: [43, 45, 49] as RGB,       // Discord sidebar (#2b2d31)
  textPrimary: [219, 222, 225] as RGB, // Discord text (#dbdee1)
  textSecondary: [148, 155, 164] as RGB,
  textMuted: [94, 103, 114] as RGB,
  border: [60, 63, 68] as RGB,
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
const AVATAR_R = 3;        // Avatar circle radius
const AVATAR_D = AVATAR_R * 2;
const MSG_LEFT = MARGIN + AVATAR_D + 4; // Left edge of message text
const MSG_MAX_W = CONTENT_W - AVATAR_D - 6;
const MSG_GAP = 1.5;       // Gap between grouped messages
const MSG_GROUP_GAP = 4;   // Gap between different senders
const CHAT_TOP = 28;
const CHAT_BOTTOM = A4_H - 16;

const PHASE_LABELS: Record<string, string> = {
  trigger: 'WYZWALACZ',
  escalation: 'ESKALACJA',
  peak: 'SZCZYT',
  deescalation: 'DEESKALACJA',
  aftermath: 'NAST\u0118PSTWA',
};

const HORSEMAN_LABELS: Record<string, string> = {
  criticism: 'Krytycyzm',
  contempt: 'Pogarda',
  defensiveness: 'Defensywno\u015B\u0107',
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

function getPersonColor(participants: string[], name: string): RGB {
  const idx = participants.indexOf(name);
  return ARGUMENT_PERSON_COLORS_RGB[idx >= 0 ? idx % ARGUMENT_PERSON_COLORS_RGB.length : 0];
}

function drawPageBg(doc: jsPDF) {
  setFill(doc, C.bg);
  doc.rect(0, 0, A4_W, A4_H, 'F');
}

function drawChatBg(doc: jsPDF) {
  setFill(doc, C.chatBg);
  doc.rect(MARGIN - 2, CHAT_TOP - 4, CONTENT_W + 4, CHAT_BOTTOM - CHAT_TOP + 4, 'F');
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

  // Participants — roster grid
  const rosterY = 110;
  setFill(doc, C.cardBg);
  setDraw(doc, C.border);
  const avatarSize = 6;
  const avatarGap = 4;
  const nameGap = 3;
  const colW = 55;
  const cols = Math.min(participants.length, 3);
  const rows = Math.ceil(participants.length / cols);
  const rosterH = 16 + rows * 14;
  doc.roundedRect(MARGIN, rosterY, CONTENT_W, rosterH, 4, 4, 'FD');

  // Participant count header
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text(`${participants.length} UCZESTNIK\u00D3W`, MARGIN + 8, rosterY + 10);

  participants.forEach((name, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const px = MARGIN + 8 + col * colW;
    const py = rosterY + 18 + row * 14;
    const personColor = getPersonColor(participants, name);

    // Avatar circle
    setFill(doc, personColor);
    doc.circle(px + avatarSize / 2, py, avatarSize / 2, 'F');
    setColor(doc, C.white);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(6);
    doc.text(pdfSafe(name.charAt(0).toUpperCase()), px + avatarSize / 2, py + 1.5, { align: 'center' });

    // Name
    setColor(doc, personColor);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(pdfSafe(name), px + avatarSize + nameGap, py + 2);
  });

  // Stats
  const statsY = rosterY + rosterH + 16;
  const statItems = [
    { label: 'WIADOMO\u015ACI', value: String(result.messages.length) },
    { label: 'ESKALATOR', value: pdfSafe(result.summary.escalator) },
    { label: 'DOMINUJ\u0104CY JE\u0179DZIEC', value: HORSEMAN_LABELS[result.summary.dominantHorseman] ?? result.summary.dominantHorseman },
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
  const phaseY = statsY + 28;
  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('PRZEBIEG KONFLIKTU', MARGIN, phaseY);

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

// ── Chat pages — Discord-style message list ──────────────────

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
  let lastSender = '';

  const newPage = () => {
    doc.addPage();
    drawPageBg(doc);
    drawChatBg(doc);

    // Subtle header
    setColor(doc, C.textMuted);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text('TRANSKRYPT ROZMOWY', MARGIN, 14);
    doc.text(`${pageNum} / ${totalPages}`, A4_W - MARGIN, 14, { align: 'right' });

    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 18, A4_W - MARGIN, 18);

    curY = CHAT_TOP;
    lastSender = ''; // Reset grouping on new page
    pageNum++;
  };

  // First chat page
  newPage();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const senderColor = getPersonColor(participants, msg.sender);
    const isGrouped = msg.sender === lastSender && msg.phase === lastPhase;

    // Phase divider
    if (msg.phase !== lastPhase) {
      const dividerH = 10;
      if (curY + dividerH > CHAT_BOTTOM) {
        drawFooter(doc, pageNum - 1, totalPages);
        newPage();
      }

      const phaseColor = C.phase[msg.phase] ?? C.textMuted;
      const phaseLabel = PHASE_LABELS[msg.phase] ?? msg.phase;

      // Discord-style date separator
      curY += 3;
      setDraw(doc, C.border);
      doc.setLineWidth(0.2);
      const labelW = doc.getTextWidth(phaseLabel) + 10;
      const lineY = curY + 3;
      doc.line(MARGIN, lineY, A4_W / 2 - labelW / 2, lineY);
      doc.line(A4_W / 2 + labelW / 2, lineY, A4_W - MARGIN, lineY);

      setColor(doc, phaseColor);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(6);
      doc.text(phaseLabel, A4_W / 2, curY + 4.5, { align: 'center' });

      curY += dividerH;
      lastPhase = msg.phase;
      lastSender = ''; // Force showing avatar after phase change
    }

    // Calculate message height
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8.5);
    const textLines = wrapText(doc, msg.text, MSG_MAX_W);
    const lineH = 4;
    const senderH = isGrouped ? 0 : 5; // No sender line for grouped messages
    const msgH = senderH + textLines.length * lineH;

    // Page break check
    const gapBefore = isGrouped ? MSG_GAP : MSG_GROUP_GAP;
    if (curY + msgH + gapBefore > CHAT_BOTTOM) {
      drawFooter(doc, pageNum - 1, totalPages);
      newPage();
    }

    curY += gapBefore;

    if (!isGrouped) {
      // Draw avatar circle
      setFill(doc, senderColor);
      doc.circle(MARGIN + AVATAR_R, curY + AVATAR_R, AVATAR_R, 'F');
      setColor(doc, C.white);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(5.5);
      doc.text(
        pdfSafe(msg.sender.charAt(0).toUpperCase()),
        MARGIN + AVATAR_R,
        curY + AVATAR_R + 1.5,
        { align: 'center' },
      );

      // Sender name (colored)
      setColor(doc, senderColor);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(7.5);
      doc.text(pdfSafe(msg.sender), MSG_LEFT, curY + 4);

      // Phase badge (small, right of name)
      const nameW = doc.getTextWidth(pdfSafe(msg.sender));
      setColor(doc, C.phase[msg.phase] ?? C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(5);
      doc.text(
        PHASE_LABELS[msg.phase] ?? msg.phase,
        MSG_LEFT + nameW + 3,
        curY + 4,
      );

      curY += senderH;
    }

    // Message text
    setColor(doc, C.textPrimary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8.5);
    for (const line of textLines) {
      doc.text(line, MSG_LEFT, curY + 3);
      curY += lineH;
    }

    lastSender = msg.sender;
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

  // Header gradient bar
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
  setColor(doc, C.gradientStart);
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
  doc.text(`${summary.escalationMessageCount} wiadomo\u015Bci`, MARGIN + 35, curY + 36);

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
  doc.text('CZTEREJ JE\u0179D\u0179CY APOKALIPSY (GOTTMAN)', MARGIN + 8, curY + 10);

  const horsemen = ['criticism', 'contempt', 'defensiveness', 'stonewalling'] as const;
  horsemen.forEach((hm, i) => {
    const hy = curY + 20 + i * 10;
    const score = summary.horsemanScores[hm] ?? 0;
    const color = C.horseman[hm] ?? C.textMuted;
    const isDominant = summary.dominantHorseman === hm;

    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.text(HORSEMAN_LABELS[hm] ?? hm, MARGIN + 8, hy);

    if (isDominant) {
      setColor(doc, color);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(5);
      doc.text('DOMINUJ\u0104CY', MARGIN + 42, hy);
    }

    const barStartX = MARGIN + 60;
    const barW = CONTENT_W - 80;
    setFill(doc, C.border);
    doc.roundedRect(barStartX, hy - 2.5, barW, 3, 1.5, 1.5, 'F');

    if (score > 0) {
      setFill(doc, color);
      const fillW = Math.max(3, barW * (score / 100));
      doc.roundedRect(barStartX, hy - 2.5, fillW, 3, 1.5, 1.5, 'F');
    }

    setColor(doc, color);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(String(score), A4_W - MARGIN - 8, hy, { align: 'right' });
  });

  curY += 68;

  // ── Per-person breakdown — dynamic N-person grid ──
  const cols = Math.min(participants.length, 3);
  const rowsNeeded = Math.ceil(participants.length / cols);
  const personCardH = 38;
  const breakdownH = 14 + rowsNeeded * (personCardH + 4);

  // Check if we need a new page
  if (curY + breakdownH > CHAT_BOTTOM) {
    drawFooter(doc, pageNum, totalPages);
    doc.addPage();
    drawPageBg(doc);
    curY = 30;
    pageNum++;
  }

  setFill(doc, C.cardBg);
  setDraw(doc, C.border);
  doc.roundedRect(MARGIN, curY, CONTENT_W, breakdownH, 3, 3, 'FD');

  setColor(doc, C.textMuted);
  doc.setFont('Inter', 'normal');
  doc.setFontSize(7);
  doc.text('PROFIL UCZESTNIK\u00D3W', MARGIN + 8, curY + 10);

  const colW = (CONTENT_W - 16) / cols;
  participants.forEach((name, idx) => {
    const breakdown = summary.personBreakdown?.[name];
    if (!breakdown) return;

    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const px = MARGIN + 8 + col * colW;
    const py = curY + 16 + row * (personCardH + 4);
    const personColor = getPersonColor(participants, name);

    // Avatar circle
    setFill(doc, personColor);
    doc.circle(px + 4, py + 4, 4, 'F');
    setColor(doc, C.white);
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.text(pdfSafe(name.charAt(0).toUpperCase()), px + 4, py + 6, { align: 'center' });

    // Name (colored)
    setColor(doc, personColor);
    doc.setFontSize(9);
    doc.text(pdfSafe(name), px + 12, py + 6);

    // Stats
    const stats = [
      { label: 'Wiadomo\u015Bci', value: String(breakdown.messagesCount) },
      { label: '\u015Ar. d\u0142ugo\u015B\u0107', value: `${Math.round(breakdown.avgLength)} s\u0142\u00F3w` },
      { label: 'Eskalacja', value: `${breakdown.escalationContribution}%` },
    ];

    stats.forEach((st, si) => {
      const sy = py + 14 + si * 6;
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
    setColor(doc, C.textSecondary);
    doc.setFont('Inter', 'normal');
    doc.setFontSize(8);
    const compLines = wrapText(doc, summary.comparisonWithReal, CONTENT_W - 16);
    const compH = 14 + compLines.length * 4;

    if (curY + compH < CHAT_BOTTOM) {
      setFill(doc, C.cardBg);
      setDraw(doc, C.border);
      doc.roundedRect(MARGIN, curY, CONTENT_W, compH, 3, 3, 'FD');

      setColor(doc, C.textMuted);
      doc.setFont('Inter', 'normal');
      doc.setFontSize(7);
      doc.text('POR\u00D3WNANIE Z RZECZYWISTO\u015ACI\u0104', MARGIN + 8, curY + 10);

      setColor(doc, C.textPrimary);
      doc.setFontSize(8);
      compLines.forEach((line, li) => {
        doc.text(line, MARGIN + 8, curY + 18 + li * 4);
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

  // Estimate: Discord-style messages are more compact (~12/page with grouping)
  const estimatedChatPages = Math.max(1, Math.ceil(messages.length / 12));
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
