/**
 * AKT ZGONU — Premium dark-mode A4 PDF export for Tryb Eks analysis.
 *
 * Crimson-themed, formal death certificate style. 6 pages:
 * 1. Cover (Akt Zgonu header + epitaph + dates)
 * 2. Fazy Rozpadu (phases timeline)
 * 3. Sekcja Zwlok (cause of death + contributing factors + turning point)
 * 4. Profil Straty (loss profiles) + Pain Symmetry
 * 5. Wzorce + Prognoza
 * 6. List do Terapeuty + List od Terapeuty (odpowiedź) + Golden Age closing
 */

import jsPDF from 'jspdf';
import { registerFonts, pdfSafe } from './pdf-fonts';
import type { EksResult } from '@/lib/analysis/eks-prompts';

// ── Color palette (crimson dark theme) ──────────────────────
type RGB = [number, number, number];

const C = {
  bg: [10, 4, 4] as RGB,
  cardBg: [26, 8, 8] as RGB,
  cardBorder: [42, 16, 16] as RGB,
  textPrimary: [212, 160, 122] as RGB,
  textSecondary: [107, 58, 58] as RGB,
  textMuted: [74, 74, 74] as RGB,
  crimson: [220, 38, 38] as RGB,
  darkCrimson: [153, 27, 27] as RGB,
  green: [16, 185, 129] as RGB,
  purple: [168, 85, 247] as RGB,
  gold: [212, 160, 122] as RGB,
  white: [250, 250, 250] as RGB,
};

// ── Helpers ──────────────────────────────────────────────────

const A4_W = 210;
const A4_H = 297;
const MARGIN = 16;
const CONTENT_W = A4_W - MARGIN * 2;

function setColor(doc: jsPDF, rgb: RGB): void { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setFill(doc: jsPDF, rgb: RGB): void { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc: jsPDF, rgb: RGB): void { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

function drawBg(doc: jsPDF): void {
  setFill(doc, C.bg);
  doc.rect(0, 0, A4_W, A4_H, 'F');
}

function drawCrimsonHeader(doc: jsPDF): void {
  // Thin crimson line at top
  setFill(doc, C.darkCrimson);
  doc.rect(0, 0, A4_W, 2, 'F');
}

function drawFooter(doc: jsPDF, page: number, total: number): void {
  setColor(doc, C.textMuted);
  doc.setFontSize(7);
  doc.setFont('Inter', 'normal');
  doc.text('PodTeksT \u00B7 Tryb Eks \u00B7 Akt Zgonu', MARGIN, A4_H - 8);
  doc.text(`${page} / ${total}`, A4_W - MARGIN, A4_H - 8, { align: 'right' });
}

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  setFill(doc, C.cardBg);
  setDraw(doc, C.cardBorder);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
}

function drawSectionTitle(doc: jsPDF, y: number, label: string, title: string): number {
  setColor(doc, C.textSecondary);
  doc.setFontSize(8);
  doc.setFont('Inter', 'normal');
  doc.text(label.toUpperCase(), MARGIN, y);
  setColor(doc, C.crimson);
  doc.setFontSize(16);
  doc.setFont('Inter', 'bold');
  doc.text(pdfSafe(title), MARGIN, y + 8);
  setDraw(doc, C.cardBorder);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 12, A4_W - MARGIN, y + 12);
  return y + 18;
}

/** Wrap text into lines that fit within maxWidth */
function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(pdfSafe(text), maxWidth);
}

// ── Page builders ───────────────────────────────────────────

