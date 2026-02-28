'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = {
  blue: new THREE.Color('#3b82f6'),
  purple: new THREE.Color('#a855f7'),
  green: new THREE.Color('#10b981'),
} as const;

/** Probability thresholds for color distribution: 60% blue, 25% purple, 15% green */
const COLOR_THRESHOLDS = { blue: 0.6, purple: 0.85 } as const;

const BOX_SIZE = { x: 20, y: 15, z: 12 } as const;
const CONNECTION_DISTANCE = 2.5;
const ROTATION_SPEED = 0.00015; // rad per frame at 60fps
const OSCILLATION_SPEED = 0.3;
const OSCILLATION_AMPLITUDE = 0.002;
const MOUSE_PARALLAX_MAX = 0.3;
const MOUSE_LERP_FACTOR = 0.05;
const SCROLL_CAMERA_RANGE = 4; // camera Y drifts 0 to -4

// ---------------------------------------------------------------------------
// Helpers — deterministic seeded random for reproducible constellations
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Pick a color based on probability distribution */
function pickColor(rand: number): THREE.Color {
  if (rand < COLOR_THRESHOLDS.blue) return COLORS.blue;
  if (rand < COLOR_THRESHOLDS.purple) return COLORS.purple;
  return COLORS.green;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

interface ConnectionData {
  positions: Float32Array;
  count: number; // number of line segment vertices (pairs)
}

// ---------------------------------------------------------------------------
// Generate particle constellation data
// ---------------------------------------------------------------------------

function generateParticles(count: number, seed: number): ParticleData {
  const rand = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Random position within bounding box, centered at origin
    positions[i3] = (rand() - 0.5) * BOX_SIZE.x;
    positions[i3 + 1] = (rand() - 0.5) * BOX_SIZE.y;
    positions[i3 + 2] = (rand() - 0.5) * BOX_SIZE.z;

    // Color assignment
    const color = pickColor(rand());
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    // Size: 2-4px equivalent
    sizes[i] = 2 + rand() * 2;
  }

  return { positions, colors, sizes, count };
}

// ---------------------------------------------------------------------------
// Generate static connection lines between nearby particles
// ---------------------------------------------------------------------------

function generateConnections(particles: ParticleData): ConnectionData {
  const { positions, count } = particles;
  const distSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

  // First pass: count connections to allocate exact buffer size
  let connectionCount = 0;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < distSq) {
        connectionCount++;
      }
    }
  }

  // Each connection = 2 vertices * 3 components
  const linePositions = new Float32Array(connectionCount * 6);
  let offset = 0;

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const i3 = i * 3;
      const j3 = j * 3;
      const dx = positions[i3] - positions[j3];
      const dy = positions[i3 + 1] - positions[j3 + 1];
      const dz = positions[i3 + 2] - positions[j3 + 2];
      if (dx * dx + dy * dy + dz * dz < distSq) {
        linePositions[offset] = positions[i3];
        linePositions[offset + 1] = positions[i3 + 1];
        linePositions[offset + 2] = positions[i3 + 2];
        linePositions[offset + 3] = positions[j3];
        linePositions[offset + 4] = positions[j3 + 1];
        linePositions[offset + 5] = positions[j3 + 2];
        offset += 6;
      }
    }
  }

  return { positions: linePositions, count: connectionCount * 2 };
}

// ---------------------------------------------------------------------------
// Inner scene component (runs inside Canvas context)
// ---------------------------------------------------------------------------

interface SceneInnerProps {
  scrollProgress: MotionValue<number>;
  isMobile: boolean;
  particleCount: number;
}

function SceneInner({ scrollProgress, isMobile, particleCount }: SceneInnerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();

  // Smoothed mouse position for lerp parallax
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });

  // Base camera position (stored once to avoid recalculation)
  const baseCameraPos = useRef(new THREE.Vector3(0, 0, 8));

  // Generate particle + connection data once
  const particles = useMemo(
    () => generateParticles(particleCount, 42),
    [particleCount],
  );

  const connections = useMemo(
    () => generateConnections(particles),
    [particles],
  );

  // Store original Y positions for per-particle oscillation
  const originalY = useMemo(() => {
    const y = new Float32Array(particles.count);
    for (let i = 0; i < particles.count; i++) {
      y[i] = particles.positions[i * 3 + 1];
    }
    return y;
  }, [particles]);

  // Mouse move handler (desktop only)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Normalize to -1..1
    mouseTarget.current.x =
      (e.clientX / window.innerWidth - 0.5) * 2 * MOUSE_PARALLAX_MAX;
    mouseTarget.current.y =
      -(e.clientY / window.innerHeight - 0.5) * 2 * MOUSE_PARALLAX_MAX;
  }, []);

  useEffect(() => {
    if (isMobile) return;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isMobile, handleMouseMove]);

  // Animation loop
  useFrame((_state, delta) => {
    // Clamp delta to avoid huge jumps on tab-switch
    const dt = Math.min(delta, 0.1);
    const time = _state.clock.elapsedTime;

    // --- Group rotation (slow drift) ---
    if (groupRef.current) {
      // Frame-rate independent: convert per-frame speed to per-second
      groupRef.current.rotation.y += ROTATION_SPEED * (dt * 60);
    }

    // --- Per-particle vertical oscillation ---
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particles.count; i++) {
        posArray[i * 3 + 1] =
          originalY[i] +
          Math.sin(time * OSCILLATION_SPEED + i * 0.1) * OSCILLATION_AMPLITUDE;
      }
      posAttr.needsUpdate = true;
    }

    // --- Scroll parallax: camera Y ---
    const scroll = scrollProgress.get();
    const scrollY = -scroll * SCROLL_CAMERA_RANGE;

    // --- Mouse parallax (desktop): smooth lerp ---
    if (!isMobile) {
      mouseCurrent.current.x +=
        (mouseTarget.current.x - mouseCurrent.current.x) * MOUSE_LERP_FACTOR;
      mouseCurrent.current.y +=
        (mouseTarget.current.y - mouseCurrent.current.y) * MOUSE_LERP_FACTOR;
    }

    camera.position.set(
      baseCameraPos.current.x + mouseCurrent.current.x,
      baseCameraPos.current.y + scrollY + mouseCurrent.current.y,
      baseCameraPos.current.z,
    );
  });

  return (
    <>
      {/* Fog: particles fade into deep black */}
      <fog attach="fog" args={['#050505', 6, 20]} />

      <group ref={groupRef}>
        {/* Particle points */}
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particles.positions, 3]}
              count={particles.count}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[particles.colors, 3]}
              count={particles.count}
            />
            <bufferAttribute
              attach="attributes-size"
              args={[particles.sizes, 1]}
              count={particles.count}
            />
          </bufferGeometry>
          <pointsMaterial
            vertexColors
            sizeAttenuation
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Connection lines between nearby particles */}
        {connections.count > 0 && (
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[connections.positions, 3]}
                count={connections.count}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#3b82f6"
              transparent
              opacity={0.04}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </lineSegments>
        )}
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface MetricsScene3DProps {
  scrollProgress: MotionValue<number>;
  isMobile?: boolean;
}

export default function MetricsScene3D({
  scrollProgress,
  isMobile = false,
}: MetricsScene3DProps) {
  const particleCount = isMobile ? 60 : 150;

  return (
    <Canvas
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: 'low-power',
      }}
      dpr={[1, 1.5]}
      frameloop="always"
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <SceneInner
        scrollProgress={scrollProgress}
        isMobile={isMobile}
        particleCount={particleCount}
      />
    </Canvas>
  );
}
