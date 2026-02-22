'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DatingProfileResult as DatingProfileResultType, PersonDatingProfile } from '@/lib/analysis/dating-profile-prompts';

interface DatingProfileResultProps {
  result: DatingProfileResultType;
  participants: string[];
}

function ProfileCard({ profile }: { profile: PersonDatingProfile }) {
  return (
    <div
      style={{
        background: '#111111',
        borderRadius: 12,
        padding: 0,
        overflow: 'hidden',
        border: '1px solid #1a1a1a',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {/* Header bar — monospaced, clinical */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          borderBottom: '1px solid #1a1a1a',
          background: '#0a0a0a',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.6rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: '#555555',
          }}
        >
          Profil randkowy
        </span>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.6rem',
            color: '#A855F7',
            letterSpacing: '0.05em',
          }}
        >
          PodTeksT
        </span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Name — big, monospaced, data-hero */}
        <div style={{ marginBottom: 4 }}>
          <h3
            style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: '#fafafa',
              fontFamily: 'var(--font-geist-mono)',
              lineHeight: 1.1,
            }}
          >
            {profile.name}
          </h3>
        </div>
        {/* Age vibe — monospaced diagnostic */}
        <p
          style={{
            fontSize: '0.75rem',
            color: '#888888',
            fontFamily: 'var(--font-geist-mono)',
            marginBottom: 16,
          }}
        >
          {profile.age_vibe}
        </p>

        {/* Bio */}
        <div
          style={{
            background: '#0a0a0a',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 20,
            border: '1px solid #1a1a1a',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.58rem',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              color: '#555555',
              marginBottom: 8,
            }}
          >
            Bio
          </div>
          <p
            style={{
              fontSize: '0.85rem',
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {profile.bio}
          </p>
        </div>

        {/* Stats grid — data-dense, Bloomberg-style */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1,
            marginBottom: 20,
            background: '#1a1a1a',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {profile.stats.map((stat, i) => (
            <div
              key={i}
              style={{
                background: '#0a0a0a',
                padding: '12px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.55rem',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: '#555555',
                  marginBottom: 4,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.82rem',
                  color: '#fafafa',
                  lineHeight: 1.3,
                  fontWeight: 600,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Prompt cards — Hinge-style but dark, no tilt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {profile.prompts.map((prompt, i) => (
            <div
              key={i}
              style={{
                background: '#0a0a0a',
                borderRadius: 8,
                padding: '14px 16px',
                borderLeft: `2px solid ${i === 0 ? '#A855F7' : i === 1 ? '#3B82F6' : '#06B6D4'}`,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.6rem',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: '#555555',
                  marginBottom: 6,
                }}
              >
                {prompt.prompt}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#fafafa', lineHeight: 1.45 }}>
                {prompt.answer}
              </div>
            </div>
          ))}
        </div>

        {/* Flags — side by side, clinical */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.55rem',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: '#EF4444',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Red flags
            </div>
            {profile.red_flags.map((flag, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(239, 68, 68, 0.8)', lineHeight: 1.35, display: 'block' }}>
                  {flag}
                </span>
              </div>
            ))}
          </div>
          <div style={{ width: 1, background: '#1a1a1a', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.55rem',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: '#10B981',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Green flags
            </div>
            {profile.green_flags.map((flag, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(16, 185, 129, 0.8)', lineHeight: 1.35, display: 'block' }}>
                  {flag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Match prediction — accent box */}
        <div
          style={{
            background: '#0a0a0a',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 8,
            border: '1px solid #1a1a1a',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.55rem',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: '#555555',
              marginBottom: 4,
            }}
          >
            Prognoza dopasowania
          </div>
          <div style={{ fontSize: '0.85rem', color: '#A855F7', fontWeight: 500 }}>
            {profile.match_prediction}
          </div>
        </div>

        {/* Dealbreaker */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.04)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            border: '1px solid rgba(239, 68, 68, 0.1)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.55rem',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: 'rgba(239, 68, 68, 0.5)',
              marginBottom: 4,
            }}
          >
            Dealbreaker
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(239, 68, 68, 0.85)' }}>
            {profile.dealbreaker}
          </div>
        </div>

        {/* Rating — large, monospaced, centered */}
        <div
          style={{
            textAlign: 'center',
            padding: '16px 0 4px',
            borderTop: '1px solid #1a1a1a',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '1rem',
              color: '#fafafa',
              fontWeight: 600,
              letterSpacing: 2,
            }}
          >
            {profile.overall_rating}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DatingProfileResult({ result, participants }: DatingProfileResultProps) {
  const profileNames = participants.filter(name => result.profiles[name]);
  const [activeTab, setActiveTab] = useState(0);

  if (profileNames.length === 0) return null;

  const currentProfile = result.profiles[profileNames[activeTab]];
  if (!currentProfile) return null;

  return (
    <div>
      {/* Tab bar — sharp, monospaced, no pills */}
      {profileNames.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 20,
            justifyContent: 'center',
            border: '1px solid #1a1a1a',
            borderRadius: 6,
            overflow: 'hidden',
            maxWidth: 420,
            margin: '0 auto 20px',
          }}
        >
          {profileNames.map((name, i) => (
            <button
              key={name}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-geist-mono)',
                fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? '#fafafa' : '#555555',
                background: activeTab === i ? '#1a1a1a' : '#0a0a0a',
                border: 'none',
                borderRight: i < profileNames.length - 1 ? '1px solid #1a1a1a' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                letterSpacing: '0.02em',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Profile card with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={profileNames[activeTab]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <ProfileCard profile={currentProfile} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
