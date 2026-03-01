'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── Types ────────────────────────────────────────────────────

type AudioMood =
  | 'heartbeat'
  | 'static'
  | 'spotlight-hum'
  | 'wind'
  | 'whisper'
  | 'paper-rustle'
  | 'rain'
  | 'warmth'
  | 'silence';

interface SynthTrack {
  /** Final output node (connects to master gain) */
  output: GainNode;
  /** Stops all oscillators/schedulers */
  cleanup: () => void;
  mood: AudioMood;
}

export interface UseSceneAudioOptions {
  activeSceneId: string | null;
  enabled: boolean;
}

export interface UseSceneAudioReturn {
  isPlaying: boolean;
  setMasterVolume: (v: number) => void;
  toggleAudio: () => void;
  masterVolume: number;
}

// ── Scene-to-mood mapping ────────────────────────────────────

const SCENE_MOOD_MAP: Record<string, AudioMood> = {
  'eks-intro': 'heartbeat',
  'eks-death-line': 'static',
  'eks-phases': 'static',
  'eks-turning-point': 'spotlight-hum',
  'eks-who-left': 'wind',
  'eks-last-words': 'wind',
  'eks-unsaid': 'whisper',
  'eks-cause-of-death': 'paper-rustle',
  'eks-death-certificate': 'paper-rustle',
  'eks-loss-profiles': 'rain',
  'eks-pain-symmetry': 'rain',
  'eks-patterns': 'rain',
  'eks-therapist-letter': 'warmth',
  'eks-golden-age': 'warmth',
  'eks-forecast': 'silence',
  'eks-epitaph': 'silence',
};

const BASE_VOLUMES: Record<AudioMood, number> = {
  heartbeat: 0.35,
  static: 0.2,
  'spotlight-hum': 0.25,
  wind: 0.3,
  whisper: 0.15,
  'paper-rustle': 0.2,
  rain: 0.25,
  warmth: 0.3,
  silence: 0.08,
};

const FADE_SECONDS = 1.5;
const GAIN_EPSILON = 0.0001;

// ── Noise buffer generators ──────────────────────────────────

function createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown', seconds = 2): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }

  return buffer;
}

// ── Per-mood synthesis recipes ───────────────────────────────

function synthHeartbeat(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 40;

  const envGain = ctx.createGain();
  envGain.gain.value = 0;

  osc.connect(envGain);
  envGain.connect(output);
  osc.start();

  // 72bpm heartbeat: double-pulse at ~833ms intervals
  const BPM_INTERVAL = 60 / 72;
  let running = true;
  let timeoutId: ReturnType<typeof setTimeout>;

  function schedulePulse() {
    if (!running) return;
    const now = ctx.currentTime;
    // Double-thump: two quick pulses
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(1, now + 0.04);
    envGain.gain.linearRampToValueAtTime(0, now + 0.12);
    envGain.gain.linearRampToValueAtTime(0.6, now + 0.2);
    envGain.gain.linearRampToValueAtTime(0, now + 0.32);

    timeoutId = setTimeout(schedulePulse, BPM_INTERVAL * 1000);
  }
  schedulePulse();

  return {
    output,
    mood: 'heartbeat',
    cleanup: () => {
      running = false;
      clearTimeout(timeoutId);
      try { osc.stop(); } catch { /* ok */ }
      try { osc.disconnect(); } catch { /* ok */ }
      try { envGain.disconnect(); } catch { /* ok */ }
    },
  };
}

function synthStatic(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  const noiseBuffer = createNoiseBuffer(ctx, 'white');
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1500;
  bandpass.Q.value = 0.5;

  source.connect(bandpass);
  bandpass.connect(output);
  source.start();

  return {
    output,
    mood: 'static',
    cleanup: () => {
      try { source.stop(); } catch { /* ok */ }
      try { source.disconnect(); } catch { /* ok */ }
      try { bandpass.disconnect(); } catch { /* ok */ }
    },
  };
}