function drawCoverPage(doc: jsPDF, result: EksResult, participants: string[]): void {
  drawBg(doc);

  // Decorative border
  setDraw(doc, C.darkCrimson);
  doc.setLineWidth(0.8);
  doc.roundedRect(12, 12, A4_W - 24, A4_H - 24, 4, 4, 'D');
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 14, A4_W - 28, A4_H - 28, 3, 3, 'D');

  // Title block
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.setFont('Inter', 'normal');
  doc.text('TRYB EKS \u00B7 SEKCJA ZWLOK', A4_W / 2, 50, { align: 'center' });

  setColor(doc, C.crimson);
  doc.setFontSize(32);
  doc.setFont('Inter', 'bold');
  doc.text('AKT ZGONU', A4_W / 2, 72, { align: 'center' });

  // Thin separator
  setDraw(doc, C.darkCrimson);
  doc.setLineWidth(0.5);
  doc.line(MARGIN + 30, 80, A4_W - MARGIN - 30, 80);

  // Participants
  setColor(doc, C.textPrimary);
  doc.setFontSize(14);
  doc.setFont('Inter', 'bold');
  doc.text(pdfSafe(participants.join(' & ')), A4_W / 2, 98, { align: 'center' });

  // Duration + death date
  setColor(doc, C.textSecondary);
  doc.setFontSize(10);
  doc.setFont('Inter', 'normal');
  if (result.relationshipDuration) {
    doc.text(`Czas trwania: ${pdfSafe(result.relationshipDuration)}`, A4_W / 2, 115, { align: 'center' });
  }
  if (result.deathDate) {
    doc.text(`Data smierci: ${pdfSafe(result.deathDate)}`, A4_W / 2, 125, { align: 'center' });
  }

  // Epitaph — large, centered
  setColor(doc, C.gold);
  doc.setFontSize(13);
  doc.setFont('Inter', 'normal');
  const epitaphLines = wrapText(doc, `"${result.epitaph}"`, CONTENT_W - 40);
  let ey = 155;
  for (const line of epitaphLines) {
    doc.text(line, A4_W / 2, ey, { align: 'center' });
    ey += 7;
  }

  // Cause of death summary
  if (result.causeOfDeath?.primary) {
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('PRZYCZYNA SMIERCI', A4_W / 2, ey + 15, { align: 'center' });
    setColor(doc, C.crimson);
    doc.setFontSize(12);
    doc.setFont('Inter', 'bold');
    const causeLines = wrapText(doc, result.causeOfDeath.primary, CONTENT_W - 20);
    let cy = ey + 25;
    for (const line of causeLines) {
      doc.text(line, A4_W / 2, cy, { align: 'center' });
      cy += 6;
    }
  }

  // Forecast probability
  if (result.postBreakupForecast?.willTheyComeBack != null) {
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('SZANSA NA POWROT', A4_W / 2, 230, { align: 'center' });
    setColor(doc, C.crimson);
    doc.setFontSize(28);
    doc.setFont('Inter', 'bold');
    doc.text(`${result.postBreakupForecast.willTheyComeBack}%`, A4_W / 2, 248, { align: 'center' });
  }

  // Footer disclaimer
  setColor(doc, C.textMuted);
  doc.setFontSize(6.5);
  doc.setFont('Inter', 'normal');
  doc.text('Analiza opiera sie na wzorcach komunikacyjnych — nie jest diagnoza psychologiczna.', A4_W / 2, A4_H - 22, { align: 'center' });
  doc.text('Telefon Zaufania: 116 123 (bezplatny, calodobowy)', A4_W / 2, A4_H - 17, { align: 'center' });
}

function drawPhasesPage(doc: jsPDF, result: EksResult): void {
  drawBg(doc);
  drawCrimsonHeader(doc);
  let y = drawSectionTitle(doc, 16, 'preparaty mikroskopowe', 'FAZY ROZPADU');

  const phases = Array.isArray(result.phases) ? result.phases : [];
  for (const phase of phases) {
    if (y > A4_H - 50) break; // prevent overflow

    // Phase card
    const cardY = y;
    drawCard(doc, MARGIN, cardY, CONTENT_W, 1); // placeholder height

    // Phase name + period
    setColor(doc, C.crimson);
    doc.setFontSize(11);
    doc.setFont('Inter', 'bold');
    doc.text(pdfSafe(phase.name), MARGIN + 6, cardY + 8);

    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    doc.text(`${pdfSafe(phase.periodStart)} — ${pdfSafe(phase.periodEnd)}`, MARGIN + 6, cardY + 14);

    // Description
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    const descLines = wrapText(doc, phase.description, CONTENT_W - 16);
    let dy = cardY + 22;
    for (const line of descLines) {
      if (dy > A4_H - 30) break;
      doc.text(line, MARGIN + 6, dy);
      dy += 5;
    }

    // Draw the actual card now that we know height
    const cardH = dy - cardY + 4;
    drawCard(doc, MARGIN, cardY, CONTENT_W, cardH);

    // Redraw text on top of card
    setColor(doc, C.crimson);
    doc.setFontSize(11);
    doc.setFont('Inter', 'bold');
    doc.text(pdfSafe(phase.name), MARGIN + 6, cardY + 8);
    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    doc.text(`${pdfSafe(phase.periodStart)} — ${pdfSafe(phase.periodEnd)}`, MARGIN + 6, cardY + 14);
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    dy = cardY + 22;
    for (const line of descLines) {
      if (dy > A4_H - 30) break;
      doc.text(line, MARGIN + 6, dy);
      dy += 5;
    }

    y = dy + 6;
  }

  drawFooter(doc, 2, 6);
}

