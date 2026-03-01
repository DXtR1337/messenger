/**
 * SCENE_THEMES — per-scene color system for EKS V4 scrollytelling.
 * CSS custom properties switched via IntersectionObserver in useSceneManager.
 * IDs must match the HTML id attributes on Scene elements (eks-* prefix).
 */

export interface SceneTheme {
  id: string;
  label: string;
  bg: string;
  accent: string;
  glow: string;
  text: string;
  muted: string;
  mood: string;
}

export const SCENE_THEMES: SceneTheme[] = [
  {
    id: 'eks-intro',
    label: 'Sekcja Zwłok',
    bg: '#0a0404',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.15)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'clinical',
  },
  {
    id: 'eks-quiz-comparison',
    label: 'Quiz vs AI',
    bg: '#0a0404',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.12)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'confrontation',
  },
  {
    id: 'eks-death-line',
    label: 'Linia Śmierci',
    bg: '#0a0404',
    accent: '#ec4899',
    glow: 'rgba(236,72,153,0.12)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'analytical',
  },
  {
    id: 'eks-phases',
    label: 'Fazy Rozpadu',
    bg: '#0a0404',
    accent: '#b45309',
    glow: 'rgba(180,83,9,0.12)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'deterioration',
  },
  {
    id: 'eks-turning-point',
    label: 'Moment Prawdy',
    bg: '#050202',
    accent: '#991b1b',
    glow: 'rgba(153,27,27,0.25)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'spotlight',
  },
  {
    id: 'eks-who-left',
    label: 'Kto Odszedł',
    bg: '#0a0404',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.1)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'confrontation',
  },
  {
    id: 'eks-last-words',
    label: 'Ostatnie Słowa',
    bg: '#0a0404',
    accent: '#991b1b',
    glow: 'rgba(153,27,27,0.1)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'whisper',
  },
  {
    id: 'eks-unsaid',
    label: 'Niewypowiedziane',
    bg: '#080406',
    accent: '#7c3aed',
    glow: 'rgba(124,58,237,0.1)',
    text: '#d4a07a',
    muted: '#5b3a6b',
    mood: 'haunting',
  },
  {
    id: 'eks-cause-of-death',
    label: 'Raport z Sekcji',
    bg: '#0a0404',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.12)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'clinical',
  },
  {
    id: 'eks-death-certificate',
    label: 'Akt Zgonu',
    bg: '#0a0606',
    accent: '#b45309',
    glow: 'rgba(180,83,9,0.1)',
    text: '#d4a07a',
    muted: '#6b5a3a',
    mood: 'formal',
  },
  {
    id: 'eks-loss-profiles',
    label: 'Profil Straty',
    bg: '#0a0404',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.08)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'reflective',
  },
  {
    id: 'eks-pain-symmetry',
    label: 'Symetria Bólu',
    bg: '#080206',
    accent: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    text: '#d4a07a',
    muted: '#6b3a6b',
    mood: 'empathic',
  },
  {
    id: 'eks-patterns',
    label: 'Wzorce',
    bg: '#0a0404',
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.12)',
    text: '#d4a07a',
    muted: '#6b5a3a',
    mood: 'warning',
  },
  {
    id: 'eks-letter-to-therapist',
    label: 'List do Terapeuty',
    bg: '#0a0804',
    accent: '#d4a07a',
    glow: 'rgba(212,160,122,0.10)',
    text: '#d4a07a',
    muted: '#6b5a3a',
    mood: 'whisper',
  },
  {
    id: 'eks-therapist-letter',
    label: 'List od Terapeuty',
    bg: '#060808',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.12)',
    text: '#d4a07a',
    muted: '#3a6b5a',
    mood: 'healing',
  },
  {
    id: 'eks-golden-age',
    label: 'Złoty Okres',
    bg: '#0a0804',
    accent: '#d4a07a',
    glow: 'rgba(212,160,122,0.15)',
    text: '#d4a07a',
    muted: '#8b7355',
    mood: 'warm',
  },
  {
    id: 'eks-forecast',
    label: 'Prognoza',
    bg: '#0a0404',
    accent: '#dc2626',
    glow: 'rgba(220,38,38,0.1)',
    text: '#d4a07a',
    muted: '#6b3a3a',
    mood: 'uncertain',
  },
  {
    id: 'eks-epitaph',
    label: 'Epitafium',
    bg: '#050505',
    accent: '#d4a07a',
    glow: 'rgba(212,160,122,0.1)',
    text: '#d4a07a',
    muted: '#4a4a4a',
    mood: 'closure',
  },
];

/** Map from scene id to theme index for O(1) lookup */
export const SCENE_THEME_MAP = new Map(SCENE_THEMES.map((t, i) => [t.id, i]));

/** Apply scene theme as CSS custom properties on container element */
export function applySceneTheme(el: HTMLElement, theme: SceneTheme): void {
  el.style.setProperty('--eks-bg', theme.bg);
  el.style.setProperty('--eks-accent', theme.accent);
  el.style.setProperty('--eks-glow', theme.glow);
  el.style.setProperty('--eks-text', theme.text);
  el.style.setProperty('--eks-muted', theme.muted);
}