function synthSpotlightHum(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 60;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 120;

  const osc2Gain = ctx.createGain();
  osc2Gain.gain.value = 0.3;

  // Subtle amplitude modulation
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.3;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.15;

  const modGain = ctx.createGain();
  modGain.gain.value = 0.85;

  lfo.connect(lfoGain);
  lfoGain.connect(modGain.gain);

  osc1.connect(modGain);
  osc2.connect(osc2Gain);
  osc2Gain.connect(modGain);
  modGain.connect(output);

  osc1.start();
  osc2.start();
  lfo.start();

  return {
    output,
    mood: 'spotlight-hum',
    cleanup: () => {
      for (const o of [osc1, osc2, lfo]) {
        try { o.stop(); } catch { /* ok */ }
        try { o.disconnect(); } catch { /* ok */ }
      }
      try { osc2Gain.disconnect(); } catch { /* ok */ }
      try { lfoGain.disconnect(); } catch { /* ok */ }
      try { modGain.disconnect(); } catch { /* ok */ }
    },
  };
}

function synthWind(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  const noiseBuffer = createNoiseBuffer(ctx, 'brown', 4);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 400;
  bandpass.Q.value = 1.0;

  // Slow LFO sweeps the filter frequency
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;

  lfo.connect(lfoGain);
  lfoGain.connect(bandpass.frequency);

  source.connect(bandpass);
  bandpass.connect(output);
  lfo.start();
  source.start();

  return {
    output,
    mood: 'wind',
    cleanup: () => {
      try { source.stop(); } catch { /* ok */ }
      try { lfo.stop(); } catch { /* ok */ }
      try { source.disconnect(); } catch { /* ok */ }
      try { bandpass.disconnect(); } catch { /* ok */ }
      try { lfo.disconnect(); } catch { /* ok */ }
      try { lfoGain.disconnect(); } catch { /* ok */ }
    },
  };
}

function synthWhisper(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  const noiseBuffer = createNoiseBuffer(ctx, 'pink', 3);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2000;
  bandpass.Q.value = 3.0;

  // Random volume bursts
  const burstGain = ctx.createGain();
  burstGain.gain.value = 0.3;

  source.connect(bandpass);
  bandpass.connect(burstGain);
  burstGain.connect(output);
  source.start();

  let running = true;
  let timeoutId: ReturnType<typeof setTimeout>;

  function scheduleBurst() {
    if (!running) return;
    const now = ctx.currentTime;
    const delay = 1.5 + Math.random() * 3;
    burstGain.gain.setValueAtTime(0.1, now);
    burstGain.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.4, now + 0.3);
    burstGain.gain.linearRampToValueAtTime(0.1, now + 0.8 + Math.random() * 0.5);
    timeoutId = setTimeout(scheduleBurst, delay * 1000);
  }
  scheduleBurst();

  return {
    output,
    mood: 'whisper',
    cleanup: () => {
      running = false;
      clearTimeout(timeoutId);
      try { source.stop(); } catch { /* ok */ }
      try { source.disconnect(); } catch { /* ok */ }
      try { bandpass.disconnect(); } catch { /* ok */ }
      try { burstGain.disconnect(); } catch { /* ok */ }
    },
  };
}

function synthPaperRustle(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  const noiseBuffer = createNoiseBuffer(ctx, 'white', 1);
  let running = true;
  let timeoutId: ReturnType<typeof setTimeout>;
  const activeSources: AudioBufferSourceNode[] = [];

  function scheduleRustle() {
    if (!running) return;
    const delay = 0.8 + Math.random() * 2.5;

    timeoutId = setTimeout(() => {
      if (!running) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3000 + Math.random() * 3000;

      const envGain = ctx.createGain();
      const now = ctx.currentTime;
      const duration = 0.05 + Math.random() * 0.1;
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.6 + Math.random() * 0.4, now + duration * 0.3);
      envGain.gain.linearRampToValueAtTime(0, now + duration);

      src.connect(hp);
      hp.connect(envGain);
      envGain.connect(output);
      src.start(now);
      src.stop(now + duration + 0.01);
      activeSources.push(src);

      src.onended = () => {
        try { src.disconnect(); } catch { /* ok */ }
        try { hp.disconnect(); } catch { /* ok */ }
        try { envGain.disconnect(); } catch { /* ok */ }
        const idx = activeSources.indexOf(src);
        if (idx >= 0) activeSources.splice(idx, 1);
      };

      scheduleRustle();
    }, delay * 1000);
  }
  scheduleRustle();

  return {
    output,
    mood: 'paper-rustle',
    cleanup: () => {
      running = false;
      clearTimeout(timeoutId);
      for (const s of activeSources) {
        try { s.stop(); } catch { /* ok */ }
        try { s.disconnect(); } catch { /* ok */ }
      }
      activeSources.length = 0;
    },
  };
}

