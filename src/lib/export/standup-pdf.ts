/**
 * Ultra-Premium Stand-Up Comedy Roast PDF Generator for PodTeksT (Faza 24).
 *
 * 14-page premium PDF with:
 * - Photo backgrounds (when available) with vector overlays
 * - Vector illustrations (microphone, spotlight, curtains, ghosts, etc.)
 * - Data from qualitative analysis (pass1-4), roast, and viral scores
 * - Theatrical stand-up comedy aesthetic
 */

import jsPDF from 'jspdf';
import type { StoredAnalysis, StandUpRoastResult, StandUpAct } from '@/lib/analysis/types';
import { registerFonts, pdfSafe } from './pdf-fonts';

// ═══════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════

type RGB = [number, number, number];

const A4_W = 210;
const A4_H = 297;
const MARGIN = 18;
const CONTENT_W = A4_W - MARGIN * 2;
const DEFAULT_GRADIENT: [string, string] = ['#1a0a2e', '#302b63'];

/** Stand-Up Comedy color palette */
const SC = {
  stageBlack: [8, 5, 12] as RGB,
  curtainRed: [139, 0, 0] as RGB,
  curtainDark: [80, 0, 0] as RGB,
  spotlight: [255, 230, 150] as RGB,
  gold: [255, 193, 7] as RGB,
  goldDark: [180, 130, 5] as RGB,
  neonPink: [255, 20, 147] as RGB,
  neonBlue: [0, 195, 255] as RGB,
  comedyRed: [220, 40, 40] as RGB,
  cream: [255, 248, 230] as RGB,
  dimWhite: [180, 175, 170] as RGB,
  mutedGold: [180, 150, 80] as RGB,
  purple: [168, 85, 247] as RGB,
  deepPurple: [80, 20, 120] as RGB,
  manila: [240, 220, 180] as RGB,
  white: [255, 255, 255] as RGB,
  greenBright: [16, 185, 129] as RGB,
  redBright: [239, 68, 68] as RGB,
};

/** Photo keys for optional image backgrounds */
export const PHOTO_KEYS = {
  cover: 'cover',
  curtains: 'curtains',
  microphone: 'microphone',
  silhouette: 'silhouette',
  smartphone: 'smartphone',
  emoji: 'emoji',
  hourglass: 'hourglass',
  cracked: 'cracked',
  spotlightImg: 'spotlight',
  dashboard: 'dashboard',
  waveform: 'waveform',
  neon: 'neon',
} as const;

export interface StandUpPdfProgress {
  stage: string;
  percent: number;
}

/** Optional pre-loaded images: key -> data URL */
export type PdfImages = Record<string, string>;

// ═══════════════════════════════════════════════════════════
// TRANSLATION HELPER (English AI values → Polish labels)
// ═══════════════════════════════════════════════════════════

const TRANSLATE: Record<string, string> = {
  // Attachment styles
  secure: 'Bezpieczny',
  anxious: 'Lękowy',
  avoidant: 'Unikający',
  disorganized: 'Zdezorganizowany',
  insufficient_data: 'Brak danych',
  // Love languages
  words_of_affirmation: 'Słowa uznania',
  'words of affirmation': 'Słowa uznania',
  quality_time: 'Wspólny czas',
  'quality time': 'Wspólny czas',
  acts_of_service: 'Akty służby',
  'acts of service': 'Akty służby',
  gifts_pebbling: 'Prezenty',
  'gifts pebbling': 'Prezenty',
  physical_touch: 'Dotyk fizyczny',
  'physical touch': 'Dotyk fizyczny',
  // Communication styles
  direct: 'Bezpośredni',
  indirect: 'Pośredni',
  mixed: 'Mieszany',
  // Communication needs
  affirmation: 'Potwierdzenie',
  space: 'Przestrzeń',
  consistency: 'Stałość',
  spontaneity: 'Spontaniczność',
  depth: 'Głębia',
  humor: 'Humor',
  control: 'Kontrola',
  freedom: 'Wolność',
};

function tr(val: string): string {
  const lower = val.toLowerCase().trim();
  return TRANSLATE[lower] ?? TRANSLATE[val] ?? val;
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

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
  const steps = 50;
  const stripH = A4_H / steps;
  for (let i = 0; i < steps; i++) {
    const c = blendColors(color1, color2, i / steps);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(0, i * stripH, A4_W, stripH + 1, 'F');
  }
}

/** Draw page background: gradient + optional photo overlay */
function drawPageBg(doc: jsPDF, c1: RGB, c2: RGB, imgKey?: string, images?: PdfImages): void {
  drawGradientBg(doc, c1, c2);
  const img = imgKey && images?.[imgKey];
  if (img) {
    try {
      doc.addImage(img, 'JPEG', 0, 0, A4_W, A4_H);
      withOpacity(doc, 0.45, () => {
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, A4_W, A4_H, 'F');
      });
    } catch {
      /* fallback to gradient only */
    }
  }
}

/** Draw a filled polygon from absolute points */
function poly(doc: jsPDF, pts: number[][], style: string): void {
  if (pts.length < 2) return;
  const segs: number[][] = [];
  for (let i = 1; i < pts.length; i++) {
    segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  }
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], style, true);
}

/** GState opacity wrapper with safe fallback */
function withOpacity(doc: jsPDF, opacity: number, fn: () => void): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GStateCtor = (doc as any).GState;
  if (typeof GStateCtor !== 'function') {
    fn();
    return;
  }
  doc.saveGraphicsState();
  try {
    doc.setGState(new GStateCtor({ opacity }));
  } catch {
    /* GState not available, continue without opacity */
  }
  fn();
  doc.restoreGraphicsState();
}

function fill(doc: jsPDF, c: RGB): void {
  doc.setFillColor(c[0], c[1], c[2]);
}
function stroke(doc: jsPDF, c: RGB): void {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function textC(doc: jsPDF, c: RGB): void {
  doc.setTextColor(c[0], c[1], c[2]);
}
function toBold(doc: jsPDF): void {
  doc.setFont('Inter', 'bold');
}
function toNormal(doc: jsPDF): void {
  doc.setFont('Inter', 'normal');
}

function drawFooter(doc: jsPDF): void {
  toNormal(doc);
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('PodTeksT \u00B7 podtekst.app', MARGIN, A4_H - 8);
  doc.text('Stand-Up Comedy Roast \u00B7 AI-Generated', A4_W - MARGIN, A4_H - 8, {
    align: 'right',
  });
}

function drawDivider(doc: jsPDF, y: number, x1 = MARGIN, x2 = A4_W - MARGIN): void {
  stroke(doc, SC.mutedGold);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  bgColor: RGB,
  borderColor: RGB,
): void {
  fill(doc, bgColor);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  stroke(doc, borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');
}

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  c: RGB,
): void {
  fill(doc, [30, 30, 40]);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  const fillW = Math.max(h, w * Math.min(1, value / 100));
  fill(doc, c);
  doc.roundedRect(x, y, fillW, h, h / 2, h / 2, 'F');
}

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
          gradientColors:
            Array.isArray(act.gradientColors) &&
            act.gradientColors.length >= 2 &&
            typeof act.gradientColors[0] === 'string' &&
            act.gradientColors[0].startsWith('#')
              ? act.gradientColors
              : DEFAULT_GRADIENT,
        }))
      : [],
  };
}

function formatTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

// ═══════════════════════════════════════════════════════════
// VECTOR PRIMITIVES
// ═══════════════════════════════════════════════════════════

