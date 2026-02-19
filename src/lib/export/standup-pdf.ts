/**
 * Stand-Up Comedy Roast PDF generator for PodTeksT.
 * Generates a multi-page dark-themed PDF with colored act pages,
 * bold typography, and stand-up comedy punchlines.
 */

import jsPDF from 'jspdf';
import type { StandUpRoastResult, StandUpAct } from '@/lib/analysis/types';

type RGB = [number, number, number];

const A4_W = 210;
const A4_H = 297;
const MARGIN = 20;
const CONTENT_W = A4_W - MARGIN * 2;

const DEFAULT_GRADIENT: [string, string] = ['#1a0a2e', '#302b63'];

/** jsPDF can't render emoji — strip to text-safe label */
function stripEmoji(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]/gu, '').trim();
}

/** Validate and sanitize a StandUpRoastResult from Gemini */
function sanitizeResult(raw: StandUpRoastResult): StandUpRoastResult {
  return {
    showTitle: raw.showTitle || 'Stand-Up Roast',
    closingLine: raw.closingLine || '',
    audienceRating: raw.audienceRating || '',
    acts: Array.isArray(raw.acts)
      ? raw.acts.map((act, idx) => ({
          number: act.number ?? idx + 1,
          title: act.title || `Akt ${idx + 1}`,
          emoji: act.emoji || '',
          lines: Array.isArray(act.lines) ? act.lines : [],
          callback: act.callback ?? undefined,
          gradientColors: (
            Array.isArray(act.gradientColors) &&
            act.gradientColors.length >= 2 &&
            typeof act.gradientColors[0] === 'string' &&
            act.gradientColors[0].startsWith('#')
          ) ? act.gradientColors : DEFAULT_GRADIENT,
        }))
      : [],
  };
}

function hexToRGB(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function blendColors(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function drawGradientBg(doc: jsPDF, color1: RGB, color2: RGB): void {
  const steps = 40;
  const stripH = A4_H / steps;
  for (let i = 0; i < steps; i++) {
    const c = blendColors(color1, color2, i / steps);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(0, i * stripH, A4_W, stripH + 1, 'F');
  }
}

function drawFooter(doc: jsPDF): void {
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('PodTeksT \u00B7 podtekst.app', MARGIN, A4_H - 10);
}

export interface StandUpPdfProgress {
  stage: string;
  percent: number;
}

export function generateStandUpPdf(
  rawResult: StandUpRoastResult,
  conversationTitle: string,
  onProgress?: (progress: StandUpPdfProgress) => void,
): Blob {
  const result = sanitizeResult(rawResult);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Cover Page ──
  onProgress?.({ stage: 'Ok\u0142adka...', percent: 5 });
  drawGradientBg(doc, [15, 5, 30], [48, 43, 99]);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('STAND-UP ROAST', A4_W / 2, 80, { align: 'center' });

  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(stripEmoji(result.showTitle), CONTENT_W);
  doc.text(titleLines, A4_W / 2, 105, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text(stripEmoji(conversationTitle), A4_W / 2, 140, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  const punchlineCount = result.acts.reduce((s: number, a: StandUpAct) => s + a.lines.length, 0);
  doc.text(
    `${result.acts.length} aktow  |  ${punchlineCount} punchlineow`,
    A4_W / 2,
    155,
    { align: 'center' },
  );

  drawFooter(doc);

  // ── Act Pages ──
  result.acts.forEach((act, idx) => {
    onProgress?.({
      stage: `Akt ${act.number}...`,
      percent: 10 + (idx / result.acts.length) * 75,
    });
    doc.addPage();

    const c1 = hexToRGB(act.gradientColors[0]);
    const c2 = hexToRGB(act.gradientColors[1]);
    drawGradientBg(doc, c1, c2);

    // Act number
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`AKT ${act.number}`, MARGIN, 30);

    // Act title
    doc.setFontSize(24);
    const actTitleLines = doc.splitTextToSize(stripEmoji(act.title), CONTENT_W - 10);
    doc.text(actTitleLines, MARGIN, 55);

    // Divider line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    const titleBottom = 55 + actTitleLines.length * 10;
    doc.line(MARGIN, titleBottom, MARGIN + 40, titleBottom);

    // Punchlines
    doc.setFontSize(11);
    let y = titleBottom + 12;
    for (const line of act.lines) {
      doc.setTextColor(255, 255, 255);
      const wrapped = doc.splitTextToSize(`>  ${stripEmoji(line)}`, CONTENT_W - 10);
      if (y + wrapped.length * 6 > A4_H - 30) break;
      doc.text(wrapped, MARGIN + 5, y);
      y += wrapped.length * 6 + 8;
    }

    // Callback reference
    if (act.callback) {
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      const callbackLines = doc.splitTextToSize(`<< ${stripEmoji(act.callback)}`, CONTENT_W - 20);
      doc.text(callbackLines, MARGIN + 10, y + 5);
    }

    drawFooter(doc);
  });

  // ── Closing Page ──
  onProgress?.({ stage: 'Fina\u0142...', percent: 90 });
  doc.addPage();
  drawGradientBg(doc, [26, 10, 46], [15, 52, 96]);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('KONIEC SHOW', A4_W / 2, 80, { align: 'center' });

  doc.setFontSize(16);
  const closingLines = doc.splitTextToSize(stripEmoji(result.closingLine), CONTENT_W - 20);
  doc.text(closingLines, A4_W / 2, 110, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text(
    `Ocena publicznosci: ${stripEmoji(result.audienceRating)}`,
    A4_W / 2,
    150,
    { align: 'center' },
  );

  doc.setFontSize(24);
  doc.text('* * *', A4_W / 2, 180, { align: 'center' });

  drawFooter(doc);

  onProgress?.({ stage: 'Gotowe!', percent: 100 });
  return doc.output('blob');
}
