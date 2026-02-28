/**
 * Bid-Response Ratio — Gottman's "Turning Toward" metric for text.
 *
 * Operationalizes Gottman's finding that couples who stayed together responded
 * to 86% of "bids for connection" vs 33% in divorcing couples.
 *
 * A "bid" = question, personal disclosure, or link-share directed at partner.
 * "Turning toward" = response that addresses the bid within 4h.
 * "Turning away" = ignored or topic-shifted.
 *
 * References:
 * - Gottman, J. M. & Silver, N. (1999). The Seven Principles for Making Marriage Work.
 * - Driver, J. L. & Gottman, J. M. (2004). Daily marital interactions and positive affect
 *   during marital conflict. Family Process, 43(3), 301-314.
 */

import type { UnifiedMessage } from '../../parsers/types';

export interface PersonBidResponse {
  bidsMade: number;
  turnedToward: number;
  turnedAway: number;
  bidsReceived: number;
  bidsRespondedTo: number;
  /** 0-100: % of this person's bids that were acknowledged */
  bidSuccessRate: number;
  /** 0-100: % of partner's bids this person responded to */
  responseRate: number;
}

export interface BidResponseResult {
  perPerson: Record<string, PersonBidResponse>;
  overallResponseRate: number;
  /** Gottman benchmark for stable couples: 86% */
  gottmanBenchmark: number;
  interpretation: string;
}

// Phrases that signal personal disclosure (bids for connection)
const DISCLOSURE_STARTERS = [
  'słuchaj', 'wiesz co', 'pamiętasz', 'wyobraź', 'muszę ci', 'chciałem powiedzieć',
  'chciałam powiedzieć', 'powiem ci', 'właśnie', 'mam coś', 'miałem dzisiaj',
  'miałam dzisiaj', 'coś mi się', 'śmieszy mnie', 'denerwuje mnie', 'boli mnie',
  'listen', 'you know what', 'i wanted to tell', 'i need to tell', 'guess what',
  'something happened', 'you will not believe',
];

// Dismissive tokens that signal turning-away responses
const DISMISS_TOKENS = [
  'spoko', 'nieważne', 'zapomnij', 'daj spokój', 'bez sensu', 'kogo to obchodzi',
  'whatever', 'forget it', 'nevermind', "don't care",
];

function isBid(msg: UnifiedMessage): boolean {
  if (!msg.content) return false;
  const text = msg.content.toLowerCase();
  if (msg.content.includes('?')) return true;
  for (const s of DISCLOSURE_STARTERS) if (text.startsWith(s)) return true;
  if (text.includes('http') || text.includes('www.')) return true;
  return false;
}

type BidResponse = 'toward' | 'away';

function classifyBidResponse(bid: UnifiedMessage, response: UnifiedMessage | undefined): BidResponse {
  if (!response?.content) return 'away';
  if (response.timestamp - bid.timestamp > 4 * 60 * 60 * 1000) return 'away';
  const text = response.content.toLowerCase();
  if (DISMISS_TOKENS.some(t => text.includes(t) && text.length < 30)) return 'away';
  if (response.content.includes('?')) return 'toward';
  if (bid.content) {
    const bidWords = new Set(bid.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const overlap = response.content.toLowerCase().split(/\s+/).filter(w => w.length > 3 && bidWords.has(w)).length;
    if (overlap >= 1) return 'toward';
  }
  if (response.content.trim().length >= 5) return 'toward';
  return 'away';
}

export function computeBidResponseRatio(
  messages: UnifiedMessage[],
  participantNames: string[],
): BidResponseResult | undefined {
  if (participantNames.length < 2) return undefined;

  const stats: Record<string, PersonBidResponse> = {};
  for (const name of participantNames) {
    stats[name] = { bidsMade: 0, turnedToward: 0, turnedAway: 0, bidsReceived: 0, bidsRespondedTo: 0, bidSuccessRate: 0, responseRate: 0 };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!stats[msg.sender] || !isBid(msg)) continue;

    stats[msg.sender].bidsMade++;

    // Find next message from different sender (up to 3 same-sender messages gap)
    let nextMsg: UnifiedMessage | undefined;
    for (let j = i + 1; j < messages.length && j - i <= 4; j++) {
      if (messages[j].sender !== msg.sender) { nextMsg = messages[j]; break; }
    }

    const responseType = classifyBidResponse(msg, nextMsg);
    if (responseType === 'toward') {
      stats[msg.sender].turnedToward++;
      if (nextMsg && stats[nextMsg.sender]) {
        stats[nextMsg.sender].bidsReceived++;
        stats[nextMsg.sender].bidsRespondedTo++;
      }
    } else {
      stats[msg.sender].turnedAway++;
      if (nextMsg && stats[nextMsg.sender]) {
        stats[nextMsg.sender].bidsReceived++;
      }
    }
  }

  for (const name of participantNames) {
    const s = stats[name];
    s.bidSuccessRate = s.bidsMade > 0 ? Math.round((s.turnedToward / s.bidsMade) * 100) : 0;
    s.responseRate = s.bidsReceived > 0 ? Math.round((s.bidsRespondedTo / s.bidsReceived) * 100) : 0;
  }

  const totalBids = Object.values(stats).reduce((a, b) => a + b.bidsMade, 0);
  const totalToward = Object.values(stats).reduce((a, b) => a + b.turnedToward, 0);
  if (totalBids < 10) return undefined;

  const overallRate = Math.round((totalToward / totalBids) * 100);
  const gottmanBenchmark = 86;

  let interpretation: string;
  if (overallRate >= 80) {
    interpretation = `Wysoka responsywność (${overallRate}%) — zbliżona do norm Gottmana dla trwałych par (≥86%).`;
  } else if (overallRate >= 60) {
    interpretation = `Umiarkowana responsywność (${overallRate}%) — poniżej normy Gottmana (86%), ale w zasięgu.`;
  } else {
    interpretation = `Niska responsywność (${overallRate}%) — wyraźnie poniżej normy Gottmana (86%) dla trwałych par.`;
  }

  const perPersonFiltered: Record<string, PersonBidResponse> = {};
  for (const name of participantNames) {
    if (stats[name].bidsMade >= 5) perPersonFiltered[name] = stats[name];
  }

  if (Object.keys(perPersonFiltered).length === 0) return undefined;

  return { perPerson: perPersonFiltered, overallResponseRate: overallRate, gottmanBenchmark, interpretation };
}