function drawMicrophone(doc: jsPDF, x: number, y: number, s: number, c: RGB): void {
  fill(doc, c);
  doc.circle(x, y, 5 * s, 'F');
  stroke(doc, SC.white);
  doc.setLineWidth(0.15 * s);
  for (let i = -3; i <= 3; i += 1.5) {
    const dy = i * s;
    const r = 5 * s;
    const hw = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (hw > 0.5) doc.line(x - hw, y + dy, x + hw, y + dy);
  }
  fill(doc, c);
  doc.rect(x - 1.2 * s, y + 5 * s, 2.4 * s, 5 * s, 'F');
  stroke(doc, c);
  doc.setLineWidth(0.4 * s);
  doc.line(x, y + 10 * s, x, y + 16 * s);
  fill(doc, c);
  doc.triangle(
    x - 4 * s,
    y + 17.5 * s,
    x + 4 * s,
    y + 17.5 * s,
    x,
    y + 16 * s,
    'F',
  );
}

function drawSpotlight(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  c: RGB,
  opacity: number,
): void {
  withOpacity(doc, opacity, () => {
    fill(doc, c);
    doc.triangle(x, y, x - w / 2, y + h, x + w / 2, y + h, 'F');
  });
}

function drawStar(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  pts: number,
  c: RGB,
): void {
  fill(doc, c);
  const points: number[][] = [];
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i * Math.PI) / pts - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  poly(doc, points, 'F');
}

function drawCurtain(doc: jsPDF, side: 'left' | 'right'): void {
  const w = 30;
  const x = side === 'left' ? 0 : A4_W - w;
  fill(doc, SC.curtainRed);
  doc.rect(x, 0, w, A4_H, 'F');
  fill(doc, SC.curtainDark);
  for (let i = 0; i < 3; i++) {
    const offset = side === 'left' ? 5 + i * 9 : w - 8 - i * 9;
    doc.rect(x + offset, 0, 2, A4_H, 'F');
  }
  fill(doc, SC.gold);
  const tieX = side === 'left' ? x + w - 2 : x + 2;
  doc.circle(tieX, 50, 2.5, 'F');
  fill(doc, SC.goldDark);
  const vx = side === 'left' ? x - 2 : x - 3;
  doc.triangle(vx, 0, vx + w + 5, 0, vx + (w + 5) / 2, 10, 'F');
}

function drawPersonSilhouette(
  doc: jsPDF,
  x: number,
  y: number,
  s: number,
  c: RGB,
): void {
  fill(doc, c);
  doc.circle(x, y, 3.5 * s, 'F');
  doc.ellipse(x, y + 6.5 * s, 6 * s, 4 * s, 'F');
}

function drawGhostShape(
  doc: jsPDF,
  x: number,
  y: number,
  s: number,
  c: RGB,
): void {
  fill(doc, c);
  doc.circle(x, y, 5 * s, 'F');
  doc.rect(x - 5 * s, y, 10 * s, 9 * s, 'F');
  fill(doc, SC.stageBlack);
  const bw = (10 * s) / 3;
  for (let i = 0; i < 3; i++) {
    const bx = x - 5 * s + i * bw + bw / 2;
    doc.triangle(
      bx - bw / 2,
      y + 9 * s,
      bx + bw / 2,
      y + 9 * s,
      bx,
      y + 9 * s + 2.5 * s,
      'F',
    );
  }
  fill(doc, [20, 15, 35]);
  doc.circle(x - 1.8 * s, y - 0.5 * s, 1.2 * s, 'F');
  doc.circle(x + 1.8 * s, y - 0.5 * s, 1.2 * s, 'F');
  fill(doc, SC.white);
  doc.circle(x - 1.5 * s, y - 0.7 * s, 0.5 * s, 'F');
  doc.circle(x + 2.1 * s, y - 0.7 * s, 0.5 * s, 'F');
  fill(doc, [20, 15, 35]);
  doc.ellipse(x, y + 2 * s, 1.5 * s, 0.8 * s, 'F');
}

function drawHeart(doc: jsPDF, cx: number, cy: number, s: number, c: RGB): void {
  fill(doc, c);
  const r = s * 0.3;
  doc.circle(cx - r, cy - r * 0.5, r, 'F');
  doc.circle(cx + r, cy - r * 0.5, r, 'F');
  poly(
    doc,
    [
      [cx - s * 0.58, cy - s * 0.05],
      [cx + s * 0.58, cy - s * 0.05],
      [cx, cy + s * 0.7],
    ],
    'F',
  );
}

function drawBrokenHeart(
  doc: jsPDF,
  cx: number,
  cy: number,
  s: number,
  c: RGB,
): void {
  drawHeart(doc, cx, cy, s, c);
  stroke(doc, SC.stageBlack);
  doc.setLineWidth(0.5);
  const crack = [
    [cx, cy - s * 0.3],
    [cx + s * 0.12, cy],
    [cx - s * 0.08, cy + s * 0.2],
    [cx + s * 0.06, cy + s * 0.45],
    [cx, cy + s * 0.65],
  ];
  for (let i = 0; i < crack.length - 1; i++) {
    doc.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1]);
  }
}

function drawFireFlame(
  doc: jsPDF,
  x: number,
  y: number,
  s: number,
  c1: RGB,
  c2: RGB,
): void {
  fill(doc, c1);
  poly(
    doc,
    [
      [x, y - 4 * s],
      [x + 2.5 * s, y],
      [x + 2 * s, y + 3 * s],
      [x, y + 4 * s],
      [x - 2 * s, y + 3 * s],
      [x - 2.5 * s, y],
    ],
    'F',
  );
  fill(doc, c2);
  poly(
    doc,
    [
      [x, y - 1.5 * s],
      [x + 1.2 * s, y + 0.5 * s],
      [x + 0.8 * s, y + 2.5 * s],
      [x, y + 3 * s],
      [x - 0.8 * s, y + 2.5 * s],
      [x - 1.2 * s, y + 0.5 * s],
    ],
    'F',
  );
}

function drawCrown(doc: jsPDF, x: number, y: number, s: number, c: RGB): void {
  fill(doc, c);
  doc.rect(x - 4 * s, y + 2 * s, 8 * s, 2.5 * s, 'F');
  doc.triangle(
    x - 4 * s, y + 2 * s,
    x - 1.5 * s, y + 2 * s,
    x - 2.8 * s, y - 2 * s,
    'F',
  );
  doc.triangle(
    x - 1.5 * s, y + 2 * s,
    x + 1.5 * s, y + 2 * s,
    x, y - 3 * s,
    'F',
  );
  doc.triangle(
    x + 1.5 * s, y + 2 * s,
    x + 4 * s, y + 2 * s,
    x + 2.8 * s, y - 2 * s,
    'F',
  );
  fill(doc, SC.comedyRed);
  doc.circle(x - 2.8 * s, y - 0.5 * s, 0.6 * s, 'F');
  doc.circle(x, y - 1.5 * s, 0.6 * s, 'F');
  doc.circle(x + 2.8 * s, y - 0.5 * s, 0.6 * s, 'F');
}

function drawGavel(doc: jsPDF, x: number, y: number, s: number, c: RGB): void {
  fill(doc, c);
  const angle = Math.PI / 4;
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const hw = 0.8 * s;
  const hl = 7 * s;
  poly(doc, [
    [x - cs * hl / 2 - sn * hw, y - sn * hl / 2 + cs * hw],
    [x - cs * hl / 2 + sn * hw, y - sn * hl / 2 - cs * hw],
    [x + cs * hl / 2 + sn * hw, y + sn * hl / 2 - cs * hw],
    [x + cs * hl / 2 - sn * hw, y + sn * hl / 2 + cs * hw],
  ], 'F');
  const hAngle = angle + Math.PI / 2;
  const hcs = Math.cos(hAngle);
  const hsn = Math.sin(hAngle);
  const headW = 1.5 * s;
  const headL = 4 * s;
  const hx = x + cs * hl * 0.3;
  const hy = y + sn * hl * 0.3;
  poly(doc, [
    [hx - hcs * headL / 2 - hsn * headW, hy - hsn * headL / 2 + hcs * headW],
    [hx - hcs * headL / 2 + hsn * headW, hy - hsn * headL / 2 - hcs * headW],
    [hx + hcs * headL / 2 + hsn * headW, hy + hsn * headL / 2 - hcs * headW],
    [hx + hcs * headL / 2 - hsn * headW, hy + hsn * headL / 2 + hcs * headW],
  ], 'F');
  fill(doc, [80, 60, 40]);
  doc.roundedRect(x + 3 * s, y + 5 * s, 4 * s, 1.5 * s, 0.5, 0.5, 'F');
}