function drawAutopsyPage(doc: jsPDF, result: EksResult): void {
  drawBg(doc);
  drawCrimsonHeader(doc);
  let y = drawSectionTitle(doc, 16, 'diagnoza', 'RAPORT Z SEKCJI');

  // Primary cause
  if (result.causeOfDeath) {
    drawCard(doc, MARGIN, y, CONTENT_W, 40);
    setColor(doc, C.darkCrimson);
    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    doc.text('PRZYCZYNA SMIERCI', MARGIN + 6, y + 8);
    setColor(doc, C.crimson);
    doc.setFontSize(14);
    doc.setFont('Inter', 'bold');
    const causeLines = wrapText(doc, result.causeOfDeath.primary, CONTENT_W - 16);
    let cy = y + 18;
    for (const line of causeLines) {
      doc.text(line, MARGIN + 6, cy);
      cy += 7;
    }

    // Contributing factors
    const factors = result.causeOfDeath.contributingFactors || [];
    if (factors.length > 0) {
      cy += 4;
      setColor(doc, C.textMuted);
      doc.setFontSize(8);
      doc.setFont('Inter', 'normal');
      doc.text('CZYNNIKI WSPOLDZIALAJACE', MARGIN + 6, cy);
      cy += 6;
      setColor(doc, C.textPrimary);
      doc.setFontSize(9);
      for (const factor of factors) {
        const fLines = wrapText(doc, `• ${factor}`, CONTENT_W - 20);
        for (const line of fLines) {
          doc.text(line, MARGIN + 10, cy);
          cy += 5;
        }
      }
    }

    // Preventability
    cy += 6;
    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.text('CZY MOZNA BYLO ZAPOBIEC?', MARGIN + 6, cy);
    cy += 8;
    setColor(doc, result.causeOfDeath.wasItPreventable ? C.green : C.darkCrimson);
    doc.setFontSize(20);
    doc.setFont('Inter', 'bold');
    doc.text(result.causeOfDeath.wasItPreventable ? 'TAK' : 'NIE', MARGIN + 6, cy);
    if (result.causeOfDeath.preventabilityReasoning) {
      cy += 8;
      setColor(doc, C.textSecondary);
      doc.setFontSize(8);
      doc.setFont('Inter', 'normal');
      const reasonLines = wrapText(doc, result.causeOfDeath.preventabilityReasoning, CONTENT_W - 16);
      for (const line of reasonLines) {
        doc.text(line, MARGIN + 6, cy);
        cy += 4.5;
      }
    }
    y = cy + 10;
  }

  // Turning point
  if (result.turningPoint && y < A4_H - 60) {
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('PUNKT BEZ POWROTU', MARGIN, y);
    y += 8;
    setColor(doc, C.crimson);
    doc.setFontSize(16);
    doc.setFont('Inter', 'bold');
    doc.text(pdfSafe(result.turningPoint.approximateDate), MARGIN, y);
    y += 8;
    setColor(doc, C.textPrimary);
    doc.setFontSize(10);
    doc.setFont('Inter', 'normal');
    const triggerLines = wrapText(doc, result.turningPoint.trigger, CONTENT_W);
    for (const line of triggerLines) {
      if (y > A4_H - 30) break;
      doc.text(line, MARGIN, y);
      y += 5.5;
    }
  }

  drawFooter(doc, 3, 6);
}