function synthRain(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  // Base rain — white noise through filters
  const noiseBuffer = createNoiseBuffer(ctx, 'white', 3);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 1000;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 3000;
  bandpass.Q.value = 0.8;

  const rainGain = ctx.createGain();
  rainGain.gain.value = 0.7;

  noiseSrc.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(rainGain);
  rainGain.connect(output);
  noiseSrc.start();

  // Random drop clicks
  let running = true;
  let timeoutId: ReturnType<typeof setTimeout>;
  const dropSources: AudioBufferSourceNode[] = [];

  const dropBuffer = createNoiseBuffer(ctx, 'white', 0.05);

  function scheduleDrop() {
    if (!running) return;
    const delay = 0.1 + Math.random() * 0.4;

    timeoutId = setTimeout(() => {
      if (!running) return;
      const src = ctx.createBufferSource();
      src.buffer = dropBuffer;

      const dropHp = ctx.createBiquadFilter();
      dropHp.type = 'highpass';
      dropHp.frequency.value = 4000 + Math.random() * 4000;

      const envGain = ctx.createGain();
      const now = ctx.currentTime;
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.2, now + 0.005);
      envGain.gain.linearRampToValueAtTime(0, now + 0.03);

      src.connect(dropHp);
      dropHp.connect(envGain);
      envGain.connect(output);
      src.start(now);
      src.stop(now + 0.05);
      dropSources.push(src);

      src.onended = () => {
        try { src.disconnect(); } catch { /* ok */ }
        try { dropHp.disconnect(); } catch { /* ok */ }
        try { envGain.disconnect(); } catch { /* ok */ }
        const idx = dropSources.indexOf(src);
        if (idx >= 0) dropSources.splice(idx, 1);
      };

      scheduleDrop();
    }, delay * 1000);
  }
  scheduleDrop();

  return {
    output,
    mood: 'rain',
    cleanup: () => {
      running = false;
      clearTimeout(timeoutId);
      try { noiseSrc.stop(); } catch { /* ok */ }
      try { noiseSrc.disconnect(); } catch { /* ok */ }
      try { highpass.disconnect(); } catch { /* ok */ }
      try { bandpass.disconnect(); } catch { /* ok */ }
      try { rainGain.disconnect(); } catch { /* ok */ }
      for (const s of dropSources) {
        try { s.stop(); } catch { /* ok */ }
        try { s.disconnect(); } catch { /* ok */ }
      }
      dropSources.length = 0;
    },
  };
}

function synthWarmth(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  // Soft pad: detuned sine waves with slow tremolo
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 217;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 223;

  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = 330;

  const osc3Gain = ctx.createGain();
  osc3Gain.gain.value = 0.15;

  // Slow tremolo via LFO
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.1;

  const modGain = ctx.createGain();
  modGain.gain.value = 0.9;

  lfo.connect(lfoGain);
  lfoGain.connect(modGain.gain);

  osc1.connect(modGain);
  osc2.connect(modGain);
  osc3.connect(osc3Gain);
  osc3Gain.connect(modGain);
  modGain.connect(output);

  osc1.start();
  osc2.start();
  osc3.start();
  lfo.start();

  return {
    output,
    mood: 'warmth',
    cleanup: () => {
      for (const o of [osc1, osc2, osc3, lfo]) {
        try { o.stop(); } catch { /* ok */ }
        try { o.disconnect(); } catch { /* ok */ }
      }
      try { osc3Gain.disconnect(); } catch { /* ok */ }
      try { lfoGain.disconnect(); } catch { /* ok */ }
      try { modGain.disconnect(); } catch { /* ok */ }
    },
  };
}

function synthSilence(ctx: AudioContext): SynthTrack {
  const output = ctx.createGain();
  output.gain.value = 0;

  // Near-silent sub-bass hum
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 30;

  osc.connect(output);
  osc.start();

  return {
    output,
    mood: 'silence',
    cleanup: () => {
      try { osc.stop(); } catch { /* ok */ }
      try { osc.disconnect(); } catch { /* ok */ }
    },
  };
}