function drawClock(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  h: number,
  m: number,
  c: RGB,
): void {
  stroke(doc, c);
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'S');
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12 - Math.PI / 2;
    doc.line(
      cx + Math.cos(a) * r * 0.85,
      cy + Math.sin(a) * r * 0.85,
      cx + Math.cos(a) * r * 0.95,
      cy + Math.sin(a) * r * 0.95,
    );
  }
  const ha = ((h % 12) + m / 60) * ((Math.PI * 2) / 12) - Math.PI / 2;
  doc.setLineWidth(0.6);
  doc.line(cx, cy, cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5);
  const ma = (m / 60) * Math.PI * 2 - Math.PI / 2;
  doc.setLineWidth(0.3);
  doc.line(cx, cy, cx + Math.cos(ma) * r * 0.7, cy + Math.sin(ma) * r * 0.7);
  fill(doc, c);
  doc.circle(cx, cy, 0.5, 'F');
}

function drawMeter(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  value: number,
  cLow: RGB,
  cHigh: RGB,
): void {
  const segments = 24;
  doc.setLineWidth(3);
  for (let i = 0; i < segments; i++) {
    const a1 = Math.PI + (i / segments) * Math.PI;
    const a2 = Math.PI + ((i + 1) / segments) * Math.PI;
    const c = blendColors(cLow, cHigh, i / segments);
    stroke(doc, c);
    doc.line(
      cx + Math.cos(a1) * r,
      cy + Math.sin(a1) * r,
      cx + Math.cos(a2) * r,
      cy + Math.sin(a2) * r,
    );
  }
  const needleAngle = Math.PI + (value / 100) * Math.PI;
  stroke(doc, SC.white);
  doc.setLineWidth(0.8);
  doc.line(
    cx,
    cy,
    cx + Math.cos(needleAngle) * r * 0.85,
    cy + Math.sin(needleAngle) * r * 0.85,
  );
  fill(doc, SC.white);
  doc.circle(cx, cy, 1.5, 'F');
  toBold(doc);
  doc.setFontSize(20);
  textC(doc, SC.white);
  doc.text(`${Math.round(value)}`, cx, cy + r * 0.45, { align: 'center' });
}

function drawStage(doc: jsPDF, y: number): void {
  fill(doc, [25, 18, 35]);
  poly(doc, [
    [10, y],
    [A4_W - 10, y],
    [A4_W - 25, y + 20],
    [25, y + 20],
  ], 'F');
  stroke(doc, SC.mutedGold);
  doc.setLineWidth(0.5);
  doc.line(10, y, A4_W - 10, y);
}

function drawAudienceSilhouettes(doc: jsPDF, y: number, count: number): void {
  const spacing = (A4_W - 40) / count;
  for (let i = 0; i < count; i++) {
    const x = 20 + spacing * i + spacing / 2;
    const variation = (i * 37) % 7;
    const shade: RGB = [20 + variation * 3, 15 + variation * 2, 25 + variation * 3];
    fill(doc, shade);
    doc.circle(x, y, 3 + (variation % 3) * 0.3, 'F');
    doc.ellipse(x, y + 5, 4.5, 3, 'F');
  }
}

function drawRedFlagIcon(doc: jsPDF, x: number, y: number, s: number): void {
  stroke(doc, SC.dimWhite);
  doc.setLineWidth(0.4 * s);
  doc.line(x, y, x, y + 8 * s);
  fill(doc, SC.comedyRed);
  poly(doc, [
    [x, y],
    [x + 5 * s, y + 1.5 * s],
    [x, y + 3 * s],
  ], 'F');
}

function drawMagnifyingGlass(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  c: RGB,
): void {
  stroke(doc, c);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, r, 'S');
  const angle = Math.PI / 4;
  doc.setLineWidth(1);
  doc.line(
    cx + Math.cos(angle) * r,
    cy + Math.sin(angle) * r,
    cx + Math.cos(angle) * (r + 4),
    cy + Math.sin(angle) * (r + 4),
  );
}

// ═══════════════════════════════════════════════════════════
// ACT HELPERS
// ═══════════════════════════════════════════════════════════

function drawActIcon(
  doc: jsPDF,
  actNum: number,
  x: number,
  y: number,
  c: RGB,
): void {
  switch (actNum) {
    case 1:
      drawMicrophone(doc, x, y, 0.9, c);
      break;
    case 2:
      drawCrown(doc, x, y, 1.2, c);
      break;
    case 3:
      drawClock(doc, x, y, 6, 3, 17, c);
      break;
    case 4:
      drawMagnifyingGlass(doc, x, y, 5, c);
      break;
    case 5:
      drawGavel(doc, x, y, 1, c);
      break;
    case 6:
      drawRedFlagIcon(doc, x, y, 1);
      break;
    case 7:
      drawFireFlame(doc, x, y, 1.5, SC.gold, SC.comedyRed);
      break;
    default:
      drawStar(doc, x, y, 5, 2.5, 5, SC.gold);
      break;
  }
}

function getActInsight(actNum: number, analysis: StoredAnalysis): string | null {
  const p1 = analysis.qualitative?.pass1;
  const p2 = analysis.qualitative?.pass2;
  const quant = analysis.quantitative;
  const names = analysis.conversation.participants.map((p) => p.name);

  switch (actNum) {
    case 1: {
      if (!p1) return null;
      return `Relacja: ${p1.relationship_type.category} | Energia: ${p1.overall_dynamic.energy} | Trajektoria: ${p1.overall_dynamic.trajectory}`;
    }
    case 2: {
      if (!p2) return null;
      const balance = p2.power_dynamics.balance_score;
      const who = p2.power_dynamics.who_adapts_more;
      return `Balans władzy: ${balance > 0 ? '+' : ''}${balance} | Dostosowuje się: ${who}`;
    }
    case 3: {
      const ln = quant.timing.lateNightMessages;
      const entries = Object.entries(ln);
      if (entries.length === 0) return null;
      return `Nocne (22-04): ${entries.map(([n, c]) => `${n}: ${c}`).join(', ')}`;
    }
    case 4: {
      const entries = names
        .map((n) => {
          const m = quant.perPerson[n];
          return m ? `${n}: ${m.emojiCount} emoji` : null;
        })
        .filter(Boolean);
      return entries.length > 0 ? entries.join(' | ') : null;
    }
    case 5: {
      const timing = quant.timing.perPerson;
      const entries = names
        .map((n) => {
          const t = timing[n];
          return t ? `${n}: ${formatTime(t.medianResponseTimeMs)}` : null;
        })
        .filter(Boolean);
      const ghost = quant.viralScores?.ghostRisk;
      const ghostStr = ghost
        ? names
            .map((n) => (ghost[n] ? `${n}: ${ghost[n].score}%` : null))
            .filter(Boolean)
            .join(', ')
        : '';
      return entries.length > 0
        ? `Mediana odp.: ${entries.join(', ')}${ghostStr ? ` | Ghost: ${ghostStr}` : ''}`
        : null;
    }
    case 6: {
      const flags = p2?.red_flags;
      if (!flags || flags.length === 0) return null;
      return `${flags.length} red flag(s): ${flags
        .slice(0, 2)
        .map((f) => f.pattern)
        .join(', ')}`;
    }
    case 7: {
      const health = analysis.qualitative?.pass4?.health_score?.overall;
      const delusion = quant.viralScores?.delusionScore;
      const parts: string[] = [];
      if (health !== undefined) parts.push(`Zdrowie: ${health}/100`);
      if (delusion !== undefined) parts.push(`Deluzja: ${delusion}/100`);
      return parts.length > 0 ? parts.join(' | ') : null;
    }
    default:
      return null;
  }
}

