/**
 * Team role detection + community detection for groups with 5+ participants.
 *
 * Role detection uses per-person signals derived from existing quantitative
 * metrics (centrality, message share, initiation rate, etc.).
 *
 * Community detection uses simplified modularity-based clustering from
 * the network edge weights.
 */

import type {
  QuantitativeAnalysis,
  NetworkMetrics,
  NetworkEdge,
  ParsedConversation,
  TeamRoleType,
  TeamRoleScores,
  TeamRole,
  Community,
  TeamAnalysis,
} from '@/lib/parsers/types';

// Re-export types so UI components can import from this module
export type { TeamRoleType, TeamRoleScores, TeamRole, Community, TeamAnalysis };

// ============================================================
// Constants
// ============================================================

const ROLE_EMOJI: Record<TeamRoleType, string> = {
  lider: '\u{1F451}',
  mediator: '\u{1F91D}',
  prowokator: '\u{1F525}',
  lurker: '\u{1F47B}',
  nucleus: '\u{269B}\uFE0F',
  outsider: '\u{1F6F0}\uFE0F',
};

// ============================================================
// Signal Computation
// ============================================================

interface PersonSignals {
  name: string;
  centrality: number;
  messageShare: number;
  initiationRate: number;
  doubleTextRate: number;
  lateNightRate: number;
  reciprocalStrength: number;
}

function computePersonSignals(
  quant: QuantitativeAnalysis,
  conversation: ParsedConversation,
): PersonSignals[] {
  const names = conversation.participants.map(p => p.name);
  const messages = conversation.messages;
  const totalMessages = messages.length;

  // Per-person message counts
  const msgCounts: Record<string, number> = {};
  for (const name of names) {
    msgCounts[name] = quant.perPerson[name]?.totalMessages ?? 0;
  }

  // Centrality from network metrics
  const centralityMap: Record<string, number> = {};
  if (quant.networkMetrics) {
    for (const node of quant.networkMetrics.nodes) {
      centralityMap[node.name] = node.centrality;
    }
  }

  // Session-based initiation counting
  const SESSION_GAP = conversation.platform === 'discord'
    ? 2 * 60 * 60 * 1000
    : 6 * 60 * 60 * 1000;

  const initiations: Record<string, number> = {};
  let sessionCount = 0;

  for (const name of names) initiations[name] = 0;

  if (messages.length > 0) {
    initiations[messages[0].sender] = (initiations[messages[0].sender] ?? 0) + 1;
    sessionCount = 1;

    for (let i = 1; i < messages.length; i++) {
      if (messages[i].timestamp - messages[i - 1].timestamp > SESSION_GAP) {
        sessionCount++;
        initiations[messages[i].sender] = (initiations[messages[i].sender] ?? 0) + 1;
      }
    }
  }

  // Double texts: consecutive messages from same person
  const doubleTexts: Record<string, number> = {};
  for (const name of names) doubleTexts[name] = 0;

  for (let i = 1; i < messages.length; i++) {
    if (messages[i].sender === messages[i - 1].sender) {
      doubleTexts[messages[i].sender] = (doubleTexts[messages[i].sender] ?? 0) + 1;
    }
  }

  // Late night messages (0:00-5:00)
  const lateNightCounts: Record<string, number> = {};
  for (const name of names) lateNightCounts[name] = 0;

  for (const msg of messages) {
    const hour = new Date(msg.timestamp).getHours();
    if (hour >= 0 && hour < 5) {
      lateNightCounts[msg.sender] = (lateNightCounts[msg.sender] ?? 0) + 1;
    }
  }

  // Reciprocal strength: sum of edge weights where both directions are strong
  const reciprocalStrengthMap: Record<string, number> = {};
  for (const name of names) reciprocalStrengthMap[name] = 0;

  if (quant.networkMetrics) {
    const maxWeight = Math.max(...quant.networkMetrics.edges.map(e => e.weight), 1);
    const threshold = maxWeight * 0.3;

    for (const edge of quant.networkMetrics.edges) {
      if (edge.fromToCount > threshold && edge.toFromCount > threshold) {
        reciprocalStrengthMap[edge.from] = (reciprocalStrengthMap[edge.from] ?? 0) + edge.weight;
        reciprocalStrengthMap[edge.to] = (reciprocalStrengthMap[edge.to] ?? 0) + edge.weight;
      }
    }
  }

  const avgMsgCount = totalMessages / Math.max(names.length, 1);

  return names.map(name => {
    const personTotal = msgCounts[name] ?? 0;

    return {
      name,
      centrality: centralityMap[name] ?? 0,
      messageShare: avgMsgCount > 0 ? personTotal / avgMsgCount : 0,
      initiationRate: sessionCount > 0 ? (initiations[name] ?? 0) / sessionCount : 0,
      doubleTextRate: personTotal > 0 ? (doubleTexts[name] ?? 0) / personTotal : 0,
      lateNightRate: personTotal > 0 ? (lateNightCounts[name] ?? 0) / personTotal : 0,
      reciprocalStrength: reciprocalStrengthMap[name] ?? 0,
    };
  });
}

