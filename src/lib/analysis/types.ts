/**
 * TypeScript interfaces for AI analysis results.
 * These mirror the JSON schemas defined in prompts.ts exactly.
 */

import type { ParsedConversation, QuantitativeAnalysis } from '../parsers/types';
import type { CPSResult } from './communication-patterns';
import type { SubtextResult } from './subtext';
import type { DelusionQuizResult } from './delusion-quiz';
import type { CourtResult } from './court-prompts';
import type { DatingProfileResult } from './dating-profile-prompts';
import type { CoupleQuizComparison } from './couple-quiz';

// ============================================================
// PASS 1: Overview — Tone, Style, Relationship Type
// ============================================================

export interface RelationshipType {
  category: 'romantic' | 'friendship' | 'family' | 'professional' | 'acquaintance';
  sub_type: string;
  confidence: number;
}

export interface PersonTone {
  primary_tone: string;
  secondary_tones: string[];
  formality_level: number;
  humor_presence: number;
  humor_style:
  | 'self-deprecating'
  | 'teasing'
  | 'absurdist'
  | 'sarcastic'
  | 'wordplay'
  | 'absent';
  warmth: number;
  confidence: number;
  evidence_indices: number[];
}

export interface OverallDynamic {
  description: string;
  energy: 'high' | 'medium' | 'low';
  balance: 'balanced' | 'person_a_dominant' | 'person_b_dominant';
  trajectory: 'warming' | 'stable' | 'cooling' | 'volatile';
  confidence: number;
}

export interface Pass1Result {
  relationship_type: RelationshipType;
  tone_per_person: Record<string, PersonTone>;
  overall_dynamic: OverallDynamic;
}

// ============================================================
// PASS 2: Dynamics — Power, Conflict, Intimacy
// ============================================================

export interface PowerDynamics {
  /** -100 = Person A dominates, 100 = Person B dominates, 0 = balanced */
  balance_score: number;
  who_adapts_more: string;
  adaptation_type: 'linguistic' | 'emotional' | 'topical' | 'scheduling';
  evidence: string[];
  confidence: number;
}

export interface EmotionalLaborPattern {
  type:
  | 'comforting'
  | 'checking_in'
  | 'remembering_details'
  | 'managing_mood'
  | 'initiating_plans'
  | 'emotional_support';
  performed_by: string;
  frequency: 'frequent' | 'occasional' | 'rare';
  evidence_indices: number[];
}

export interface EmotionalLabor {
  primary_caregiver: string;
  patterns: EmotionalLaborPattern[];
  balance_score: number;
  confidence: number;
}

export interface ConflictPatterns {
  conflict_frequency: 'none_observed' | 'rare' | 'occasional' | 'frequent';
  typical_trigger: string | null;
  resolution_style: Record<
    string,
    | 'direct_confrontation'
    | 'avoidant'
    | 'passive_aggressive'
    | 'apologetic'
    | 'deflecting'
    | 'humor'
  >;
  unresolved_tensions: string[];
  confidence: number;
}