function getActImageKey(actNum: number): string | undefined {
  switch (actNum) {
    case 1: return PHOTO_KEYS.microphone;
    case 3: return PHOTO_KEYS.smartphone;
    case 4: return PHOTO_KEYS.emoji;
    case 5: return PHOTO_KEYS.hourglass;
    case 6: return PHOTO_KEYS.cracked;
    case 7: return PHOTO_KEYS.spotlightImg;
    default: return undefined;
  }
}

// ═══════════════════════════════════════════════════════════
// PAGE BUILDERS
// ═══════════════════════════════════════════════════════════

function drawCoverPage(
  doc: jsPDF,
  result: StandUpRoastResult,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  drawPageBg(doc, [15, 5, 30], [48, 43, 99], PHOTO_KEYS.cover, images);

  drawCurtain(doc, 'left');
  drawCurtain(doc, 'right');

  drawSpotlight(doc, A4_W / 2, 0, 100, 180, SC.spotlight, 0.08);
  drawSpotlight(doc, A4_W / 2, 0, 60, 150, SC.spotlight, 0.05);

  drawStage(doc, 235);
  drawMicrophone(doc, A4_W / 2, 200, 1.2, SC.dimWhite);

  // Gold frame
  stroke(doc, SC.gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(40, 70, 130, 65, 3, 3, 'S');
  stroke(doc, SC.goldDark);
  doc.setLineWidth(0.2);
  doc.roundedRect(42, 72, 126, 61, 2, 2, 'S');

  toBold(doc);
  doc.setFontSize(12);
  textC(doc, SC.gold);
  doc.text('PROGRAM WIECZORU', A4_W / 2, 82, { align: 'center' });

  doc.setFontSize(26);
  textC(doc, SC.white);
  const titleLines = doc.splitTextToSize(pdfSafe(result.showTitle), 118);
  doc.text(titleLines, A4_W / 2, 97, { align: 'center' });

  toNormal(doc);
  doc.setFontSize(11);
  textC(doc, SC.dimWhite);
  doc.text(pdfSafe(analysis.conversation.title), A4_W / 2, 125, {
    align: 'center',
  });

  doc.setFontSize(10);
  textC(doc, SC.mutedGold);
  const punchlineCount = result.acts.reduce(
    (s: number, a: StandUpAct) => s + a.lines.length,
    0,
  );
  doc.text(
    `${result.acts.length} aktów  |  ${punchlineCount} punchline'ów  |  ${analysis.conversation.metadata.totalMessages} wiadomości`,
    A4_W / 2,
    145,
    { align: 'center' },
  );

  const genre =
    analysis.qualitative?.pass4?.conversation_personality
      ?.if_this_conversation_were_a?.movie_genre;
  if (genre) {
    doc.setFontSize(9);
    textC(doc, SC.neonPink);
    doc.text(`Gatunek filmowy: ${pdfSafe(genre)}`, A4_W / 2, 155, {
      align: 'center',
    });
  }

  drawStar(doc, 50, 40, 2, 1, 5, SC.gold);
  drawStar(doc, 160, 45, 1.5, 0.7, 5, SC.gold);
  drawStar(doc, 45, 165, 1, 0.5, 5, SC.mutedGold);
  drawStar(doc, 165, 170, 1.2, 0.6, 5, SC.mutedGold);

  drawAudienceSilhouettes(doc, 260, 18);
  drawFooter(doc);
}

function drawCharacterCardsPage(
  doc: jsPDF,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  drawPageBg(doc, [10, 5, 20], [25, 15, 45], PHOTO_KEYS.silhouette, images);

  toBold(doc);
  doc.setFontSize(14);
  textC(doc, SC.gold);
  doc.text('KARTY POSTACI', A4_W / 2, 18, { align: 'center' });
  drawDivider(doc, 22, 70, 140);

  const names = analysis.conversation.participants.map((p) => p.name);
  const pass3 = analysis.qualitative?.pass3;
  const pass1 = analysis.qualitative?.pass1;
  const viral = analysis.quantitative.viralScores;

  const cardW = 80;
  const cardH = 240;
  const cardY = 30;
  const positions = [
    { x: 12, name: names[0] || 'Osoba A' },
    { x: A4_W - 12 - cardW, name: names[1] || 'Osoba B' },
  ];

  positions.forEach(({ x, name }) => {
    const person = analysis.quantitative.perPerson[name];
    const profile = pass3?.[name];
    const tone = pass1?.tone_per_person?.[name];
    const interest = viral?.interestScores?.[name] ?? 0;

    drawCard(doc, x, cardY, cardW, cardH, [18, 12, 30], [40, 30, 60]);

    const cx = x + cardW / 2;
    const photo = analysis.participantPhotos?.[name];
    if (photo) {
      try {
        const photoSize = 16;
        doc.addImage(photo, 'JPEG', cx - photoSize / 2, cardY + 8, photoSize, photoSize);
      } catch {
        drawPersonSilhouette(doc, cx, cardY + 20, 1.3, SC.purple);
      }
    } else {
      drawPersonSilhouette(doc, cx, cardY + 20, 1.3, SC.purple);
    }

    toBold(doc);
    doc.setFontSize(13);
    textC(doc, SC.white);
    doc.text(pdfSafe(name).slice(0, 15), cx, cardY + 38, { align: 'center' });

    const mbti = profile?.mbti?.type;
    if (mbti) {
      fill(doc, SC.purple);
      doc.roundedRect(cx - 14, cardY + 41, 28, 9, 2, 2, 'F');
      doc.setFontSize(10);
      textC(doc, SC.white);
      doc.text(mbti, cx, cardY + 47, { align: 'center' });
    }

    drawDivider(doc, cardY + 53, x + 5, x + cardW - 5);

    toNormal(doc);
    doc.setFontSize(8.5);
    let statY = cardY + 60;
    const stats = [
      ['Wiadomości', `${person?.totalMessages ?? 0}`],
      ['Słowa', `${person?.totalWords ?? 0}`],
      ['Śr. dług.', `${(person?.averageMessageLength ?? 0).toFixed(1)} sł.`],
      ['Emoji', `${person?.emojiCount ?? 0}`],
      ['Pytania', `${person?.questionsAsked ?? 0}`],
      ['Reakcje', `${person?.reactionsGiven ?? 0}`],
    ];
    stats.forEach(([label, value]) => {
      textC(doc, SC.dimWhite);
      doc.text(pdfSafe(label), x + 6, statY);
      toBold(doc);
      textC(doc, SC.white);
      doc.text(pdfSafe(value), x + cardW - 6, statY, { align: 'right' });
      toNormal(doc);
      statY += 7;
    });

    drawDivider(doc, statY + 2, x + 5, x + cardW - 5);
    statY += 8;

    if (tone) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('TON', x + 6, statY);
      textC(doc, SC.neonBlue);
      doc.text(pdfSafe(tone.primary_tone), x + 6, statY + 6);
      statY += 14;
    }

    if (tone?.humor_style) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('HUMOR', x + 6, statY);
      textC(doc, SC.neonPink);
      doc.text(pdfSafe(tone.humor_style), x + 6, statY + 6);
      statY += 14;
    }

    const attachment = profile?.attachment_indicators?.primary_style;
    if (attachment && attachment !== 'insufficient_data') {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('PRZYWIĄZANIE', x + 6, statY);
      textC(doc, SC.white);
      doc.text(pdfSafe(attachment), x + 6, statY + 6);
      statY += 14;
    }

    const loveLang = profile?.love_language?.primary;
    if (loveLang) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('JĘZYK MIŁOŚCI', x + 6, statY);
      textC(doc, SC.neonPink);
      doc.text(pdfSafe(loveLang.replace(/_/g, ' ')), x + 6, statY + 6);
      statY += 14;
    }

    doc.setFontSize(8);
    textC(doc, SC.mutedGold);
    doc.text(`ZAINTERESOWANIE: ${interest}%`, x + 6, statY);
    drawProgressBar(doc, x + 6, statY + 3, cardW - 12, 4, interest, SC.neonBlue);
    statY += 12;

    const ei = profile?.emotional_intelligence?.overall;
    if (ei !== undefined) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text(`INTELIGENCJA EMOC.: ${ei}/100`, x + 6, statY);
      drawProgressBar(doc, x + 6, statY + 3, cardW - 12, 4, ei, SC.purple);
    }
  });

  // VS badge
  fill(doc, SC.comedyRed);
  doc.circle(A4_W / 2, cardY + cardH / 2 - 10, 12, 'F');
  toBold(doc);
  doc.setFontSize(16);
  textC(doc, SC.white);
  doc.text('VS', A4_W / 2, cardY + cardH / 2 - 6, { align: 'center' });

  drawFooter(doc);
}