// ============================================================
// Role Classification (priority order)
// ============================================================

function classifyRole(
  person: PersonSignals,
  avgSignals: PersonSignals,
  medianReciprocalStrength: number,
): { role: TeamRoleType; confidence: number; evidence: string[] } {
  const { centrality, messageShare, initiationRate, doubleTextRate, lateNightRate, reciprocalStrength } = person;

  // 1. Lurker: very low message share
  if (messageShare < 0.25) {
    return {
      role: 'lurker',
      confidence: Math.min(95, Math.round(70 + (0.25 - messageShare) * 100)),
      evidence: [
        `Udział w rozmowie: ${(messageShare * 100).toFixed(0)}% średniej`,
        centrality < 0.3 ? 'Minimalny kontakt z innymi' : 'Głównie obserwuje',
      ],
    };
  }

  // 2. Outsider: low centrality + below-average messages
  if (centrality < 0.3 && messageShare < 0.6) {
    return {
      role: 'outsider',
      confidence: Math.min(90, Math.round(60 + (0.6 - messageShare) * 50)),
      evidence: [
        `Centralność: ${(centrality * 100).toFixed(0)}%`,
        `Udział w rozmowie: ${(messageShare * 100).toFixed(0)}% średniej`,
        'Na obrzeżach dynamiki grupowej',
      ],
    };
  }

  // 3. Lider: high centrality + high message share + initiates
  if (centrality >= 0.7 && messageShare >= 1.0 && initiationRate >= avgSignals.initiationRate) {
    return {
      role: 'lider',
      confidence: Math.min(95, Math.round(65 + centrality * 30)),
      evidence: [
        `Centralność: ${(centrality * 100).toFixed(0)}%`,
        `Inicjuje ${(initiationRate * 100).toFixed(0)}% sesji`,
        `Udział: ${(messageShare * 100).toFixed(0)}% średniej`,
      ],
    };
  }

  // 4. Mediator: high centrality but moderate messaging
  if (centrality >= 0.6 && messageShare < 1.2) {
    return {
      role: 'mediator',
      confidence: Math.min(85, Math.round(55 + centrality * 30)),
      evidence: [
        `Centralność: ${(centrality * 100).toFixed(0)}% — łączy wielu`,
        'Nie dominuje ilościowo',
        'Utrzymuje kontakt z różnymi osobami',
      ],
    };
  }

  // 5. Prowokator: high double-text or late-night rate
  if (doubleTextRate > avgSignals.doubleTextRate * 1.5 || lateNightRate > avgSignals.lateNightRate * 1.5) {
    const evidence: string[] = [];
    if (doubleTextRate > avgSignals.doubleTextRate * 1.5) {
      evidence.push(`Double-texty: ${(doubleTextRate * 100).toFixed(1)}%`);
    }
    if (lateNightRate > avgSignals.lateNightRate * 1.5) {
      evidence.push(`Nocne wiadomości: ${(lateNightRate * 100).toFixed(1)}%`);
    }
    evidence.push('Intensywny styl komunikacji');

    return {
      role: 'prowokator',
      confidence: Math.min(80, 55 + Math.round(
        Math.max(
          doubleTextRate / Math.max(avgSignals.doubleTextRate, 0.01) * 10,
          lateNightRate / Math.max(avgSignals.lateNightRate, 0.01) * 10,
        ),
      )),
      evidence,
    };
  }

  // 6. Nucleus: high reciprocal strength
  if (reciprocalStrength > medianReciprocalStrength * 1.3 && medianReciprocalStrength > 0) {
    return {
      role: 'nucleus',
      confidence: Math.min(80, Math.round(55 + (reciprocalStrength / Math.max(medianReciprocalStrength, 1)) * 15)),
      evidence: [
        'Silne wzajemne relacje',
        `Reciprocal strength: ${reciprocalStrength.toFixed(0)}`,
        'Rdzeń tight-knit grupy',
      ],
    };
  }

  // Default fallback — assign based on strongest signal
  if (messageShare >= 1.0) {
    return {
      role: 'nucleus',
      confidence: 45,
      evidence: [
        `Aktywny uczestnik (${(messageShare * 100).toFixed(0)}% średniej)`,
        'Brak wyraźnej specjalizacji',
      ],
    };
  }

  return {
    role: 'mediator',
    confidence: 40,
    evidence: [
      'Zrównoważony profil',
      'Brak wyróżniającej się cechy',
    ],
  };
}

// ============================================================
// Community Detection (simplified modularity)
// ============================================================

