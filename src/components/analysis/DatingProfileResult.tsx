'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DatingProfileResult as DatingProfileResultType, PersonDatingProfile } from '@/lib/analysis/dating-profile-prompts';
import type { PersonProfile } from '@/lib/analysis/types';
import type { UnifiedMessage } from '@/lib/parsers/types';
import { patchGeneratedImage } from '@/lib/utils';

interface DatingProfileResultProps {
  result: DatingProfileResultType;
  participants: string[];
  personalityProfiles?: Record<string, PersonProfile>;
  messages?: UnifiedMessage[];
  /** Analysis ID — used to persist images directly to IndexedDB */
  analysisId?: string;
  /** Persisted images from IndexedDB (keyed by 'dating-photo-{name}') */
  savedImages?: Record<string, string>;
  /** Persist generated image to IndexedDB */
  onImageSaved?: (key: string, dataUrl: string) => void;
}

// Cache for generated photos so they persist across tab switches
const photoCache = new Map<string, string>();

// ── Gradient palette for profile photos ──
const PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
  'linear-gradient(135deg, #8338ec 0%, #ff006e 50%, #ff9f0a 100%)',
  'linear-gradient(135deg, #3a86ff 0%, #06b6d4 50%, #10b981 100%)',
  'linear-gradient(135deg, #ff9f0a 0%, #ef4444 50%, #ff006e 100%)',
];

// ── Appearance keyword scanner — extracts physical description clues from messages ──
const APPEARANCE_KEYWORDS = [
  // Hair (PL)
  'włosy', 'blond', 'brunet', 'brunetka', 'ruda', 'rudy', 'rudowłos', 'łysy', 'łysa',
  'kręcone', 'proste włosy', 'warkocz', 'grzywka', 'farbowane', 'ombre', 'platyn',
  'fryzur', 'fryzjer', 'obcięł', 'obcięła', 'ogolił', 'ogoliła',
  // Hair (EN)
  'blonde', 'brunette', 'redhead', 'bald', 'curly hair', 'straight hair', 'bangs', 'dyed hair', 'braids',
  // Height/Build (PL)
  'wysoki', 'wysoka', 'niski', 'niska', 'szczupły', 'szczupła', 'gruby', 'gruba',
  'chudy', 'chuda', 'muskularny', 'atletyczny', 'drobna', 'krępy', 'otyły', 'otyła',
  'brzuch', 'klatka', 'biceps', 'barczysty', 'filigranow',
  // Height/Build (EN)
  'tall', 'muscular', 'athletic', 'petite', 'chubby', 'thicc', 'skinny', 'jacked', 'buff',
  // Face (PL)
  'okulary', 'broda', 'wąsy', 'tatuaż', 'piercing', 'kolczyk', 'piegi', 'blizna', 'zarost',
  'twarz', 'uśmiech', 'zęby', 'nos', 'usta', 'szczęka', 'podbródek',
  // Face (EN)
  'glasses', 'beard', 'mustache', 'tattoo', 'piercing', 'freckles', 'scar', 'jawline',
  // Eyes/Skin (PL)
  'niebieskie oczy', 'zielone oczy', 'brązowe oczy', 'piwne oczy',
  'opalony', 'opalona', 'blady', 'blada', 'jasna karnacja', 'ciemna karnacja',
  // Eyes/Skin (EN)
  'blue eyes', 'green eyes', 'brown eyes', 'tan', 'pale',
  // Clothing/Style (PL)
  'garnitur', 'sukienka', 'bluza', 'hoodie', 'koszula', 'dresik',
  'elegancki', 'sportowy', 'gotyk', 'punk', 'vintage', 'skórzana kurtka',
  // Clothing/Style (EN)
  'hoodie', 'suit', 'elegant', 'sporty', 'gothic', 'leather jacket',
  // Activities that imply appearance (PL)
  'siłownia', 'bieganie', 'crossfit', 'basen', 'rower', 'joga',
  'dieta', 'waga', 'schudł', 'schudła', 'przytyłe', 'przytyła',
  'gaming', 'gamer', 'komputer', 'monitor',
  // Age/looks references (PL)
  'stary', 'stara', 'młody', 'młoda', 'wyglądasz', 'ładny', 'ładna',
  'brzydki', 'brzydka', 'przystojny', 'piękna', 'piękny', 'hot', 'sexy',
];