function drawActPage(
  doc: jsPDF,
  act: StandUpAct,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  const c1 = hexToRGB(act.gradientColors[0]);
  const c2 = hexToRGB(act.gradientColors[1]);
  drawPageBg(doc, c1, c2, getActImageKey(act.number), images);

  // Act icon (top right)
  drawActIcon(doc, act.number, A4_W - MARGIN - 10, 25, SC.gold);

  // Act number badge
  fill(doc, SC.gold);
  doc.roundedRect(MARGIN, 12, 24, 9, 2, 2, 'F');
  toBold(doc);
  doc.setFontSize(8.5);
  textC(doc, SC.stageBlack);
  doc.text(`AKT ${act.number}`, MARGIN + 12, 18, { align: 'center' });

  // Act title
  doc.setFontSize(24);
  textC(doc, SC.white);
  const actTitleLines = doc.splitTextToSize(pdfSafe(act.title), CONTENT_W - 30);
  doc.text(actTitleLines, MARGIN, 36);

  const titleBottom = 36 + actTitleLines.length * 9;
  drawDivider(doc, titleBottom, MARGIN, MARGIN + 45);

  // Data insight
  const insight = getActInsight(act.number, analysis);
  let contentY = titleBottom + 6;
  if (insight) {
    withOpacity(doc, 0.7, () => {
      fill(doc, [0, 0, 0]);
      doc.roundedRect(MARGIN, contentY, CONTENT_W, 10, 1, 1, 'F');
    });
    stroke(doc, [60, 50, 80]);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, contentY, CONTENT_W, 10, 1, 1, 'S');
    toNormal(doc);
    doc.setFontSize(8.5);
    textC(doc, SC.neonBlue);
    doc.text(pdfSafe(insight), MARGIN + 3, contentY + 6.5);
    contentY += 15;
  }

  // Punchlines
  doc.setFontSize(11);
  let y = contentY + 4;
  for (const line of act.lines) {
    textC(doc, SC.white);
    const wrapped = doc.splitTextToSize(pdfSafe(line), CONTENT_W - 12);
    if (y + wrapped.length * 5.5 > A4_H - 30) {
      drawFooter(doc);
      doc.addPage();
      drawPageBg(doc, c1, c2, getActImageKey(act.number), images);
      fill(doc, [50, 40, 70]);
      doc.roundedRect(MARGIN, 10, 30, 8, 2, 2, 'F');
      toBold(doc);
      doc.setFontSize(8);
      textC(doc, SC.white);
      doc.text(`AKT ${act.number} (cd.)`, MARGIN + 15, 15, {
        align: 'center',
      });
      toNormal(doc);
      doc.setFontSize(11);
      y = 24;
    }
    // Gold quote bar
    fill(doc, SC.gold);
    doc.rect(MARGIN, y - 3, 1.5, wrapped.length * 5.5, 'F');
    toNormal(doc);
    textC(doc, SC.white);
    doc.text(wrapped, MARGIN + 6, y);
    y += wrapped.length * 5.5 + 7;
  }

  // Callback
  if (act.callback) {
    if (y + 12 > A4_H - 30) {
      drawFooter(doc);
      doc.addPage();
      drawPageBg(doc, c1, c2);
      y = 25;
    }
    doc.setFontSize(9.5);
    textC(doc, SC.dimWhite);
    const cbLines = doc.splitTextToSize(
      `<< ${pdfSafe(act.callback)}`,
      CONTENT_W - 20,
    );
    doc.text(cbLines, MARGIN + 10, y + 3);
  }

  drawFooter(doc);
}

function drawPsychReportPage(
  doc: jsPDF,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  drawPageBg(doc, [20, 15, 10], [35, 28, 18], PHOTO_KEYS.waveform, images);

  // Manila folder tab
  fill(doc, SC.manila);
  doc.roundedRect(30, 0, 60, 12, 0, 0, 'F');
  doc.roundedRect(28, 8, 64, 8, 2, 2, 'F');
  toBold(doc);
  doc.setFontSize(9);
  textC(doc, [80, 60, 40]);
  doc.text('AKTA OSOBOWE', 60, 6, { align: 'center' });

  // ŚCIŚLE TAJNE stamp
  stroke(doc, SC.comedyRed);
  doc.setLineWidth(1);
  doc.roundedRect(118, 18, 58, 22, 2, 2, 'S');
  toBold(doc);
  doc.setFontSize(14);
  textC(doc, SC.comedyRed);
  doc.text('ŚCIŚLE TAJNE', 147, 33, { align: 'center' });

  doc.setFontSize(16);
  textC(doc, SC.cream);
  doc.text('RAPORT PSYCHOLOGICZNY', MARGIN, 28);

  const names = analysis.conversation.participants.map((p) => p.name);
  const pass3 = analysis.qualitative?.pass3;
  if (!pass3) return;

  const colW = (CONTENT_W - 8) / 2;

  names.slice(0, 2).forEach((name, idx) => {
    const profile = pass3[name];
    if (!profile) return;

    const colX = MARGIN + idx * (colW + 8);
    let y = 45;

    drawCard(doc, colX, y, colW, 12, [30, 20, 15], SC.mutedGold);
    toBold(doc);
    doc.setFontSize(11);
    textC(doc, SC.cream);
    doc.text(pdfSafe(name), colX + colW / 2, y + 8, { align: 'center' });
    y += 17;

    // Big Five
    if (profile.big_five_approximation) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('BIG FIVE', colX + 2, y);
      y += 5;

      const traits = [
        { label: 'Otwartość', value: profile.big_five_approximation.openness },
        {
          label: 'Sumienność',
          value: profile.big_five_approximation.conscientiousness,
        },
        {
          label: 'Ekstrawersja',
          value: profile.big_five_approximation.extraversion,
        },
        {
          label: 'Ugodowość',
          value: profile.big_five_approximation.agreeableness,
        },
        { label: 'Neurotyzm', value: profile.big_five_approximation.neuroticism },
      ];

      traits.forEach(({ label, value }) => {
        if (!value?.range) return;
        const avg = (value.range[0] + value.range[1]) / 2;
        const score = avg * 10;
        toNormal(doc);
        doc.setFontSize(7);
        textC(doc, SC.dimWhite);
        doc.text(pdfSafe(label), colX + 2, y + 3);
        drawProgressBar(doc, colX + 28, y, colW - 32, 4, score, SC.purple);
        doc.setFontSize(7);
        textC(doc, SC.white);
        doc.text(`${avg.toFixed(1)}`, colX + colW - 1, y + 3, {
          align: 'right',
        });
        y += 7;
      });
    }

    y += 3;

    // MBTI
    if (profile.mbti) {
      fill(doc, SC.purple);
      doc.roundedRect(colX + 2, y, 18, 8, 2, 2, 'F');
      toBold(doc);
      doc.setFontSize(9);
      textC(doc, SC.white);
      doc.text(profile.mbti.type, colX + 11, y + 5.5, { align: 'center' });
      doc.setFontSize(7);
      textC(doc, SC.dimWhite);
      doc.text(`(${profile.mbti.confidence}% pewn.)`, colX + 22, y + 5.5);
      y += 12;
    }

    // Attachment
    doc.setFontSize(8);
    textC(doc, SC.mutedGold);
    doc.text('STYL PRZYWIĄZANIA', colX + 2, y);
    y += 5;
    toNormal(doc);
    doc.setFontSize(8.5);
    textC(doc, SC.white);
    const att = profile.attachment_indicators?.primary_style ?? 'insufficient_data';
    doc.text(
      pdfSafe(tr(att)),
      colX + 2,
      y + 2,
    );
    y += 10;

    // Love language
    if (profile.love_language) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('JĘZYK MIŁOŚCI', colX + 2, y);
      y += 5;
      doc.setFontSize(8.5);
      textC(doc, SC.neonPink);
      doc.text(
        pdfSafe(tr(profile.love_language.primary)),
        colX + 2,
        y + 2,
      );
      y += 10;
    }

    // EI
    if (profile.emotional_intelligence?.overall != null) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('INTELIGENCJA EMOCJONALNA', colX + 2, y);
      y += 5;
      drawProgressBar(
        doc,
        colX + 2,
        y,
        colW - 4,
        4,
        profile.emotional_intelligence.overall,
        SC.neonBlue,
      );
      doc.setFontSize(7);
      textC(doc, SC.white);
      doc.text(
        `${profile.emotional_intelligence.overall}/100`,
        colX + colW - 2,
        y + 3,
        { align: 'right' },
      );
    }
    y += 10;

    // Communication
    if (profile.communication_profile) {
      doc.setFontSize(8);
      textC(doc, SC.mutedGold);
      doc.text('KOMUNIKACJA', colX + 2, y);
      y += 5;
      doc.setFontSize(7.5);
      textC(doc, SC.dimWhite);
      doc.text(
        `Styl: ${tr(profile.communication_profile.style)}`,
        colX + 2,
        y + 2,
      );
      y += 6;
      if (profile.communication_needs) {
        doc.text(
          `Potrzeba: ${tr(profile.communication_needs.primary)}`,
          colX + 2,
          y + 2,
        );
      }
    }
  });

  drawFooter(doc);
}

