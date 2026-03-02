'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MethodologyHero from '@/components/metodologia/MethodologyHero';
import MethodologySidebar from '@/components/metodologia/MethodologySidebar';
import MethodologySearch from '@/components/metodologia/MethodologySearch';
import SectionGroup from '@/components/metodologia/SectionGroup';
import AlgorithmCard from '@/components/metodologia/AlgorithmCard';
import LimitationBox from '@/components/metodologia/LimitationBox';
import {
  ALL_SECTIONS,
  SIDEBAR_ITEMS,
  AI_GENERAL_LIMITATIONS,
} from '@/components/metodologia/methodology-data';

const ACCENT_COLORS = {
  blue: '#3b82f6',
  purple: '#a855f7',
} as const;

/** Build a flat searchable index from all algorithms */
function buildSearchIndex() {
  const entries: Array<{ groupId: string; algoId: string; text: string }> = [];
  for (const section of ALL_SECTIONS) {
    for (const group of section.groups) {
      for (const algo of group.algorithms) {
        entries.push({
          groupId: group.id,
          algoId: algo.id,
          text: `${algo.title} ${algo.teaser} ${algo.description}`.toLowerCase(),
        });
      }
    }
  }
  return entries;
}

export default function MethodologyPage() {
  const [activeSection, setActiveSection] = useState(SIDEBAR_ITEMS[0].sectionId);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const searchIndex = useMemo(() => buildSearchIndex(), []);

  // Compute which groups/cards match the search query
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const matchingGroups = new Set<string>();
    const matchingAlgos = new Set<string>();
    for (const entry of searchIndex) {
      if (entry.text.includes(q)) {
        matchingGroups.add(entry.groupId);
        matchingAlgos.add(entry.algoId);
      }
    }
    return { groups: matchingGroups, algos: matchingAlgos };
  }, [searchQuery, searchIndex]);

  /* IntersectionObserver for sidebar highlighting */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    const currentRefs = sectionRefs.current;
    currentRefs.forEach((el) => observer.observe(el));

    return () => {
      currentRefs.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
    else sectionRefs.current.delete(id);
  }, []);

  const handleToggleCard = useCallback((cardId: string) => {
    setOpenCardId((prev) => (prev === cardId ? null : cardId));
  }, []);

  const handleToggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleExpandAllInSection = useCallback(
    (sectionId: string) => {
      const section = ALL_SECTIONS.find((s) => s.id === sectionId);
      if (!section) return;
      const groupIds = section.groups.map((g) => g.id);
      setOpenGroups((prev) => {
        const allOpen = groupIds.every((id) => prev.has(id));
        const next = new Set(prev);
        if (allOpen) {
          // Collapse all in this section
          for (const id of groupIds) next.delete(id);
        } else {
          // Expand all in this section
          for (const id of groupIds) next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const isGroupOpen = useCallback(
    (groupId: string) => {
      // When searching, auto-open matching groups
      if (searchMatches) return searchMatches.groups.has(groupId);
      return openGroups.has(groupId);
    },
    [openGroups, searchMatches],
  );

  const isSectionAllExpanded = useCallback(
    (sectionId: string) => {
      const section = ALL_SECTIONS.find((s) => s.id === sectionId);
      if (!section) return false;
      return section.groups.every((g) => openGroups.has(g.id));
    },
    [openGroups],
  );

  return (
    <div className="min-h-screen bg-[#050505]">
      <MethodologyHero />
      <MethodologySidebar items={SIDEBAR_ITEMS} activeId={activeSection} />

      {/* Main content — single column, readable width */}
      <div className="mx-auto max-w-3xl px-6 pb-32 md:pl-24">
        {/* Search bar */}
        <MethodologySearch onSearch={setSearchQuery} />

        {ALL_SECTIONS.map((section, sectionIdx) => {
          // When searching, hide sections with no matching groups
          if (searchMatches && !section.groups.some((g) => searchMatches.groups.has(g.id))) {
            return null;
          }

          const allExpanded = isSectionAllExpanded(section.id);
          const totalAlgos = section.groups.reduce((sum, g) => sum + g.algorithms.length, 0);

          return (
            <div key={section.id}>
              {/* Gradient divider between math & AI sections */}
              {sectionIdx > 0 && (
                <div className="my-16 flex items-center gap-4">
                  <div
                    className="h-px flex-1"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2) 50%, transparent)',
                    }}
                  />
                  <div
                    className="size-1.5 rounded-full"
                    style={{
                      background: ACCENT_COLORS[section.accent],
                      boxShadow: `0 0 8px ${ACCENT_COLORS[section.accent]}60`,
                    }}
                  />
                  <div
                    className="h-px flex-1"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2) 50%, transparent)',
                    }}
                  />
                </div>
              )}

              {/* Section */}
              <div className="py-8">
                {/* Section header */}
                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-4">
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{
                        backgroundColor: ACCENT_COLORS[section.accent],
                        boxShadow: `0 0 10px ${ACCENT_COLORS[section.accent]}30`,
                      }}
                    />
                    <h2
                      className="font-[family-name:var(--font-story-display)] text-2xl font-black md:text-3xl"
                      style={{ color: ACCENT_COLORS[section.accent] }}
                    >
                      {section.title}
                    </h2>
                    <span className="font-mono text-xs text-[#444444]">
                      {totalAlgos} algorytmów · {section.groups.length} kategorii
                    </span>
                  </div>
                  <p className="ml-5 max-w-2xl font-[family-name:var(--font-story-body)] text-sm leading-relaxed text-muted-foreground">
                    {section.subtitle}
                  </p>

                  {/* Expand all / Collapse all + AI general limitations */}
                  <div className="ml-5 mt-4 flex items-center gap-4">
                    {!searchMatches && (
                      <button
                        onClick={() => handleExpandAllInSection(section.id)}
                        className="font-mono text-xs transition-colors hover:text-foreground"
                        style={{ color: `${ACCENT_COLORS[section.accent]}80` }}
                      >
                        {allExpanded ? 'Zwiń wszystko' : 'Rozwiń wszystko'}
                      </button>
                    )}
                  </div>

                  {section.id === 'ai' && (
                    <div className="ml-5 mt-6 max-w-2xl">
                      <LimitationBox items={AI_GENERAL_LIMITATIONS} />
                    </div>
                  )}
                </div>

                {/* Groups */}
                {section.groups.map((group) => {
                  // When searching, hide non-matching groups
                  if (searchMatches && !searchMatches.groups.has(group.id)) {
                    return null;
                  }

                  const preview = group.algorithms
                    .slice(0, 3)
                    .map((a) => a.title)
                    .join(', ');

                  return (
                    <div
                      key={group.id}
                      ref={(el) => registerRef(group.id, el)}
                    >
                      <SectionGroup
                        id={group.id}
                        title={group.title}
                        accent={group.accent}
                        algorithmCount={group.algorithms.length}
                        preview={preview}
                        isOpen={isGroupOpen(group.id)}
                        onToggle={() => handleToggleGroup(group.id)}
                      >
                        {group.algorithms.map((algo) => {
                          // When searching, hide non-matching cards
                          if (searchMatches && !searchMatches.algos.has(algo.id)) {
                            return null;
                          }

                          return (
                            <AlgorithmCard
                              key={algo.id}
                              id={algo.id}
                              title={algo.title}
                              teaser={algo.teaser}
                              description={algo.description}
                              howItWorks={algo.howItWorks}
                              sources={algo.sources}
                              limitations={algo.limitations}
                              iconPath={algo.iconPath}
                              accent={section.accent}
                              isOpen={openCardId === algo.id}
                              onToggle={() => handleToggleCard(algo.id)}
                            />
                          );
                        })}
                      </SectionGroup>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Bottom note */}
        <div className="mt-8 text-center">
          <div
            className="mb-6 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.1), rgba(168,85,247,0.1), transparent)',
            }}
          />
          <p className="font-mono text-[11px] text-[#555555]">
            55 algorytmów · 150+ metryk · 20+ źródeł naukowych · 100% transparentności
          </p>
        </div>
      </div>
    </div>
  );
}