export interface VulnerabilityProfile {
  score: number;
  examples: string[];
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface SharedLanguage {
  inside_jokes: number;
  pet_names: boolean;
  unique_phrases: string[];
  language_mirroring: number;
}

export interface IntimacyMarkers {
  vulnerability_level: Record<string, VulnerabilityProfile>;
  shared_language: SharedLanguage;
  confidence: number;
}

export interface RedFlag {
  pattern: string;
  severity: 'mild' | 'moderate' | 'severe';
  context_note?: string;
  evidence_indices: number[];
  confidence: number;
}

export interface GreenFlag {
  pattern: string;
  evidence_indices: number[];
  confidence: number;
}

export interface Pass2Result {
  power_dynamics: PowerDynamics;
  emotional_labor: EmotionalLabor;
  conflict_patterns: ConflictPatterns;
  intimacy_markers: IntimacyMarkers;
  relationship_phase?: 'new' | 'developing' | 'established' | 'long_term';
  red_flags: RedFlag[];
  green_flags: GreenFlag[];
}

// ============================================================
// PASS 3: Individual Profiles — Personality, Attachment
// ============================================================

export interface BigFiveTrait {
  /** Low and high end of the estimated range, each 1-10 */
  range: [number, number];
  evidence: string;
  confidence: number;
}

export interface BigFiveApproximation {
  openness: BigFiveTrait;
  conscientiousness: BigFiveTrait;
  extraversion: BigFiveTrait;
  agreeableness: BigFiveTrait;
  neuroticism: BigFiveTrait;
}

export interface AttachmentIndicator {
  behavior: string;
  attachment_relevance: string;
  evidence_indices: number[];
}

export interface AttachmentIndicators {
  primary_style:
  | 'secure'
  | 'anxious'
  | 'avoidant'
  | 'disorganized'
  | 'insufficient_data';
  indicators: AttachmentIndicator[];
  /** Max 65 for text-only analysis */
  confidence: number;
  disclaimer?: string;
}

export interface CommunicationProfile {
  style: 'direct' | 'indirect' | 'mixed';
  assertiveness: number;
  emotional_expressiveness: number;
  self_disclosure_depth: number;
  question_to_statement_ratio: 'asks_more' | 'states_more' | 'balanced';
  typical_message_structure: string;
  verbal_tics: string[];
  emoji_personality: string;
}

export interface CommunicationNeeds {
  primary:
  | 'affirmation'
  | 'space'
  | 'consistency'
  | 'spontaneity'
  | 'depth'
  | 'humor'
  | 'control'
  | 'freedom';
  secondary: string;
  unmet_needs_signals: string[];
  confidence: number;
}

export interface EmotionalPatterns {
  emotional_range: number;
  dominant_emotions: string[];
  coping_mechanisms_visible: string[];
  stress_indicators: string[];
  confidence: number;
}

export interface MBTIResult {
  type: string; // e.g., "INFJ", "ENTP"
  confidence: number; // 0-100
  reasoning: {
    ie: { letter: 'I' | 'E'; evidence: string; confidence: number };
    sn: { letter: 'S' | 'N'; evidence: string; confidence: number };
    tf: { letter: 'T' | 'F'; evidence: string; confidence: number };
    jp: { letter: 'J' | 'P'; evidence: string; confidence: number };
  };
}

export interface LoveLanguageResult {
  primary: 'words_of_affirmation' | 'quality_time' | 'acts_of_service' | 'gifts_pebbling' | 'physical_touch';
  secondary: 'words_of_affirmation' | 'quality_time' | 'acts_of_service' | 'gifts_pebbling' | 'physical_touch';
  scores: {
    words_of_affirmation: number; // 0-100
    quality_time: number;
    acts_of_service: number;
    gifts_pebbling: number;
    physical_touch: number;
  };
  evidence: string;
  confidence: number;
}

export interface PersonProfile {
  big_five_approximation: BigFiveApproximation;
  attachment_indicators: AttachmentIndicators;
  communication_profile: CommunicationProfile;
  communication_needs: CommunicationNeeds;
  emotional_patterns: EmotionalPatterns;
  clinical_observations: ClinicalObservations;
  conflict_resolution: ConflictResolution;
  emotional_intelligence: EmotionalIntelligence;
  mbti?: MBTIResult;
  love_language?: LoveLanguageResult;
}

// ── Clinical-adjacent observations ────────────────────────

export interface ClinicalObservations {
  anxiety_markers: {
    present: boolean;
    patterns: string[];
    severity: 'none' | 'mild' | 'moderate' | 'significant';
    confidence: number;
  };
  avoidance_markers: {
    present: boolean;
    patterns: string[];
    severity: 'none' | 'mild' | 'moderate' | 'significant';
    confidence: number;
  };
  manipulation_patterns: {
    present: boolean;
    types: string[];
    severity: 'none' | 'mild' | 'moderate' | 'severe';
    confidence: number;
  };
  boundary_respect: {
    score: number;
    examples: string[];
    confidence: number;
  };
  codependency_signals: {
    present: boolean;
    indicators: string[];
    confidence: number;
  };
  disclaimer: string;
}

// ── Conflict resolution ──────────────────────────────────

export interface ConflictResolution {
  primary_style: 'direct_confrontation' | 'avoidant' | 'explosive' | 'passive_aggressive' | 'collaborative' | 'humor_deflection';
  triggers: string[];
  recovery_speed: 'fast' | 'moderate' | 'slow' | 'unresolved';
  de_escalation_skills: number;
  confidence: number;
}

// ── Emotional intelligence ──────────────────────────────

export interface EmotionalIntelligence {
  empathy: { score: number; evidence: string };
  self_awareness: { score: number; evidence: string };
  emotional_regulation: { score: number; evidence: string };
  social_skills: { score: number; evidence: string };
  overall: number;
  confidence: number;
}

// ============================================================
// PASS 4: Synthesis — Final Report
// ============================================================

export interface HealthScoreComponents {
  balance: number;
  reciprocity: number;
  response_pattern: number;
  emotional_safety: number;
  growth_trajectory: number;
}

export interface HealthScore {
  overall: number;
  components: HealthScoreComponents;
  explanation: string;
}

export interface KeyFinding {
  finding: string;
  significance: 'positive' | 'neutral' | 'concerning';
  detail: string;
}

export interface InflectionPoint {
  approximate_date: string;
  description: string;
  evidence: string;
}

export interface RelationshipTrajectory {
  current_phase: string;
  direction: 'strengthening' | 'stable' | 'weakening' | 'volatile';
  inflection_points: InflectionPoint[];
}

export interface Insight {
  for: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ConversationPersonality {
  if_this_conversation_were_a: {
    movie_genre: string;
    weather: string;
    one_word: string;
  };
}

export interface Prediction {
  prediction: string;
  confidence: number;
  timeframe: string;
  basis: string;
}

export interface Pass4Result {
  executive_summary: string;
  health_score: HealthScore;
  key_findings: KeyFinding[];
  relationship_trajectory: RelationshipTrajectory;
  insights: Insight[];
  predictions?: Prediction[];
  conversation_personality: ConversationPersonality;
}

// ============================================================
// Relationship Context
// ============================================================

export type RelationshipContext = 'romantic' | 'friendship' | 'colleague' | 'professional' | 'family' | 'other';

// ============================================================
// ROAST MODE
// ============================================================

export interface RoastResult {
  roasts_per_person: Record<string, string[]>; // person name -> array of roast lines
  relationship_roast: string; // overall relationship roast paragraph
  superlatives: Array<{
    title: string;   // e.g., "Mistrz Ghostingu"
    holder: string;  // person name
    roast: string;   // funny description
  }>;
  verdict: string; // one-line brutal summary
}

// ============================================================
// STAND-UP ROAST MODE
// ============================================================

export interface StandUpAct {
  number: number;
  title: string;
  emoji: string;
  lines: string[];
  callback?: string;
  gradientColors: [string, string];
}

export interface StandUpRoastResult {
  showTitle: string;
  acts: StandUpAct[];
  closingLine: string;
  audienceRating: string;
}

// ============================================================
// Container & Storage Types
// ============================================================

export interface QualitativeAnalysis {
  status: 'pending' | 'running' | 'complete' | 'partial' | 'error';
  error?: string;
  currentPass?: number;
  pass1?: Pass1Result;
  pass2?: Pass2Result;
  /** Keyed by participant name */
  pass3?: Record<string, PersonProfile>;
  pass4?: Pass4Result;
  roast?: RoastResult;
  /** Communication Pattern Screening (optional Pass 5) */
  cps?: CPSResult;
  /** Subtext Decoder (optional) */
  subtext?: SubtextResult;
  /** Stand-Up Comedy Roast (optional) */
  standupRoast?: StandUpRoastResult;
  /** Stawiam Zakład — Delusion Quiz (optional, client-side) */
  delusionQuiz?: DelusionQuizResult;
  /** Twój Chat w Sądzie — Court Trial (optional) */
  courtTrial?: CourtResult;
  /** Szczery Profil Randkowy — Dating Profile (optional) */
  datingProfile?: DatingProfileResult;
  /** Quiz parowy — Couple Mode comparison (optional, client-side) */
  coupleQuiz?: CoupleQuizComparison;
  completedAt?: number;
}

/** Full analysis record persisted to localStorage */
export interface StoredAnalysis {
  id: string;
  title: string;
  createdAt: number;
  relationshipContext?: RelationshipContext;
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  qualitative?: QualitativeAnalysis;
  /** Deterministic hash identifying the same conversation across uploads */
  conversationFingerprint?: string;
  /** Optional profile photos per participant (base64 JPEG data URLs) */
  participantPhotos?: Record<string, string>;
  /** AI-generated images keyed by type (e.g. 'comic', 'roast') — persisted across reloads */
  generatedImages?: Record<string, string>;
}

/** Lightweight entry for the dashboard analysis list */
export interface AnalysisIndexEntry {
  id: string;
  title: string;
  createdAt: number;
  messageCount: number;
  participants: string[];
  hasQualitative: boolean;
  healthScore?: number;
  /** Deterministic hash identifying the same conversation across uploads */
  conversationFingerprint?: string;
  /** Source platform */
  platform?: string;
}