function drawDestructionPage(
  doc: jsPDF,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  drawPageBg(doc, [15, 5, 25], [40, 10, 50], PHOTO_KEYS.dashboard, images);

  toBold(doc);
  doc.setFontSize(14);
  textC(doc, SC.comedyRed);
  doc.text('WYKRES ZNISZCZEŃ', A4_W / 2, 18, { align: 'center' });
  drawDivider(doc, 22, 60, 150);

  const pass4 = analysis.qualitative?.pass4;
  if (!pass4) return;

  const health = pass4.health_score;

  drawMeter(doc, A4_W / 2, 80, 35, health.overall, SC.comedyRed, SC.greenBright);

  doc.setFontSize(10);
  textC(doc, SC.dimWhite);
  doc.text('ZDROWIE ROZMOWY', A4_W / 2, 100, { align: 'center' });

  let y = 115;
  doc.setFontSize(10);
  textC(doc, SC.mutedGold);
  toBold(doc);
  doc.text('KOMPONENTY ZDROWIA', MARGIN, y);
  y += 7;

  const components = [
    { label: 'Balans', value: health.components.balance },
    { label: 'Wzajemność', value: health.components.reciprocity },
    { label: 'Odpowiedzi', value: health.components.response_pattern },
    { label: 'Bezp. emocj.', value: health.components.emotional_safety },
    { label: 'Trajektoria', value: health.components.growth_trajectory },
  ];

  components.forEach(({ label, value }) => {
    toNormal(doc);
    doc.setFontSize(9);
    textC(doc, SC.dimWhite);
    doc.text(pdfSafe(label), MARGIN, y + 3);
    const barColor: RGB =
      value >= 70 ? SC.greenBright : value >= 40 ? SC.gold : SC.comedyRed;
    drawProgressBar(doc, MARGIN + 38, y, CONTENT_W - 52, 4, value, barColor);
    toBold(doc);
    doc.setFontSize(9);
    textC(doc, SC.white);
    doc.text(`${value}`, A4_W - MARGIN, y + 3, { align: 'right' });
    y += 9;
  });

  // Trajectory
  y += 5;
  const traj = pass4.relationship_trajectory;
  toBold(doc);
  doc.setFontSize(10);
  textC(doc, SC.mutedGold);
  doc.text('TRAJEKTORIA', MARGIN, y);
  y += 6;
  toNormal(doc);
  doc.setFontSize(9);
  const dirColors: Record<string, RGB> = {
    strengthening: SC.greenBright,
    stable: SC.gold,
    weakening: SC.comedyRed,
    volatile: SC.neonPink,
  };
  textC(doc, dirColors[traj.direction] ?? SC.white);
  doc.text(
    `${pdfSafe(traj.direction)} | Faza: ${pdfSafe(traj.current_phase)}`,
    MARGIN,
    y,
  );

  // Conversation personality badges
  y += 15;
  const cp = pass4.conversation_personality?.if_this_conversation_were_a;
  if (cp) {
    toBold(doc);
    doc.setFontSize(10);
    textC(doc, SC.mutedGold);
    doc.text('GDYBY TA ROZMOWA BYLA...', MARGIN, y);
    y += 8;

    const badges = [
      { label: 'Gatunek filmowy', value: cp.movie_genre },
      { label: 'Pogoda', value: cp.weather },
      { label: 'Jedno slowo', value: cp.one_word },
    ];

    badges.forEach(({ label, value }, i) => {
      const bx = MARGIN + i * (CONTENT_W / 3);
      const bw = CONTENT_W / 3 - 4;
      drawCard(doc, bx, y, bw, 22, [30, 20, 45], SC.purple);
      doc.setFontSize(7);
      textC(doc, SC.mutedGold);
      doc.text(pdfSafe(label), bx + bw / 2, y + 6, { align: 'center' });
      toBold(doc);
      doc.setFontSize(8.5);
      textC(doc, SC.white);
      const wrapped = doc.splitTextToSize(pdfSafe(value), bw - 4);
      doc.text(wrapped, bx + bw / 2, y + 13, { align: 'center' });
      toNormal(doc);
    });
  }

  // Executive summary
  const summary = pass4.executive_summary;
  if (summary) {
    y += 34;
    toBold(doc);
    doc.setFontSize(10);
    textC(doc, SC.mutedGold);
    doc.text('PODSUMOWANIE', MARGIN, y);
    y += 6;
    toNormal(doc);
    doc.setFontSize(8);
    textC(doc, SC.dimWhite);
    const sumLines = doc.splitTextToSize(pdfSafe(summary), CONTENT_W);
    doc.text(sumLines, MARGIN, y);
  }

  drawFooter(doc);
}