function detectCommunities(
  names: string[],
  edges: NetworkEdge[],
): Community[] {
  const n = names.length;
  if (n <= 2) {
    return [{
      id: 0,
      label: 'Rdzeń',
      members: [...names],
      cohesion: 100,
    }];
  }

  // Adjacency matrix
  const adj: Record<string, Record<string, number>> = {};
  for (const name of names) {
    adj[name] = {};
    for (const other of names) adj[name][other] = 0;
  }
  for (const edge of edges) {
    adj[edge.from][edge.to] = edge.weight;
    adj[edge.to][edge.from] = edge.weight;
  }

  // Start: each person in their own community
  const communityOf: Record<string, number> = {};
  for (let i = 0; i < names.length; i++) {
    communityOf[names[i]] = i;
  }

  const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0) || 1;

  // Iteratively move people to the community of their strongest neighbor
  for (let iter = 0; iter < 10; iter++) {
    let changed = false;

    for (const person of names) {
      // Find strongest neighbor's community
      let bestWeight = 0;
      let bestCommunity = communityOf[person];

      const communityWeights: Record<number, number> = {};
      for (const other of names) {
        if (other === person) continue;
        const w = adj[person][other];
        if (w > 0) {
          const c = communityOf[other];
          communityWeights[c] = (communityWeights[c] ?? 0) + w;
        }
      }

      for (const [cStr, w] of Object.entries(communityWeights)) {
        if (w > bestWeight) {
          bestWeight = w;
          bestCommunity = parseInt(cStr, 10);
        }
      }

      if (bestCommunity !== communityOf[person]) {
        communityOf[person] = bestCommunity;
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group by community
  const groups: Record<number, string[]> = {};
  for (const name of names) {
    const c = communityOf[name];
    if (!groups[c]) groups[c] = [];
    groups[c].push(name);
  }

  // Sort communities by size (largest first)
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

  // Compute cohesion and detect bridge persons
  const communities: Community[] = sortedGroups.map(([, members], idx) => {
    // Cohesion: internal edges / possible internal edges
    let internalWeight = 0;
    let possiblePairs = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        internalWeight += adj[members[i]][members[j]];
        possiblePairs++;
      }
    }

    const maxPossibleWeight = possiblePairs > 0
      ? possiblePairs * Math.max(...edges.map(e => e.weight), 1)
      : 1;

    const cohesion = Math.round(
      Math.min(100, (internalWeight / maxPossibleWeight) * 100),
    );

    const label = idx === 0 ? 'Rdzeń' : `Klika ${idx + 1}`;

    return { id: idx, members, label, cohesion };
  });

  // Find bridge persons: people with strong edges to multiple communities
  for (const name of names) {
    const myCommunity = communityOf[name];
    const externalCommunities = new Set<number>();

    for (const other of names) {
      if (other === name) continue;
      if (adj[name][other] > 0 && communityOf[other] !== myCommunity) {
        externalCommunities.add(communityOf[other]);
      }
    }

    if (externalCommunities.size >= 1) {
      const comm = communities.find(c => c.members.includes(name));
      if (comm && !comm.bridgePerson) {
        comm.bridgePerson = name;
      }
    }
  }

  return communities;
}

// ============================================================
// Main Export
// ============================================================

export function computeTeamAnalysis(
  quant: QuantitativeAnalysis,
  conversation: ParsedConversation,
): TeamAnalysis | undefined {
  const names = conversation.participants.map(p => p.name);

  // Only for groups with 5+ participants
  if (!conversation.metadata.isGroup || names.length < 5) {
    return undefined;
  }

  if (!quant.networkMetrics) return undefined;

  const signals = computePersonSignals(quant, conversation);

  // Compute average signals
  const avgSignals: PersonSignals = {
    name: 'avg',
    centrality: signals.reduce((s, p) => s + p.centrality, 0) / signals.length,
    messageShare: 1, // by definition, average is 1.0
    initiationRate: signals.reduce((s, p) => s + p.initiationRate, 0) / signals.length,
    doubleTextRate: signals.reduce((s, p) => s + p.doubleTextRate, 0) / signals.length,
    lateNightRate: signals.reduce((s, p) => s + p.lateNightRate, 0) / signals.length,
    reciprocalStrength: signals.reduce((s, p) => s + p.reciprocalStrength, 0) / signals.length,
  };

  // Median reciprocal strength
  const sortedReciprocal = signals.map(s => s.reciprocalStrength).sort((a, b) => a - b);
  const midIdx = Math.floor(sortedReciprocal.length / 2);
  const medianReciprocalStrength = sortedReciprocal.length % 2 === 0
    ? (sortedReciprocal[midIdx - 1] + sortedReciprocal[midIdx]) / 2
    : sortedReciprocal[midIdx];

  // Classify each person
  const roles: TeamRole[] = signals.map(person => {
    const { role, confidence, evidence } = classifyRole(person, avgSignals, medianReciprocalStrength);

    return {
      name: person.name,
      role,
      confidence,
      evidence,
      scores: {
        centrality: person.centrality,
        messageShare: person.messageShare,
        initiationRate: person.initiationRate,
        doubleTextRate: person.doubleTextRate,
        lateNightRate: person.lateNightRate,
        reciprocalStrength: person.reciprocalStrength,
      },
    };
  });

  // Sort by confidence descending
  roles.sort((a, b) => b.confidence - a.confidence);

  // Community detection
  const communities = detectCommunities(names, quant.networkMetrics.edges);

  return { roles, communities };
}
