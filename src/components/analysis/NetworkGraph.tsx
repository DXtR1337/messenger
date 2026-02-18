'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import type { NetworkMetrics } from '@/lib/parsers/types';

interface NetworkGraphProps {
  networkMetrics: NetworkMetrics;
  participants: string[];
}

const NODE_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16',
];

interface SimNode {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  totalMessages: number;
  centrality: number;
  color: string;
}

interface SimEdge {
  from: string;
  to: string;
  weight: number;
  fromToCount: number;
  toFromCount: number;
}

/** Map a value from [inMin, inMax] to [outMin, outMax], clamped. */
function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return (outMin + outMax) / 2;
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

export default function NetworkGraph({ networkMetrics, participants }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [simulatedNodes, setSimulatedNodes] = useState<SimNode[]>([]);
  const [simulationDone, setSimulationDone] = useState(false);

  const { nodes, edges, density, mostConnected } = networkMetrics;

  // Compute min/max for scaling
  const messageRange = useMemo(() => {
    const counts = nodes.map(n => n.totalMessages);
    return {
      min: counts.reduce((a, b) => a < b ? a : b, counts[0]),
      max: counts.reduce((a, b) => a > b ? a : b, counts[0]),
    };
  }, [nodes]);

  const weightRange = useMemo(() => {
    const weights = edges.map(e => e.weight);
    if (weights.length === 0) return { min: 0, max: 1 };
    return {
      min: weights.reduce((a, b) => a < b ? a : b, weights[0]),
      max: weights.reduce((a, b) => a > b ? a : b, weights[0]),
    };
  }, [edges]);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 500;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Initialize node positions in a circle
  const initialNodes = useMemo((): SimNode[] => {
    const circleRadius = Math.min(svgWidth, svgHeight) * 0.3;
    return nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      const radius = mapRange(
        node.totalMessages,
        messageRange.min,
        messageRange.max,
        14,
        40,
      );
      return {
        name: node.name,
        x: centerX + circleRadius * Math.cos(angle),
        y: centerY + circleRadius * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius,
        totalMessages: node.totalMessages,
        centrality: node.centrality,
        color: NODE_COLORS[participants.indexOf(node.name) % NODE_COLORS.length],
      };
    });
  }, [nodes, messageRange, centerX, centerY, svgWidth, svgHeight, participants]);

  const simEdges = useMemo((): SimEdge[] => {
    return edges.map(e => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      fromToCount: e.fromToCount,
      toFromCount: e.toFromCount,
    }));
  }, [edges]);

  // Run force simulation on mount
  useEffect(() => {
    if (!isInView) return;

    // Clone initial positions
    const simNodes: SimNode[] = initialNodes.map(n => ({ ...n }));

    // Build adjacency lookup for quick edge checks
    const edgeMap = new Map<string, number>();
    for (const edge of simEdges) {
      const key = [edge.from, edge.to].sort().join('|||');
      edgeMap.set(key, edge.weight);
    }

    // Force simulation parameters
    const kRepulsion = 8000;
    const kAttraction = 0.005;
    const kGravity = 0.02;
    const damping = 0.9;
    const maxIterations = 150;
    const minVelocity = 0.01;

    let iteration = 0;
    let animFrame: number;

    function step() {
      // Apply forces
      for (let a = 0; a < simNodes.length; a++) {
        let fx = 0;
        let fy = 0;

        // Repulsion from all other nodes (Coulomb's law)
        for (let b = 0; b < simNodes.length; b++) {
          if (a === b) continue;
          const dx = simNodes[a].x - simNodes[b].x;
          const dy = simNodes[a].y - simNodes[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const safeDist = Math.max(dist, 1);
          const force = Math.min(kRepulsion / (safeDist * safeDist), 50);
          fx += (dx / safeDist) * force;
          fy += (dy / safeDist) * force;
        }

        // Attraction along edges (Hooke's law)
        for (const edge of simEdges) {
          let other: SimNode | undefined;
          if (edge.from === simNodes[a].name) {
            other = simNodes.find(n => n.name === edge.to);
          } else if (edge.to === simNodes[a].name) {
            other = simNodes.find(n => n.name === edge.from);
          }
          if (!other) continue;

          const dx = other.x - simNodes[a].x;
          const dy = other.y - simNodes[a].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const safeDist = Math.max(dist, 1);
          // Stronger attraction for higher weight edges
          const restLength = 120;
          const strength = kAttraction * (1 + edge.weight / (weightRange.max || 1));
          const force = strength * (dist - restLength);
          fx += (dx / safeDist) * force;
          fy += (dy / safeDist) * force;
        }

        // Center gravity
        const dxCenter = centerX - simNodes[a].x;
        const dyCenter = centerY - simNodes[a].y;
        fx += dxCenter * kGravity;
        fy += dyCenter * kGravity;

        // Update velocity with damping
        simNodes[a].vx = (simNodes[a].vx + fx) * damping;
        simNodes[a].vy = (simNodes[a].vy + fy) * damping;
      }

      // Update positions
      let totalVelocity = 0;
      for (const node of simNodes) {
        node.x += node.vx;
        node.y += node.vy;
        // Keep within bounds (with padding)
        const pad = node.radius + 10;
        node.x = Math.max(pad, Math.min(svgWidth - pad, node.x));
        node.y = Math.max(pad, Math.min(svgHeight - pad, node.y));
        totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
      }

      iteration++;

      // Update state for rendering
      setSimulatedNodes(simNodes.map(n => ({ ...n })));

      // Stop conditions: max iterations reached or system settled
      if (iteration >= maxIterations || totalVelocity < minVelocity * simNodes.length) {
        setSimulationDone(true);
        return;
      }

      animFrame = requestAnimationFrame(step);
    }

    animFrame = requestAnimationFrame(step);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isInView, initialNodes, simEdges, centerX, centerY, svgWidth, svgHeight, weightRange.max]);

  // Use simulated positions or initial as fallback
  const displayNodes = simulatedNodes.length > 0 ? simulatedNodes : initialNodes;

  // Build a lookup for node positions by name
  const nodePositions = useMemo(() => {
    const map = new Map<string, SimNode>();
    for (const node of displayNodes) {
      map.set(node.name, node);
    }
    return map;
  }, [displayNodes]);

  // Determine which edges/nodes are "connected" to hovered node
  const connectedNames = useMemo(() => {
    if (!hoveredNode) return null;
    const connected = new Set<string>([hoveredNode]);
    for (const edge of edges) {
      if (edge.from === hoveredNode) connected.add(edge.to);
      if (edge.to === hoveredNode) connected.add(edge.from);
    }
    return connected;
  }, [hoveredNode, edges]);

  const isEdgeConnected = useCallback(
    (edge: SimEdge): boolean => {
      if (!hoveredNode) return true;
      return edge.from === hoveredNode || edge.to === hoveredNode;
    },
    [hoveredNode],
  );

  const isNodeConnected = useCallback(
    (name: string): boolean => {
      if (!connectedNames) return true;
      return connectedNames.has(name);
    },
    [connectedNames],
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <div role="img" aria-label="Graf interakcji między uczestnikami" className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            <svg className="size-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="6" r="2" />
              <circle cx="19" cy="6" r="2" />
              <circle cx="12" cy="18" r="2" />
              <line x1="5" y1="8" x2="12" y2="16" />
              <line x1="19" y1="8" x2="12" y2="16" />
              <line x1="7" y1="6" x2="17" y2="6" />
            </svg>
            <h3 className="font-display text-[15px] font-bold">Siec interakcji</h3>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            Kto z kim rozmawia w grupie?
          </p>
        </div>

        {/* SVG Graph */}
        <div className="px-5 py-4">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ height: 'auto', aspectRatio: '7 / 5' }}
          >
            {/* Edges */}
            {simEdges.map((edge) => {
              const fromNode = nodePositions.get(edge.from);
              const toNode = nodePositions.get(edge.to);
              if (!fromNode || !toNode) return null;

              const strokeWidth = mapRange(
                edge.weight,
                weightRange.min,
                weightRange.max,
                1,
                6,
              );
              const connected = isEdgeConnected(edge);
              const opacity = hoveredNode ? (connected ? 0.8 : 0.08) : 0.4;

              return (
                <line
                  key={`${edge.from}|||${edge.to}`}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#555"
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-opacity 0.2s ease' }}
                />
              );
            })}

            {/* Nodes */}
            {displayNodes.map((node) => {
              const connected = isNodeConnected(node.name);
              const opacity = hoveredNode ? (connected ? 1 : 0.15) : 1;
              const isHovered = hoveredNode === node.name;

              return (
                <g
                  key={node.name}
                  style={{ transition: 'opacity 0.2s ease' }}
                  opacity={opacity}
                  onMouseEnter={() => setHoveredNode(node.name)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  {/* Glow effect on hover */}
                  {isHovered && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.radius + 6}
                      fill={node.color}
                      opacity={0.15}
                    />
                  )}
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    fill={node.color}
                    opacity={0.85}
                    stroke={isHovered ? '#fff' : node.color}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeOpacity={isHovered ? 0.8 : 0.3}
                  />
                  {/* Message count inside node */}
                  {node.radius >= 20 && (
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#fff"
                      fontSize={node.radius >= 30 ? 11 : 9}
                      fontFamily="var(--font-mono, monospace)"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.totalMessages > 999
                        ? `${(node.totalMessages / 1000).toFixed(1)}k`
                        : node.totalMessages}
                    </text>
                  )}
                  {/* Name label below node */}
                  <text
                    x={node.x}
                    y={node.y + node.radius + 14}
                    textAnchor="middle"
                    fill={isHovered ? '#fafafa' : '#888'}
                    fontSize={12}
                    fontFamily="var(--font-sans, sans-serif)"
                    fontWeight={isHovered ? '600' : '400'}
                    style={{ pointerEvents: 'none', transition: 'fill 0.2s ease' }}
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}

            {/* Edge weight labels on hover */}
            {hoveredNode && simEdges.filter(isEdgeConnected).map((edge) => {
              const fromNode = nodePositions.get(edge.from);
              const toNode = nodePositions.get(edge.to);
              if (!fromNode || !toNode) return null;

              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;

              return (
                <g key={`label-${edge.from}|||${edge.to}`}>
                  <rect
                    x={midX - 18}
                    y={midY - 10}
                    width={36}
                    height={20}
                    rx={4}
                    fill="#111"
                    stroke="#333"
                    strokeWidth={1}
                    opacity={0.9}
                  />
                  <text
                    x={midX}
                    y={midY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fafafa"
                    fontSize={10}
                    fontFamily="var(--font-mono, monospace)"
                    fontWeight="600"
                  >
                    {edge.weight}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Stats footer */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Gestosc sieci:</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {(density * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Najbardziej polaczony:</span>
            <span
              className="font-mono text-sm font-bold"
              style={{
                color: NODE_COLORS[participants.indexOf(mostConnected) % NODE_COLORS.length],
              }}
            >
              {mostConnected}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Uczestnicy:</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {nodes.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Polaczenia:</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {edges.length}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