/** Create a synthesized audio track for the given mood */
function synthMood(ctx: AudioContext, mood: AudioMood): SynthTrack {
  switch (mood) {
    case 'heartbeat': return synthHeartbeat(ctx);
    case 'static': return synthStatic(ctx);
    case 'spotlight-hum': return synthSpotlightHum(ctx);
    case 'wind': return synthWind(ctx);
    case 'whisper': return synthWhisper(ctx);
    case 'paper-rustle': return synthPaperRustle(ctx);
    case 'rain': return synthRain(ctx);
    case 'warmth': return synthWarmth(ctx);
    case 'silence': return synthSilence(ctx);
  }
}

// ── Utility ──────────────────────────────────────────────────

async function ensureRunning(ctx: AudioContext): Promise<boolean> {
  if ((ctx.state as string) === 'running') return true;
  try {
    await ctx.resume();
    return (ctx.state as string) === 'running';
  } catch {
    return false;
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ── Hook ─────────────────────────────────────────────────────

export function useSceneAudio({
  activeSceneId,
  enabled,
}: UseSceneAudioOptions): UseSceneAudioReturn {
  const prefersReduced = useReducedMotion();

  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolumeState] = useState(0.5);
  const [userEnabled, setUserEnabled] = useState(enabled);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeTrackRef = useRef<SynthTrack | null>(null);
  const fadingOutRef = useRef<Set<SynthTrack>>(new Set());
  const mountedRef = useRef(true);
  const gestureAttachedRef = useRef(false);

  const masterVolumeRef = useRef(masterVolume);
  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);

  const shouldPlay = useMemo(
    () => enabled && userEnabled && !prefersReduced,
    [enabled, userEnabled, prefersReduced],
  );

  const targetMood = useMemo<AudioMood | null>(
    () => (activeSceneId ? SCENE_MOOD_MAP[activeSceneId] ?? null : null),
    [activeSceneId],
  );

  // ── AudioContext creation (lazy) ───────────────────────────

  const getOrCreateContext = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;

    const AudioCtx =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined;

    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = masterVolumeRef.current;
      master.connect(ctx.destination);

      ctxRef.current = ctx;
      masterGainRef.current = master;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // ── Fade out + cleanup a synth track ────────────────────────

  const fadeOutTrack = useCallback((track: SynthTrack, fadeSec: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    try {
      track.output.gain.cancelScheduledValues(now);
      track.output.gain.setValueAtTime(
        Math.max(track.output.gain.value, GAIN_EPSILON),
        now,
      );
      track.output.gain.exponentialRampToValueAtTime(GAIN_EPSILON, now + fadeSec);
    } catch {
      track.output.gain.value = GAIN_EPSILON;
    }

    fadingOutRef.current.add(track);

    const cleanupMs = fadeSec * 1000 + 150;
    setTimeout(() => {
      track.cleanup();
      try { track.output.disconnect(); } catch { /* ok */ }
      fadingOutRef.current.delete(track);
    }, cleanupMs);
  }, []);

  // ── Create and fade in a new synth track ────────────────────

  const fadeInTrack = useCallback(
    async (mood: AudioMood, fadeSec: number): Promise<SynthTrack | null> => {
      const ctx = ctxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return null;

      const running = await ensureRunning(ctx);
      if (!running || !mountedRef.current) return null;

      try {
        const track = synthMood(ctx, mood);
        const baseVol = BASE_VOLUMES[mood];
        const targetVol = Math.max(baseVol, GAIN_EPSILON);

        const now = ctx.currentTime;
        track.output.gain.setValueAtTime(GAIN_EPSILON, now);
        track.output.gain.exponentialRampToValueAtTime(targetVol, now + fadeSec);

        track.output.connect(master);
        return track;
      } catch {
        return null;
      }
    },
    [],
  );

  // ── Crossfade orchestrator ─────────────────────────────────

  const crossfadeTo = useCallback(
    async (mood: AudioMood | null) => {
      const current = activeTrackRef.current;

      if (current?.mood === mood) return;

      if (current) {
        fadeOutTrack(current, FADE_SECONDS);
        activeTrackRef.current = null;
      }

      if (!mood) {
        setIsPlaying(false);
        return;
      }

      const newTrack = await fadeInTrack(mood, FADE_SECONDS);
      if (newTrack && mountedRef.current) {
        activeTrackRef.current = newTrack;
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    },
    [fadeOutTrack, fadeInTrack],
  );

  // ── Hard-stop everything ───────────────────────────────────

  const stopAll = useCallback(() => {
    const current = activeTrackRef.current;
    if (current) {
      current.cleanup();
      try { current.output.disconnect(); } catch { /* ok */ }
      activeTrackRef.current = null;
    }

    for (const t of fadingOutRef.current) {
      t.cleanup();
      try { t.output.disconnect(); } catch { /* ok */ }
    }
    fadingOutRef.current.clear();

    setIsPlaying(false);
  }, []);

  // ── User gesture listener (unlocks AudioContext) ───────────

  useEffect(() => {
    if (!shouldPlay || typeof window === 'undefined') return;
    if ((ctxRef.current?.state as string) === 'running') return;
    if (gestureAttachedRef.current) return;

    const handleGesture = () => {
      const ctx = getOrCreateContext();
      if (!ctx) return;

      ensureRunning(ctx).then((ok) => {
        if (!ok || !mountedRef.current) return;
        const mood = activeSceneId
          ? SCENE_MOOD_MAP[activeSceneId] ?? null
          : null;
        if (mood) crossfadeTo(mood);
      });

      document.removeEventListener('click', handleGesture);
      document.removeEventListener('touchstart', handleGesture);
      document.removeEventListener('keydown', handleGesture);
      gestureAttachedRef.current = false;
    };

    gestureAttachedRef.current = true;
    document.addEventListener('click', handleGesture, { passive: true });
    document.addEventListener('touchstart', handleGesture, { passive: true });
    document.addEventListener('keydown', handleGesture, { passive: true });

    return () => {
      document.removeEventListener('click', handleGesture);
      document.removeEventListener('touchstart', handleGesture);
      document.removeEventListener('keydown', handleGesture);
      gestureAttachedRef.current = false;
    };
  }, [shouldPlay, activeSceneId, getOrCreateContext, crossfadeTo]);

  // ── React to scene changes ─────────────────────────────────

  useEffect(() => {
    if (!shouldPlay || !ctxRef.current) return;
    crossfadeTo(targetMood);
  }, [targetMood, shouldPlay, crossfadeTo]);

  // ── React to enabled/disabled toggle ───────────────────────

  useEffect(() => {
    if (!shouldPlay) {
      stopAll();
    } else if (ctxRef.current && targetMood) {
      crossfadeTo(targetMood);
    }
  }, [shouldPlay, stopAll, crossfadeTo, targetMood]);

  // ── Master volume setter ───────────────────────────────────

  const setMasterVolume = useCallback((v: number) => {
    const clamped = clamp01(v);
    setMasterVolumeState(clamped);

    const master = masterGainRef.current;
    const ctx = ctxRef.current;
    if (!master || !ctx) return;

    const now = ctx.currentTime;
    const safeVal = Math.max(clamped, GAIN_EPSILON);
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(
        Math.max(master.gain.value, GAIN_EPSILON),
        now,
      );
      master.gain.exponentialRampToValueAtTime(safeVal, now + 0.1);
    } catch {
      master.gain.value = safeVal;
    }
  }, []);

  const toggleAudio = useCallback(() => {
    setUserEnabled((prev) => !prev);
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    const fadingOut = fadingOutRef.current;

    return () => {
      mountedRef.current = false;

      const current = activeTrackRef.current;
      if (current) {
        current.cleanup();
        try { current.output.disconnect(); } catch { /* ok */ }
        activeTrackRef.current = null;
      }

      for (const t of fadingOut) {
        t.cleanup();
        try { t.output.disconnect(); } catch { /* ok */ }
      }
      fadingOut.clear();

      const ctx = ctxRef.current;
      if (ctx && (ctx.state as string) !== 'closed') {
        ctx.close().catch(() => { /* ignore on unmount */ });
      }
      ctxRef.current = null;
      masterGainRef.current = null;
    };
  }, []);

  return {
    isPlaying,
    setMasterVolume,
    toggleAudio,
    masterVolume,
  };
}

export default useSceneAudio;