function drawViralScoreboardPage(
  doc: jsPDF,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  drawPageBg(doc, [5, 10, 25], [15, 25, 50], PHOTO_KEYS.dashboard, images);

  toBold(doc);
  doc.setFontSize(14);
  textC(doc, SC.neonBlue);
  doc.text('VIRAL SCOREBOARD', A4_W / 2, 18, { align: 'center' });
  drawDivider(doc, 22, 65, 145);

  const viral = analysis.quantitative.viralScores;
  if (!viral) return;

  const names = analysis.conversation.participants.map((p) => p.name);
  const cardW = (CONTENT_W - 6) / 2;
  const cardH = 105;
  const topY = 30;

  // Compatibility card
  drawCard(doc, MARGIN, topY, cardW, cardH, [15, 10, 30], [60, 50, 100]);
  toBold(doc);
  doc.setFontSize(9);
  textC(doc, SC.mutedGold);
  doc.text('KOMPATYBILNOŚĆ', MARGIN + cardW / 2, topY + 8, {
    align: 'center',
  });
  const vennCx = MARGIN + cardW / 2;
  const vennCy = topY + 40;
  withOpacity(doc, 0.4, () => {
    fill(doc, SC.neonBlue);
    doc.circle(vennCx - 8, vennCy, 15, 'F');
    fill(doc, SC.neonPink);
    doc.circle(vennCx + 8, vennCy, 15, 'F');
  });
  withOpacity(doc, 0.6, () => {
    fill(doc, SC.purple);
    doc.circle(vennCx, vennCy, 10, 'F');
  });
  toBold(doc);
  doc.setFontSize(22);
  textC(doc, SC.white);
  doc.text(`${viral.compatibilityScore}%`, vennCx, vennCy + 5, {
    align: 'center',
  });
  toNormal(doc);
  doc.setFontSize(7.5);
  textC(doc, SC.neonBlue);
  doc.text(pdfSafe(names[0] ?? ''), vennCx - 16, vennCy + 22, {
    align: 'center',
  });
  textC(doc, SC.neonPink);
  doc.text(pdfSafe(names[1] ?? ''), vennCx + 16, vennCy + 22, {
    align: 'center',
  });

  // Ghost Risk card
  const ghostX = MARGIN + cardW + 6;
  drawCard(doc, ghostX, topY, cardW, cardH, [15, 10, 30], [60, 50, 100]);
  toBold(doc);
  doc.setFontSize(9);
  textC(doc, SC.mutedGold);
  doc.text('GHOST RISK', ghostX + cardW / 2, topY + 8, { align: 'center' });
  drawGhostShape(doc, ghostX + cardW / 2, topY + 35, 1.5, [120, 120, 160]);
  let ghostY = topY + 60;
  names.slice(0, 2).forEach((name) => {
    const risk = viral.ghostRisk[name];
    if (!risk) return;
    toNormal(doc);
    doc.setFontSize(8);
    textC(doc, SC.dimWhite);
    doc.text(pdfSafe(name), ghostX + 5, ghostY);
    drawProgressBar(
      doc,
      ghostX + 5,
      ghostY + 3,
      cardW - 10,
      4,
      risk.score,
      SC.comedyRed,
    );
    doc.setFontSize(7);
    textC(doc, SC.white);
    doc.text(`${risk.score}%`, ghostX + cardW - 5, ghostY + 5, {
      align: 'right',
    });
    ghostY += 12;
  });

  // Bottom row
  const botY = topY + cardH + 8;

  // Delusion card
  drawCard(doc, MARGIN, botY, cardW, cardH, [25, 10, 25], [70, 40, 80]);
  toBold(doc);
  doc.setFontSize(9);
  textC(doc, SC.mutedGold);
  doc.text('POZIOM DELUZJI', MARGIN + cardW / 2, botY + 8, {
    align: 'center',
  });
  doc.setFontSize(36);
  textC(doc, SC.neonPink);
  doc.text(`${viral.delusionScore}`, MARGIN + cardW / 2, botY + 48, {
    align: 'center',
  });
  doc.setFontSize(9);
  textC(doc, SC.dimWhite);
  doc.text('/100', MARGIN + cardW / 2 + 20, botY + 48);
  if (viral.delusionHolder) {
    toNormal(doc);
    doc.setFontSize(8);
    textC(doc, SC.neonPink);
    doc.text(
      `Deluzja u: ${pdfSafe(viral.delusionHolder)}`,
      MARGIN + cardW / 2,
      botY + 58,
      { align: 'center' },
    );
  }
  // Pink glasses
  stroke(doc, SC.neonPink);
  doc.setLineWidth(0.6);
  const gx = MARGIN + cardW / 2;
  const gy = botY + 70;
  doc.circle(gx - 6, gy, 4, 'S');
  doc.circle(gx + 6, gy, 4, 'S');
  doc.line(gx - 2, gy, gx + 2, gy);
  doc.line(gx - 10, gy, gx - 14, gy - 2);
  doc.line(gx + 10, gy, gx + 14, gy - 2);

  // Interest card
  drawCard(doc, ghostX, botY, cardW, cardH, [10, 15, 25], [50, 60, 100]);
  toBold(doc);
  doc.setFontSize(9);
  textC(doc, SC.mutedGold);
  doc.text('ZAINTERESOWANIE', ghostX + cardW / 2, botY + 8, {
    align: 'center',
  });
  let intY = botY + 22;
  names.slice(0, 2).forEach((name, i) => {
    const interest = viral.interestScores[name] ?? 0;
    const barColor: RGB = i === 0 ? SC.neonBlue : SC.neonPink;
    toNormal(doc);
    doc.setFontSize(8.5);
    textC(doc, SC.dimWhite);
    doc.text(pdfSafe(name), ghostX + 5, intY);
    intY += 4;
    drawProgressBar(
      doc,
      ghostX + 5,
      intY,
      cardW - 22,
      4.5,
      interest,
      barColor,
    );
    toBold(doc);
    doc.setFontSize(9);
    textC(doc, SC.white);
    doc.text(`${interest}%`, ghostX + cardW - 5, intY + 3.5, {
      align: 'right',
    });
    intY += 14;
  });
  if (names.length >= 2) {
    const diff = Math.abs(
      (viral.interestScores[names[0]] ?? 0) -
        (viral.interestScores[names[1]] ?? 0),
    );
    doc.setFontSize(8);
    textC(doc, SC.dimWhite);
    doc.text(`Roznica: ${diff} pkt`, ghostX + cardW / 2, intY + 5, {
      align: 'center',
    });
  }

  drawFooter(doc);
}