function drawProfilesPage(doc: jsPDF, result: EksResult, participants: string[]): void {
  drawBg(doc);
  drawCrimsonHeader(doc);
  let y = drawSectionTitle(doc, 16, 'bilans strat', 'PROFIL STRATY');

  const profiles = Array.isArray(result.lossProfiles) ? result.lossProfiles : [];
  for (const profile of profiles) {
    if (y > A4_H - 40) break;

    setColor(doc, C.crimson);
    doc.setFontSize(11);
    doc.setFont('Inter', 'bold');
    doc.text(pdfSafe(profile.name), MARGIN, y);
    y += 7;

    // What they lost
    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.text('CO STRACIL/A', MARGIN, y);
    y += 5;
    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    const lostLines = wrapText(doc, profile.whatTheyLost, CONTENT_W);
    for (const line of lostLines) {
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 3;

    // What they gained
    setColor(doc, C.textMuted);
    doc.setFontSize(8);
    doc.text('CO ZYSKAL/A', MARGIN, y);
    y += 5;
    setColor(doc, C.green);
    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    const gainedLines = wrapText(doc, profile.whatTheyGained, CONTENT_W);
    for (const line of gainedLines) {
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 8;
  }

  // Pain Symmetry
  if (result.painSymmetry && y < A4_H - 60) {
    y += 4;
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('SYMETRIA BOLU', MARGIN, y);
    y += 8;

    setColor(doc, C.purple);
    doc.setFontSize(12);
    doc.setFont('Inter', 'bold');
    doc.text(pdfSafe(`Kto skrzywdzil bardziej: ${result.painSymmetry.whoHurtMore}`), MARGIN, y);
    y += 8;

    const personA = participants[0] ?? 'Osoba A';
    const personB = participants[1] ?? 'Osoba B';

    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');

    // How A hurt B
    const hurtAB = wrapText(doc, `Jak ${personA} ranil/a ${personB}: ${result.painSymmetry.howPersonAHurtB}`, CONTENT_W);
    for (const line of hurtAB) {
      if (y > A4_H - 20) break;
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 3;

    // How B hurt A
    const hurtBA = wrapText(doc, `Jak ${personB} ranil/a ${personA}: ${result.painSymmetry.howPersonBHurtA}`, CONTENT_W);
    for (const line of hurtBA) {
      if (y > A4_H - 20) break;
      doc.text(line, MARGIN, y);
      y += 5;
    }
  }

  drawFooter(doc, 4, 6);
}

function drawPatternsPage(doc: jsPDF, result: EksResult): void {
  drawBg(doc);
  drawCrimsonHeader(doc);
  let y = drawSectionTitle(doc, 16, 'ostrzezenie', 'WZORCE I PROGNOZA');

  // Repeating patterns
  const patterns = result.repeatingPatterns;
  if (patterns) {
    for (const [name, patternList] of Object.entries(patterns)) {
      if (y > A4_H - 40) break;
      setColor(doc, C.crimson);
      doc.setFontSize(10);
      doc.setFont('Inter', 'bold');
      doc.text(pdfSafe(name), MARGIN, y);
      y += 6;

      const items = Array.isArray(patternList) ? patternList : [];
      for (const p of items) {
        if (y > A4_H - 30) break;
        setColor(doc, C.textPrimary);
        doc.setFontSize(9);
        doc.setFont('Inter', 'normal');
        const pText = typeof p === 'object' && p !== null && 'pattern' in p ? (p as { pattern: string }).pattern : String(p);
        const pLines = wrapText(doc, `• ${pText}`, CONTENT_W - 4);
        for (const line of pLines) {
          doc.text(line, MARGIN + 4, y);
          y += 5;
        }
      }
      y += 4;
    }
  }

  // Forecast
  if (result.postBreakupForecast && y < A4_H - 60) {
    y += 4;
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('PROGNOZA PO ROZSTANIU', MARGIN, y);
    y += 8;

    // Comeback probability
    setColor(doc, C.crimson);
    doc.setFontSize(18);
    doc.setFont('Inter', 'bold');
    doc.text(`${result.postBreakupForecast.willTheyComeBack}%`, MARGIN, y);
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.setFont('Inter', 'normal');
    doc.text('szansa na powrot', MARGIN + 30, y - 1);
    y += 10;

    // Reasoning
    if (result.postBreakupForecast.comeBackReasoning) {
      setColor(doc, C.textPrimary);
      doc.setFontSize(9);
      const reasonLines = wrapText(doc, result.postBreakupForecast.comeBackReasoning, CONTENT_W);
      for (const line of reasonLines) {
        if (y > A4_H - 20) break;
        doc.text(line, MARGIN, y);
        y += 5;
      }
    }
  }

  drawFooter(doc, 5, 6);
}

function drawClosingPage(doc: jsPDF, result: EksResult): void {
  drawBg(doc);
  drawCrimsonHeader(doc);

  // Letter TO therapist — patient writes first
  let y = 20;
  if (result.letterToTherapist && Object.keys(result.letterToTherapist.perPerson).length > 0) {
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('POCZEKALNIA', MARGIN, y);
    y += 4;
    setColor(doc, C.gold);
    doc.setFontSize(14);
    doc.setFont('Inter', 'bold');
    doc.text('LIST DO TERAPEUTY', MARGIN, y + 4);
    y += 14;

    for (const [, letter] of Object.entries(result.letterToTherapist.perPerson)) {
      if (y > A4_H - 60) break;

      // Opening
      setColor(doc, C.textPrimary);
      doc.setFontSize(9);
      doc.setFont('Inter', 'normal');
      const openLines = wrapText(doc, pdfSafe(letter.opening), CONTENT_W);
      for (const line of openLines) {
        if (y > A4_H - 40) break;
        doc.text(line, MARGIN, y);
        y += 5;
      }
      y += 3;

      // What happened
      const happenedLines = wrapText(doc, pdfSafe(letter.whatHappened), CONTENT_W);
      for (const line of happenedLines) {
        if (y > A4_H - 40) break;
        doc.text(line, MARGIN, y);
        y += 5;
      }
      y += 3;

      // The question
      setColor(doc, C.gold);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(9);
      const qLines = wrapText(doc, pdfSafe(letter.theQuestion), CONTENT_W);
      for (const line of qLines) {
        if (y > A4_H - 40) break;
        doc.text(line, MARGIN, y);
        y += 5;
      }
      y += 8;
    }
  }

  // Therapist letter — response to patient's letter
  if (result.therapistLetter && y < A4_H - 50) {
    setColor(doc, C.textSecondary);
    doc.setFontSize(8);
    doc.text('GABINET', MARGIN, y);
    y += 4;
    setColor(doc, C.green);
    doc.setFontSize(12);
    doc.setFont('Inter', 'bold');
    doc.text('LIST OD TERAPEUTY', MARGIN, y + 2);
    y += 12;

    for (const [, letter] of Object.entries(result.therapistLetter.perPerson)) {
      if (y > A4_H - 60) break;

      setColor(doc, C.green);
      doc.setFontSize(10);
      doc.setFont('Inter', 'normal');
      doc.text(pdfSafe(letter.dearLine), MARGIN, y);
      y += 7;

      // What I see
      setColor(doc, C.textPrimary);
      doc.setFontSize(9);
      const seeLines = wrapText(doc, letter.whatISee, CONTENT_W);
      for (const line of seeLines) {
        if (y > A4_H - 40) break;
        doc.text(line, MARGIN, y);
        y += 5;
      }
      y += 3;

      // One thing to work on
      setColor(doc, C.green);
      doc.setFontSize(8);
      doc.setFont('Inter', 'bold');
      doc.text('Do przepracowania:', MARGIN, y);
      y += 5;
      doc.setFont('Inter', 'normal');
      doc.setFontSize(9);
      const workLines = wrapText(doc, letter.oneThingToWorkOn, CONTENT_W);
      for (const line of workLines) {
        doc.text(line, MARGIN, y);
        y += 5;
      }
      y += 8;
    }
  }

  // Golden Age
  if (result.goldenAge && y < A4_H - 50) {
    setColor(doc, C.gold);
    doc.setFontSize(8);
    doc.text('WSPOMNIENIA', MARGIN, y);
    y += 6;
    doc.setFontSize(12);
    doc.setFont('Inter', 'bold');
    doc.text('Ale bylo tez cos dobrego.', MARGIN, y);
    y += 8;

    setColor(doc, C.textPrimary);
    doc.setFontSize(9);
    doc.setFont('Inter', 'normal');
    const descLines = wrapText(doc, result.goldenAge.description, CONTENT_W);
    for (const line of descLines) {
      if (y > A4_H - 30) break;
      doc.text(line, MARGIN, y);
      y += 5;
    }
  }

  // Final disclaimer + crisis line
  y = A4_H - 30;
  setColor(doc, C.textMuted);
  doc.setFontSize(7);
  doc.setFont('Inter', 'normal');
  doc.text('Dbaj o siebie. Telefon Zaufania: 116 123 (bezplatny, calodobowy)', A4_W / 2, y, { align: 'center' });
  doc.text('Ta analiza ma charakter rozrywkowy i edukacyjny — nie jest diagnoza psychologiczna.', A4_W / 2, y + 5, { align: 'center' });

  drawFooter(doc, 6, 6);
}

// ── Main export function ────────────────────────────────────

export function generateEksPdf(
  result: EksResult,
  participants: string[],
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  registerFonts(doc);

  // Page 1: Cover
  drawCoverPage(doc, result, participants);

  // Page 2: Phases
  doc.addPage();
  drawPhasesPage(doc, result);

  // Page 3: Autopsy (cause of death + turning point)
  doc.addPage();
  drawAutopsyPage(doc, result);

  // Page 4: Loss Profiles + Pain Symmetry
  doc.addPage();
  drawProfilesPage(doc, result, participants);

  // Page 5: Patterns + Forecast
  doc.addPage();
  drawPatternsPage(doc, result);

  // Page 6: Therapist Letter + Golden Age
  doc.addPage();
  drawClosingPage(doc, result);

  return doc;
}