// Build regex once — match whole words, case-insensitive
const APPEARANCE_RE = new RegExp(
  `\\b(${APPEARANCE_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

// Cache per person to avoid re-scanning on re-render
const appearanceCache = new Map<string, string>();

function scanAppearanceClues(messages: UnifiedMessage[], personName: string, allParticipants?: string[]): string {
  if (appearanceCache.has(personName)) return appearanceCache.get(personName)!;

  const matches: string[] = [];
  const nameLower = personName.toLowerCase();
  const otherNames = (allParticipants || [])
    .filter(n => n.toLowerCase() !== nameLower)
    .map(n => n.toLowerCase());

  for (const msg of messages) {
    if (!msg.content || matches.length >= 30) break;

    if (!APPEARANCE_RE.test(msg.content)) continue;

    const senderLower = msg.sender.toLowerCase();
    const isSelf = senderLower === nameLower;
    // Other person talking about this person (or general appearance talk directed at them)
    const isAboutPerson = !isSelf && otherNames.includes(senderLower);

    if (isSelf || isAboutPerson) {
      const snippet = msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content;
      const prefix = isSelf ? `[${personName} o sobie]` : `[o ${personName}]`;
      matches.push(`${prefix} ${snippet}`);
    }
  }

  const result = matches.length > 0 ? matches.join('; ') : '';
  appearanceCache.set(personName, result);
  return result;
}

// ── iPhone Mockup Frame ──
function PhoneMockup({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <div className="phone-mockup-wrapper">
      {/* Outer phone body */}
      <div className="phone-mockup-body">
        {/* Dynamic Island / Notch */}
        <div className="phone-mockup-notch">
          <div className="phone-mockup-camera" />
        </div>
        {/* Screen area — scrollable */}
        <div className="phone-mockup-screen">
          {children}
        </div>
        {/* Home indicator */}
        <div className="phone-mockup-home" />
      </div>
    </div>
  );
}

// ── Build personality context for image generation ──
function buildPersonalityContext(personality?: PersonProfile) {
  if (!personality) return {};

  const ctx: Record<string, string> = {};

  // MBTI
  if (personality.mbti?.type) {
    ctx.mbti = personality.mbti.type;
  }

  // Big Five — summarize dominant traits
  if (personality.big_five_approximation) {
    const b5 = personality.big_five_approximation;
    const traits: string[] = [];
    const describe = (label: string, range: [number, number]) => {
      const avg = (range[0] + range[1]) / 2;
      if (avg >= 7) traits.push(`high ${label}`);
      else if (avg <= 3) traits.push(`low ${label}`);
    };
    describe('openness', b5.openness?.range ?? [5, 5]);
    describe('conscientiousness', b5.conscientiousness?.range ?? [5, 5]);
    describe('extraversion', b5.extraversion?.range ?? [5, 5]);
    describe('agreeableness', b5.agreeableness?.range ?? [5, 5]);
    describe('neuroticism', b5.neuroticism?.range ?? [5, 5]);
    if (traits.length > 0) ctx.bigFive = traits.join(', ');
  }

  // Attachment style
  if (personality.attachment_indicators?.primary_style && personality.attachment_indicators.primary_style !== 'insufficient_data') {
    ctx.attachmentStyle = personality.attachment_indicators.primary_style;
  }

  // Communication style
  if (personality.communication_profile?.style) {
    ctx.communicationStyle = personality.communication_profile.style;
  }

  // Dominant emotions
  if (personality.emotional_patterns?.dominant_emotions?.length) {
    ctx.dominantEmotions = personality.emotional_patterns.dominant_emotions.slice(0, 3).join(', ');
  }

  return ctx;
}

// ── Tinder-style Profile Inside Phone ──
function ProfileCard({ profile, index, personality, messages, analysisId, savedImages, onImageSaved }: { profile: PersonDatingProfile; index: number; personality?: PersonProfile; messages?: UnifiedMessage[]; analysisId?: string; savedImages?: Record<string, string>; onImageSaved?: (key: string, dataUrl: string) => void }) {
  const initial = profile.name.charAt(0).toUpperCase();
  const gradient = PHOTO_GRADIENTS[index % PHOTO_GRADIENTS.length];
  const imageKey = `dating-photo-${profile.name}`;

  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    // Priority: in-memory cache → IndexedDB persisted → null
    if (photoCache.has(profile.name)) return photoCache.get(profile.name)!;
    const saved = savedImages?.[imageKey];
    if (saved) {
      photoCache.set(profile.name, saved);
      return saved;
    }
    return null;
  });
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const inflightRef = useRef(false);

  const generatePhoto = async () => {
    // Priority 1: in-memory cache
    if (photoCache.has(profile.name)) {
      setPhotoUrl(photoCache.get(profile.name)!);
      return;
    }
    // Priority 2: persisted in IndexedDB (via savedImages prop)
    const persisted = savedImages?.[imageKey];
    if (persisted) {
      photoCache.set(profile.name, persisted);
      setPhotoUrl(persisted);
      return;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const personalityCtx = buildPersonalityContext(personality);
      const participants = messages
        ? [...new Set(messages.map(m => m.sender))]
        : [];
      const appearanceClues = messages ? scanAppearanceClues(messages, profile.name, participants) : '';

      // Extract worst traits for the caricature prompt
      const redFlags = profile.red_flags?.join(', ') || '';
      const worstStats = profile.stats
        ?.slice(0, 4)
        .map(s => `${s.label}: ${s.value}`)
        .join(', ') || '';

      const res = await fetch('/api/analyze/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datingProfileContext: {
            name: profile.name,
            bio: profile.bio,
            ageVibe: profile.age_vibe,
            ...personalityCtx,
            ...(appearanceClues ? { appearanceClues } : {}),
            ...(redFlags ? { redFlags } : {}),
            ...(worstStats ? { worstStats } : {}),
          },
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = (errData as { error?: string }).error || `HTTP ${res.status}`;
        console.error('[DatingPhoto] API error:', msg);
        setPhotoError(msg);
        return;
      }
      const data = await res.json();
      if (data.imageBase64 && data.mimeType) {
        const url = `data:${data.mimeType};base64,${data.imageBase64}`;
        photoCache.set(profile.name, url);
        setPhotoUrl(url);
        // Update React state (for current session)
        onImageSaved?.(imageKey, url);
        // Save directly to IndexedDB (survives component unmount / navigation)
        if (analysisId) {
          patchGeneratedImage(analysisId, imageKey, url).catch((err) =>
            console.error('[DatingPhoto] IndexedDB save failed:', err),
          );
        }
      } else if (data.error) {
        console.error('[DatingPhoto] Generation error:', data.error);
        setPhotoError(data.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      console.error('[DatingPhoto] Fetch error:', msg);
      setPhotoError(msg);
    } finally {
      setPhotoLoading(false);
      inflightRef.current = false;
    }
  };

  // Auto-trigger on mount — skip if already cached or persisted
  useEffect(() => {
    if (!photoCache.has(profile.name) && !savedImages?.[imageKey] && !inflightRef.current) {
      generatePhoto();
    }
  }, [profile.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PhoneMockup index={index}>
      {/* Photo hero area */}
      <div className="relative" style={{ aspectRatio: '4/5', background: gradient, overflow: 'hidden' }}>
        {/* AI-generated photo */}
        {photoUrl && (
          <motion.img
            src={photoUrl}
            alt={`${profile.name} — AI profile`}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}
        {/* Loading state */}
        {photoLoading && !photoUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: gradient, opacity: 0.8 }}>
            <div className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">Generowanie portretu...</span>
          </div>
        )}
        {/* Decorative pattern overlay — only when no AI photo */}
        {!photoUrl && (
          <>
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.2) 0%, transparent 50%)',
              }}
            />
            {/* Large initial letter */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-[var(--font-syne)] font-extrabold text-white/30 select-none"
                style={{ fontSize: 'min(40vw, 200px)', lineHeight: 1 }}
              >
                {initial}
              </span>
            </div>
            {/* Generate / Retry button overlay — prominent */}
            {!photoLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
                {photoError && (
                  <div className="mx-6 rounded-lg bg-red-500/20 px-4 py-2 text-center font-mono text-[10px] text-red-300/80 backdrop-blur-sm">
                    {photoError.length > 80 ? photoError.slice(0, 80) + '...' : photoError}
                  </div>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); generatePhoto(); }}
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-black/60 px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95"
                  style={{ boxShadow: '0 0 30px rgba(255,0,110,0.3)' }}
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  {photoError ? 'Wygeneruj ponownie' : 'Wygeneruj zdjecie AI'}
                </button>
              </div>
            )}
          </>
        )}
        {/* Bottom gradient fade to content */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: 'linear-gradient(to top, #111 0%, transparent 100%)' }}
        />
        {/* Name + age overlaid on photo bottom */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
          <h3 className="font-[var(--font-syne)] text-2xl font-extrabold text-white leading-tight sm:text-3xl">
            {profile.name}
          </h3>
          <p className="mt-1 font-mono text-xs text-white/60">{profile.age_vibe}</p>
        </div>
        {/* Tinder-like action hint icons at bottom corners */}
        <div className="absolute bottom-4 right-5 flex gap-2">
          <span className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm backdrop-blur-sm">
            💔
          </span>
          <span className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm backdrop-blur-sm">
            💚
          </span>
        </div>
      </div>

      {/* Profile content */}
      <div className="bg-[#111] px-5 py-5">
        {/* Bio */}
        <div className="mb-5 rounded-xl bg-[#0a0a0a] p-4 border border-[#1a1a1a]">
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">Bio</div>
          <p className="text-[0.85rem] leading-relaxed text-white/90">{profile.bio}</p>
        </div>

        {/* Stats 2-col grid */}
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[#1a1a1a]">
          {profile.stats.map((stat, i) => (
            <div key={i} className="bg-[#0a0a0a] p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{stat.label}</div>
              <div className="mt-1 font-mono text-[0.8rem] font-semibold leading-snug text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Hinge-style prompts with colored left border */}
        <div className="mb-5 flex flex-col gap-2">
          {profile.prompts.map((prompt, i) => {
            const colors = ['#ff006e', '#8338ec', '#3a86ff', '#06b6d4'];
            return (
              <div
                key={i}
                className="rounded-xl bg-[#0a0a0a] p-4"
                style={{ borderLeft: `3px solid ${colors[i % colors.length]}` }}
              >
                <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                  {prompt.prompt}
                </div>
                <div className="text-[0.88rem] leading-relaxed text-white">{prompt.answer}</div>
              </div>
            );
          })}
        </div>

        {/* Flags — red vs green */}
        <div className="mb-5 flex gap-3">
          <div className="flex-1">
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#ef4444]">Red flags</div>
            {profile.red_flags.map((flag, i) => (
              <p key={i} className="mb-1.5 text-[0.78rem] leading-snug text-red-400/80">{flag}</p>
            ))}
          </div>
          <div className="w-px shrink-0 bg-[#1a1a1a]" />
          <div className="flex-1">
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#10b981]">Green flags</div>
            {profile.green_flags.map((flag, i) => (
              <p key={i} className="mb-1.5 text-[0.78rem] leading-snug text-emerald-400/80">{flag}</p>
            ))}
          </div>
        </div>

        {/* Match prediction */}
        <div className="mb-2 rounded-xl bg-[#0a0a0a] p-4 border border-[#1a1a1a]">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">Prognoza dopasowania</div>
          <div className="text-[0.85rem] font-medium text-[#a855f7]">{profile.match_prediction}</div>
        </div>

        {/* Dealbreaker */}
        <div className="mb-5 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-red-400/50">Dealbreaker</div>
          <div className="text-[0.85rem] text-red-400/85">{profile.dealbreaker}</div>
        </div>

        {/* Overall rating — large, centered, golden */}
        <div className="border-t border-[#1a1a1a] pt-5 text-center">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Overall rating</div>
          <div className="font-[var(--font-syne)] text-xl font-extrabold tracking-wide text-[#ffd700]">
            {profile.overall_rating}
          </div>
        </div>
      </div>
    </PhoneMockup>
  );
}

export default function DatingProfileResult({ result, participants, personalityProfiles, messages, analysisId, savedImages, onImageSaved }: DatingProfileResultProps) {
  const profileNames = participants.filter(name => result.profiles[name]);
  const [activeTab, setActiveTab] = useState(0);

  if (profileNames.length === 0) return null;

  const currentProfile = result.profiles[profileNames[activeTab]];
  if (!currentProfile) return null;
  const currentPersonality = personalityProfiles?.[profileNames[activeTab]];

  return (
    <div>
      {/* Person switcher tabs */}
      {profileNames.length > 1 && (
        <div className="mb-6 flex justify-center gap-2">
          {profileNames.map((name, i) => (
            <button
              key={name}
              onClick={() => setActiveTab(i)}
              aria-label={`Profil: ${name}`}
              aria-pressed={activeTab === i}
              className={`rounded-full px-5 py-2 font-mono text-xs font-medium tracking-wider transition-all ${
                activeTab === i
                  ? 'bg-[#ff006e]/15 text-[#ff006e] border border-[#ff006e]/30'
                  : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-[#999] hover:bg-white/[0.06]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Profile card in phone mockup */}
      <AnimatePresence mode="wait">
        <motion.div
          key={profileNames[activeTab]}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <ProfileCard profile={currentProfile} index={activeTab} personality={currentPersonality} messages={messages} analysisId={analysisId} savedImages={savedImages} onImageSaved={onImageSaved} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
