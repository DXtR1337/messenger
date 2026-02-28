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
import type { EmotionCausesResult } from './emotion-causes-prompts';
import type { MoralFoundationsResult } from './moral-foundations-prompts';

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
  /** Behavioral evidence specific to THIS trait — required for agreeableness to prevent Empathy conflation */
  distinction_check?: string;
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

// Frequency labels (new) + legacy severity values (backward compat with stored analyses)
type ObservationFrequency =
  | 'not_observed' | 'occasional' | 'recurring' | 'pervasive'
  | 'none' | 'mild' | 'moderate' | 'significant' | 'severe';

export interface ClinicalObservations {
  anxiety_markers: {
    present: boolean;
    patterns: string[];
    frequency?: ObservationFrequency;
    severity?: ObservationFrequency;
    confidence: number;
  };
  avoidance_markers: {
    present: boolean;
    patterns: string[];
    frequency?: ObservationFrequency;
    severity?: ObservationFrequency;
    confidence: number;
  };
  manipulation_patterns: {
    present: boolean;
    types: string[];
    frequency?: ObservationFrequency;
    severity?: ObservationFrequency;
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
  /** Enhanced roast: commentary on intensity crescendo (Rozgrzewka, Main Event, Finish Him) */
  rounds_commentary?: [string, string, string];
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
// MEGA ROAST — Single-target roast using full group context
// ============================================================

export interface MegaRoastResult {
  targetName: string;
  opening: string;
  roast_lines: string[];
  what_others_say: string[];
  self_owns: string[];
  superlatives: Array<{
    title: string;
    roast: string;
  }>;
  verdict: string;
  tldr: string;
}

// ============================================================
// CWEL TYGODNIA — AI-first group chat award ceremony
// ============================================================

export interface CwelNomination {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  winner: string;
  reason: string;
  evidence: string[];
  runnerUp?: string;
}

export interface CwelTygodniaResult {
  winner: string;
  winnerScore: number;
  winnerCategories: number;
  nominations: CwelNomination[];
  ranking: Array<{ name: string; score: number; oneLiner: string }>;
  intro: string;
  crowningSpeech: string;
  verdict: string;
  hallOfShame: Array<{
    person: string;
    quote: string;
    commentary: string;
  }>;
}

// ============================================================
// ARGUMENT SIMULATION
// ============================================================

export interface ArgumentSimulationMessage {
  sender: string;
  text: string;
  /** Delay in ms before this message appears (from previous message) */
  delayMs: number;
  /** Messages in the same burst group appear rapid-fire */
  burstGroup: number;
  phase: 'trigger' | 'escalation' | 'peak' | 'deescalation' | 'aftermath';
  /** Whether to show typing indicator before this message */
  isTypingVisible: boolean;
}

export interface ArgumentTopic {
  topic: string;
  /** How often this topic appeared in real conflicts */
  frequency: number;
  /** Person A's typical stance on this topic */
  stanceA: string;
  /** Person B's typical stance on this topic */
  stanceB: string;
  volatility: 'low' | 'medium' | 'high';
}

export interface ArgumentSummary {
  /** Who escalated more */
  escalator: string;
  /** Who first tried to de-escalate */
  firstDeescalator: string;
  /** How many messages until peak conflict */
  escalationMessageCount: number;
  totalMessages: number;
  dominantHorseman: 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling';
  /** 0-100 score per horseman */
  horsemanScores: Record<string, number>;
  /** Polish text comparing with real conflict patterns */
  comparisonWithReal: string;
  /** Polish text describing the conflict arc */
  patternDescription: string;
  personBreakdown: Record<string, {
    messagesCount: number;
    avgLength: number;
    /** 0-100 escalation contribution */
    escalationContribution: number;
    dominantPhase: string;
  }>;
}

export interface EnrichedFingerprintData {
  topics: ArgumentTopic[];
  perPerson: Record<string, {
    sarcasmPatterns: string[];
    emotionalTriggers: string[];
    deepEscalationStyle: string;
    deepDeescalationStyle: string;
  }>;
}

export interface ArgumentSimulationResult {
  topic: string;
  messages: ArgumentSimulationMessage[];
  summary: ArgumentSummary;
  enrichedFingerprint: EnrichedFingerprintData;
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
  /** Enhanced Roast — deep psychological roast using full pass1-4 context (optional) */
  enhancedRoast?: RoastResult;
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
  /** Mega Roast — single-target roast using full group context (optional) */
  megaRoast?: MegaRoastResult;
  /** Cwel Tygodnia — AI-first group chat award ceremony (optional) */
  cwelTygodnia?: CwelTygodniaResult;
  /** Emotion Cause Extraction (optional AI pass) */
  emotionCauses?: EmotionCausesResult;
  /** Moral Foundations Theory (optional AI pass) */
  moralFoundations?: MoralFoundationsResult;
  /** Active-Constructive Responding / Capitalization (optional AI pass) */
  capitalization?: import('./capitalization-prompts').CapitalizationResult;
  /** Symulacja Kłótni — generated argument simulation (optional) */
  argumentSimulation?: ArgumentSimulationResult;
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