function drawClosingCreditsPage(
  doc: jsPDF,
  result: StandUpRoastResult,
  analysis: StoredAnalysis,
  images?: PdfImages,
): void {
  drawPageBg(doc, [10, 5, 25], [20, 15, 50], PHOTO_KEYS.curtains, images);

  // Partially closed curtains
  fill(doc, SC.curtainRed);
  doc.rect(0, 0, 45, A4_H, 'F');
  fill(doc, SC.curtainDark);
  doc.rect(8, 0, 2, A4_H, 'F');
  doc.rect(20, 0, 2, A4_H, 'F');
  doc.rect(35, 0, 2, A4_H, 'F');

  fill(doc, SC.curtainRed);
  doc.rect(A4_W - 45, 0, 45, A4_H, 'F');
  fill(doc, SC.curtainDark);
  doc.rect(A4_W - 10, 0, 2, A4_H, 'F');
  doc.rect(A4_W - 22, 0, 2, A4_H, 'F');
  doc.rect(A4_W - 37, 0, 2, A4_H, 'F');

  drawSpotlight(doc, A4_W / 2, 0, 40, 250, SC.spotlight, 0.06);

  toBold(doc);
  doc.setFontSize(13);
  textC(doc, SC.gold);
  doc.text('KONIEC SHOW', A4_W / 2, 55, { align: 'center' });

  doc.setFontSize(18);
  textC(doc, SC.white);
  const closingLines = doc.splitTextToSize(
    pdfSafe(result.closingLine),
    100,
  );
  doc.text(closingLines, A4_W / 2, 75, { align: 'center' });

  // Star rating
  const ratingY = 110;
  for (let i = 0; i < 5; i++) {
    drawStar(doc, A4_W / 2 - 20 + i * 10, ratingY, 4, 1.8, 5, SC.gold);
  }

  toNormal(doc);
  doc.setFontSize(10);
  textC(doc, SC.dimWhite);
  doc.text(
    `Ocena publicznosci: ${pdfSafe(result.audienceRating)}`,
    A4_W / 2,
    ratingY + 12,
    { align: 'center' },
  );

  // Roast verdict
  const verdict = analysis.qualitative?.roast?.verdict;
  if (verdict) {
    doc.setFontSize(9.5);
    textC(doc, SC.neonPink);
    const verdictLines = doc.splitTextToSize(pdfSafe(verdict), 100);
    doc.text(verdictLines, A4_W / 2, 140, { align: 'center' });
  }

  // Superlatives
  const superlatives = analysis.qualitative?.roast?.superlatives;
  if (superlatives && superlatives.length > 0) {
    let supY = 165;
    toBold(doc);
    doc.setFontSize(9);
    textC(doc, SC.gold);
    doc.text('SUPERLATYWY', A4_W / 2, supY, { align: 'center' });
    supY += 8;

    superlatives.slice(0, 5).forEach((sup) => {
      toNormal(doc);
      doc.setFontSize(8.5);
      textC(doc, SC.white);
      doc.text(
        `${pdfSafe(sup.title)}: ${pdfSafe(sup.holder)}`,
        A4_W / 2,
        supY,
        { align: 'center' },
      );
      doc.setFontSize(7);
      textC(doc, SC.dimWhite);
      doc.text(pdfSafe(sup.roast).slice(0, 60), A4_W / 2, supY + 5, {
        align: 'center',
      });
      supY += 12;
    });
  }

  // Credits
  let credY = 230;
  drawDivider(doc, credY - 5, 70, 140);
  doc.setFontSize(7.5);
  textC(doc, SC.dimWhite);
  const credits = [
    'REŻYSERÓWKA: Gemini AI',
    'PRODUCENT: PodTeksT',
    `SCENARIUSZ: ${analysis.conversation.participants.map((p) => pdfSafe(p.name)).join(', ')}`,
    `PREMIERA: ${new Date(analysis.createdAt).toLocaleDateString('pl-PL')}`,
    `MATERIAŁU: ${analysis.conversation.metadata.totalMessages} wiadomości`,
  ];
  credits.forEach((line) => {
    doc.text(line, A4_W / 2, credY, { align: 'center' });
    credY += 5.5;
  });

  drawStar(doc, A4_W / 2, credY + 8, 2, 1, 5, SC.gold);
  drawFooter(doc);
}

function drawDisclaimerPage(doc: jsPDF, images?: PdfImages): void {
  drawPageBg(doc, [8, 5, 15], [15, 10, 30], PHOTO_KEYS.neon, images);

  // Legal frame
  stroke(doc, SC.dimWhite);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, 30, CONTENT_W, 80, 3, 3, 'S');

  toBold(doc);
  doc.setFontSize(12);
  textC(doc, SC.white);
  doc.text('ZASTRZEŻENIE PRAWNE', A4_W / 2, 42, { align: 'center' });

  toNormal(doc);
  doc.setFontSize(8.5);
  textC(doc, SC.dimWhite);
  const disclaimer = [
    'Ten dokument został wygenerowany automatycznie przez sztuczną inteligencję',
    'w celach rozrywkowych. Nie stanowi diagnozy psychologicznej, porady',
    'medycznej ani prawnej. Wszystkie "analizy" należy traktować z przymrużeniem',
    'oka i poczuciem humoru. Żadne zwierzęta nie ucierpiały podczas produkcji',
    'tego stand-upu, chociaż niektóre ego mogły zostać naruszone.',
    '',
    'Każde podobieństwo do rzeczywistych osób jest całkowicie zamierzone',
    'i oparte na danych z ich własnych wiadomości.',
  ];
  let dy = 53;
  disclaimer.forEach((line) => {
    doc.text(pdfSafe(line), A4_W / 2, dy, { align: 'center' });
    dy += 6;
  });

  // "ZATWIERDZONE DO ŚMIECHU" stamp
  fill(doc, SC.greenBright);
  doc.roundedRect(50, 120, 110, 30, 3, 3, 'F');
  stroke(doc, [10, 120, 80]);
  doc.setLineWidth(1.5);
  doc.roundedRect(50, 120, 110, 30, 3, 3, 'S');
  toBold(doc);
  doc.setFontSize(14);
  textC(doc, SC.white);
  doc.text('ZATWIERDZONE', A4_W / 2, 134, { align: 'center' });
  doc.setFontSize(10);
  doc.text('DO ŚMIECHU', A4_W / 2, 144, { align: 'center' });

  // PodTeksT promo card
  const promoY = 170;
  for (let i = 0; i < 20; i++) {
    const c = blendColors([59, 130, 246] as RGB, [168, 85, 247] as RGB, i / 20);
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(35, promoY + i * 4, 140, 5, 'F');
  }
  stroke(doc, SC.purple);
  doc.setLineWidth(0.5);
  doc.roundedRect(35, promoY, 140, 80, 4, 4, 'S');

  toBold(doc);
  doc.setFontSize(24);
  textC(doc, SC.white);
  doc.text('PodTeksT', A4_W / 2, promoY + 25, { align: 'center' });

  toNormal(doc);
  doc.setFontSize(10);
  textC(doc, [220, 220, 240]);
  doc.text('odkryj to, co kryje się między wierszami', A4_W / 2, promoY + 37, {
    align: 'center',
  });

  doc.setFontSize(9);
  textC(doc, SC.dimWhite);
  doc.text('podtekst.app', A4_W / 2, promoY + 50, { align: 'center' });

  doc.setFontSize(8);
  doc.text(
    'Analizuj rozmowy | Odkrywaj wzorce | Baw się dobrze',
    A4_W / 2,
    promoY + 62,
    { align: 'center' },
  );

  drawFooter(doc);
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════

export function generateStandUpPdf(
  rawResult: StandUpRoastResult,
  analysis: StoredAnalysis,
  onProgress?: (progress: StandUpPdfProgress) => void,
  images?: PdfImages,
): Blob {
  const result = sanitizeResult(rawResult);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerFonts(doc);

  // Page 1: Cover
  onProgress?.({ stage: 'Okładka...', percent: 3 });
  drawCoverPage(doc, result, analysis, images);

  // Page 2: Character Cards
  onProgress?.({ stage: 'Karty postaci...', percent: 6 });
  doc.addPage();
  drawCharacterCardsPage(doc, analysis, images);

  // Pages 3-9: Acts
  result.acts.forEach((act, idx) => {
    onProgress?.({
      stage: `Akt ${act.number}...`,
      percent: 10 + (idx / result.acts.length) * 65,
    });
    doc.addPage();
    drawActPage(doc, act, analysis, images);
  });

  // Page 10: Psychological Report (conditional)
  if (analysis.qualitative?.pass3) {
    onProgress?.({ stage: 'Raport psychologiczny...', percent: 80 });
    doc.addPage();
    drawPsychReportPage(doc, analysis, images);
  }

  // Page 11: Destruction Chart (conditional)
  if (analysis.qualitative?.pass4) {
    onProgress?.({ stage: 'Wykres zniszczeń...', percent: 85 });
    doc.addPage();
    drawDestructionPage(doc, analysis, images);
  }

  // Page 12: Viral Scoreboard (conditional)
  if (analysis.quantitative.viralScores) {
    onProgress?.({ stage: 'Viral scoreboard...', percent: 88 });
    doc.addPage();
    drawViralScoreboardPage(doc, analysis, images);
  }

  // Page 13: Closing Credits
  onProgress?.({ stage: 'Napisy końcowe...', percent: 93 });
  doc.addPage();
  drawClosingCreditsPage(doc, result, analysis, images);

  // Page 14: Disclaimer
  onProgress?.({ stage: 'Disclaimer...', percent: 97 });
  doc.addPage();
  drawDisclaimerPage(doc, images);

  onProgress?.({ stage: 'Gotowe!', percent: 100 });
  return doc.output('blob');
}
