/**
 * Network metrics computation for group chat analysis.
 *
 * Builds a weighted interaction graph from sequential message patterns:
 * when person A sends a message immediately after person B (within the
 * same conversation session), that counts as a B->A interaction edge.
 */

import type { UnifiedMessage, NetworkMetrics, NetworkNode, NetworkEdge, ParsedConversation } from '@/lib/parsers/types';

function getSessionGapMs(platform: ParsedConversation['platform']): number {
  return platform === 'discord' ? 2 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
}

export function computeNetworkMetrics(
  messages: UnifiedMessage[],
  participants: string[],
  platform: ParsedConversation['platform'] = 'messenger',
): NetworkMetrics {
  const SESSION_GAP_MS = getSessionGapMs(platform);
  // Build interaction matrix
  const interactions: Record<string, Record<string, number>> = {};
  for (const p of participants) {
    interactions[p] = {};
    for (const q of participants) {
      if (p !== q) interactions[p][q] = 0;
    }
  }

  // Count sequential interactions (A sends, then B sends = A->B interaction)
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.sender === curr.sender) continue;
    if (curr.timestamp - prev.timestamp > SESSION_GAP_MS) continue;
    if (!interactions[prev.sender] || interactions[prev.sender][curr.sender] === undefined) {
      // Handle unknown participants gracefully
      if (!interactions[prev.sender]) {
        interactions[prev.sender] = {};
      }
      if (interactions[prev.sender][curr.sender] === undefined) {
        interactions[prev.sender][curr.sender] = 0;
      }
    }
    interactions[prev.sender][curr.sender]++;
  }

  // Build edges (undirected, combine both directions)
  const edges: NetworkEdge[] = [];
  const processed = new Set<string>();

  for (const from of participants) {
    for (const to of participants) {
      if (from === to) continue;
      const key = [from, to].sort().join('|||');
      if (processed.has(key)) continue;
      processed.add(key);

      const fromToCount = interactions[from]?.[to] ?? 0;
      const toFromCount = interactions[to]?.[from] ?? 0;
      const weight = fromToCount + toFromCount;

      if (weight > 0) {
        edges.push({ from, to, weight, fromToCount, toFromCount });
      }
    }
  }

  // Compute per-person message counts
  const messageCounts: Record<string, number> = {};
  for (const p of participants) {
    messageCounts[p] = 0;
  }
  for (const msg of messages) {
    if (messageCounts[msg.sender] !== undefined) {
      messageCounts[msg.sender]++;
    }
  }

  // Compute centrality (degree centrality: unique connections / max possible)
  const n = participants.length;
  const connections: Record<string, Set<string>> = {};
  for (const p of participants) connections[p] = new Set();
  for (const edge of edges) {
    connections[edge.from].add(edge.to);
    connections[edge.to].add(edge.from);
  }

  const nodes: NetworkNode[] = participants.map(name => ({
    name,
    totalMessages: messageCounts[name] ?? 0,
    centrality: n > 1 ? connections[name].size / (n - 1) : 0,
  }));

  // Density: actual edges with weight > 0 / total possible undirected edges
  const possibleEdges = (n * (n - 1)) / 2;
  const density = possibleEdges > 0 ? edges.length / possibleEdges : 0;

  // Most connected person (highest centrality, tiebreak by message count)
  const mostConnected = nodes.reduce((best, node) =>
    node.centrality > best.centrality
      ? node
      : node.centrality === best.centrality && node.totalMessages > best.totalMessages
        ? node
        : best,
  ).name;

  return { nodes, edges, density, mostConnected };
}
