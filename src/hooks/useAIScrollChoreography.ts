'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { EASE } from '@/lib/animation/easings';
import { SCROLL_CONFIG } from '@/lib/animation/scroll-config';

// Register ONCE at module level
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let id: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); }) as T;
}

/**
 * GSAP + ScrollTrigger scroll choreography for the AI Deep Dive page.
 *
 * Split-behavior pattern:
 *   - Opacity fires ONCE (toggleActions play-none-none-none)
 *   - Position is SCRUB-linked (bidirectional with scroll)
 *
 * All animations use gsap.fromTo() to avoid FOUC.
 * Only transform + opacity animated (GPU-composited).
 *
 * Includes:
 *   - Alternating left/right card entries
 *   - Section header reveals with accent line
 *   - Boot terminal typing sequence
 *   - Proximity-reactive card glow (viewport center distance)
 *   - Scroll vignette deepening
 *   - FIN section cinematic reveal
 *   - `.ai-scanned` class for CSS border rotation
 */
export function useAIScrollChoreography(
  containerRef: React.RefObject<HTMLElement | null>,
): void {
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      // ── Accessibility + Mobile ──
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const isMobile = window.innerWidth < 768;

      const setFinalStates = () => {
        gsap.set(container.querySelectorAll('[data-ai-card]'), {
          opacity: 1, x: 0, y: 0, scale: 1, rotation: 0,
        });
        gsap.set(container.querySelectorAll('[data-ai-header]'), {
          opacity: 1, x: 0, y: 0,
        });
        gsap.set(container.querySelectorAll('[data-ai-line]'), {
          scaleX: 1, opacity: 1,
        });
        // Mark all as scanned for border rotation CSS
        container.querySelectorAll<HTMLElement>('.analysis-card-accent').forEach((c) => {
          c.classList.add('ai-scanned');
        });
        // Boot lines visible
        container.querySelectorAll<HTMLElement>('.ai-boot-entry').forEach((e) => {
          e.style.opacity = '1';
          const status = e.querySelector<HTMLElement>('.ai-boot-status');
          if (status) status.style.opacity = '1';
        });
      };

      if (motionQuery.matches || isMobile) {
        setFinalStates();
        const obs = new MutationObserver(debounce(() => setFinalStates(), 100));
        obs.observe(container, { childList: true, subtree: true });
        return () => obs.disconnect();
      }

      const handleMotionChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          ScrollTrigger.getAll().forEach((t) => t.kill());
          setFinalStates();
        }
      };
      motionQuery.addEventListener('change', handleMotionChange);

      // ── Mobile scaling (isMobile declared above, mobile early-returns before this) ──
      const tScale = isMobile ? 0.5 : 1;

      const CFG = SCROLL_CONFIG.aiCards;
      const HCFG = SCROLL_CONFIG.aiHeaders;

      // ── GPU promotion ──
      const allCards = container.querySelectorAll<HTMLElement>('[data-ai-card]');
      const allHeaders = container.querySelectorAll<HTMLElement>('[data-ai-header]');
      const allLines = container.querySelectorAll<HTMLElement>('[data-ai-line]');
      [...allCards, ...allHeaders, ...allLines].forEach((el) => {
        el.style.willChange = 'transform, opacity';
      });

      // =================================================================
      // 1) CARD ENTRY — alternating left/right with scrub
      // =================================================================
      allCards.forEach((card) => {
        const dir = card.getAttribute('data-ai-card'); // 'left' | 'right' | 'center'
        const xOffset = dir === 'right'
          ? CFG.translateX * tScale
          : dir === 'left'
            ? -CFG.translateX * tScale
            : 0;
        const yOffset = CFG.translateY * tScale;

        // Opacity — fire once
        gsap.fromTo(card,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.8,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
            onComplete() {
              // Apply .ai-scanned for CSS border rotation
              const accent = card.querySelector<HTMLElement>('.analysis-card-accent');
              if (accent) accent.classList.add('ai-scanned');

              // Ink-reveal on card headings — luminous sweep across title text
              if (accent) {
                const headings = accent.querySelectorAll<HTMLElement>('h3, h4');
                headings.forEach((h, hi) => {
                  setTimeout(() => h.classList.add('ai-ink-revealed'), 200 + hi * 150);
                });
              }
            },
          },
        );

        // Position + rotation — scrub-linked, organic tilt that settles to 0
        const rotOffset = dir === 'right' ? 2.5 : dir === 'left' ? -2.5 : 0;
        gsap.fromTo(card,
          { x: xOffset, y: yOffset, rotation: rotOffset },
          {
            x: 0,
            y: 0,
            rotation: 0,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: card,
              start: CFG.start,
              end: CFG.end,
              scrub: CFG.scrub * (isMobile ? 0.6 : 1),
            },
          },
        );

      });

      // =================================================================
      // 2) SECTION HEADERS — slide in from left + accent line
      // =================================================================
      allHeaders.forEach((header) => {
        // Header text opacity — fire once
        gsap.fromTo(header,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: header,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
            onComplete() {
              // Gate one-shot CSS animations (diamond, etc.) behind scroll entry
              header.classList.add('ai-header-entered');

              // Glow pulse — brief luminous burst on section header entry
              if (isMobile) return;
              const label = header.querySelector<HTMLElement>('.ai-section-label');
              if (!label) return;
              const glow = document.createElement('div');
              glow.setAttribute('aria-hidden', 'true');
              Object.assign(glow.style, {
                position: 'absolute',
                left: '0',
                top: '50%',
                width: '200px',
                height: '40px',
                transform: 'translateY(-50%)',
                background: 'radial-gradient(ellipse at 0% 50%, rgba(192,132,252,0.4), transparent 70%)',
                pointerEvents: 'none',
                zIndex: '5',
                opacity: '1',
              });
              header.style.position = header.style.position || 'relative';
              header.appendChild(glow);
              requestAnimationFrame(() => {
                glow.style.transition = 'all 0.8s ease-out';
                glow.style.opacity = '0';
                glow.style.width = '400px';
                setTimeout(() => glow.remove(), 850);
              });
            },
          },
        );

        // Header text position — scrub
        gsap.fromTo(header,
          { x: HCFG.translateX * tScale },
          {
            x: 0,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: header,
              start: HCFG.start,
              end: HCFG.end,
              scrub: HCFG.scrub * (isMobile ? 0.6 : 1),
            },
          },
        );

        // Accent line — scaleX from left + trigger particle travel
        const accentLine = header.querySelector<HTMLElement>('.ai-section-line');
        if (accentLine) {
          gsap.fromTo(accentLine,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.8,
              ease: EASE.scaleReveal,
              scrollTrigger: {
                trigger: header,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
              onComplete() {
                accentLine.classList.add('ai-line-revealed');
              },
            },
          );
        }
      });

      // Vertical connector lines — grow from previous section to next header
      // Connector height: 5.5rem desktop, 4rem mobile (must match ai-mode.css)
      const connH = window.innerWidth < 640 ? 64 : 88;

      allHeaders.forEach((header) => {
        // Skip first section (no connector above it)
        if (header.id === 'ai-section-0') return;

        // The ::before pseudo uses --connector-progress for scaleY
        // The ::after (junction node) uses --connector-progress for scale
        // GSAP can't interpolate unregistered CSS vars — use proxy object
        const connProxy = { p: 0 };
        const traveler = header.querySelector<HTMLElement>('.ai-connector-traveler');

        gsap.fromTo(connProxy,
          { p: 0 },
          {
            p: 1,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: header,
              start: 'top 95%',
              end: 'top 70%',
              scrub: 1.0,
            },
            onUpdate() {
              header.style.setProperty('--connector-progress', String(connProxy.p));

              // Traveler rides the connector's leading edge
              if (traveler) {
                // y offset: at p=0 → top of connector (-connH), at p=1 → junction node (0)
                const y = -connH * (1 - connProxy.p);
                traveler.style.transform = `translateY(${y}px)`;
                // Fade: invisible at start, quickly visible in mid-range, fade out at end
                const op = connProxy.p < 0.03 ? 0
                  : connProxy.p > 0.92 ? Math.max(0, (1 - connProxy.p) * 12.5)
                  : 1;
                traveler.style.opacity = String(op);
              }
            },
          },
        );
      });

      // Accent lines — scaleX from 0 to 1
      allLines.forEach((line) => {
        gsap.fromTo(line,
          { scaleX: 0, opacity: 0.5 },
          {
            scaleX: 1,
            opacity: 1,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: line,
              start: 'top 88%',
              end: 'top 55%',
              scrub: 1.2,
            },
          },
        );
      });

      // Section number watermarks — fade+scale + depth parallax drift
      container.querySelectorAll<HTMLElement>('.ai-section-num').forEach((num) => {
        const header = num.closest('[data-ai-header]') || num;

        // Fire-once reveal
        gsap.fromTo(num,
          { opacity: 0, scale: 0.7 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: header,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          },
        );

        // Slow parallax — number drifts at different speed than parent, creating layered depth
        if (!isMobile) {
          gsap.fromTo(num,
            { y: 30 },
            {
              y: -30,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: header,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 2.5,
              },
            },
          );
        }
      });

      // Section divider — fade in container on scroll, then gem + lines
      container.querySelectorAll<HTMLElement>('.ai-section-divider').forEach((div) => {
        gsap.fromTo(div,
          { opacity: 0, scaleX: 0.3, xPercent: -50 },
          {
            opacity: 1,
            scaleX: 1,
            xPercent: -50,
            duration: 0.8,
            ease: EASE.scaleReveal,
            scrollTrigger: {
              trigger: div,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
            onComplete() {
              div.classList.add('ai-divider-entered');
            },
          },
        );
        const gem = div.querySelector<HTMLElement>('.ai-section-divider-gem');
        if (gem) {
          gsap.fromTo(gem,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.6,
              ease: EASE.scaleReveal,
              scrollTrigger: {
                trigger: div,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
              onComplete() {
                // Trigger discharge flash + lateral beams (CSS-driven)
                const core = gem.querySelector<HTMLElement>('.ai-section-divider-gem-core');
                if (core) core.classList.add('ai-discharged');
                gem.classList.add('ai-fired');
              },
            },
          );
        }
        // Divider lines — scaleX from center
        div.querySelectorAll<HTMLElement>('.ai-section-divider-line').forEach((line) => {
          gsap.fromTo(line,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: div,
                start: 'top 88%',
                end: 'top 60%',
                scrub: 1.0,
              },
            },
          );
        });
      });

      // =================================================================
      // 3) BOOT TERMINAL — sequential line reveals with typing effect
      // =================================================================
      const bootContainer = container.querySelector('.ai-system-boot');
      if (bootContainer) {
        const bootLines = bootContainer.querySelectorAll<HTMLElement>('.ai-boot-entry');
        const bootTl = gsap.timeline({
          scrollTrigger: {
            trigger: bootContainer,
            start: 'top 75%',
            toggleActions: 'play none none none',
          },
        });

        bootLines.forEach((line, i) => {
          const text = line.querySelector<HTMLElement>('.ai-boot-text');
          const status = line.querySelector<HTMLElement>('.ai-boot-status');

          // Initially hidden
          gsap.set(line, { opacity: 0 });
          if (status) gsap.set(status, { opacity: 0 });

          // Stagger: each line appears 0.5s after previous
          bootTl.to(line, {
            opacity: 1,
            duration: 0.3,
            ease: EASE.enter,
          }, i * 0.5);

          // Typing shimmer on text
          if (text) {
            bootTl.fromTo(text,
              { backgroundSize: '0% 100%' },
              { backgroundSize: '100% 100%', duration: 0.4, ease: 'power1.inOut' },
              i * 0.5 + 0.1,
            );
          }

          // Status badge pops in after text
          if (status) {
            bootTl.to(status, {
              opacity: 1,
              duration: 0.2,
              ease: EASE.enter,
            }, i * 0.5 + 0.35);
          }
        });

        // Boot flash — bright purple burst on desktop after all lines
        const flash = bootContainer.querySelector<HTMLElement>('.ai-boot-flash');
        if (flash && !isMobile) {
          bootTl.fromTo(flash,
            { opacity: 0, scaleY: 0 },
            { opacity: 1, scaleY: 1, duration: 0.15, ease: 'power4.in' },
            bootLines.length * 0.5 + 0.2,
          );
          bootTl.to(flash,
            { opacity: 0, scaleY: 3, duration: 0.6, ease: 'power2.out' },
            bootLines.length * 0.5 + 0.35,
          );
        }

        // Heartbeat status line — starts after boot sequence
        const heartbeat = bootContainer.querySelector<HTMLElement>('.ai-boot-heartbeat');
        if (heartbeat) {
          const statusMessages = [
            'analiza w toku...',
            'przetwarzanie wzorców...',
            'korelacja danych...',
            'generowanie profili...',
            'system aktywny ■',
          ];
          let msgIndex = 0;
          bootTl.call(() => {
            const cycle = () => {
              if (!heartbeat.isConnected) return;
              heartbeat.textContent = statusMessages[msgIndex % statusMessages.length];
              msgIndex++;
              setTimeout(cycle, 3000);
            };
            cycle();
          }, [], bootLines.length * 0.5 + 0.6);
        }
      }

      // =================================================================
      // 4) SCROLL VIGNETTE — edges darken as you scroll deeper
      // =================================================================
      const vignette = container.closest('[data-mode="ai"]')?.querySelector<HTMLElement>('.ai-scroll-vignette')
        ?? document.querySelector<HTMLElement>('.ai-scroll-vignette');
      if (vignette) {
        gsap.fromTo(vignette,
          { opacity: 0 },
          {
            opacity: 1,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: container,
              start: 'top top',
              end: '40% top',
              scrub: 2,
            },
          },
        );
      }

      // =================================================================
      // 4b) SCROLL COLOR TEMPERATURE — nebula hue shift with depth
      // =================================================================
      // Animate the nebula CSS custom properties so the background
      // gradient shifts from cool violet (270) to warm magenta (290).
      const modeContainer = container.closest<HTMLElement>('[data-mode="ai"]');
      if (modeContainer) {
        const hueProxy = { hue: 270, accent: 260 };
        gsap.to(hueProxy, {
          hue: 295,
          accent: 285,
          ease: EASE.scrub,
          scrollTrigger: {
            trigger: container,
            start: 'top top',
            end: '85% bottom',
            scrub: 3,
            onUpdate() {
              modeContainer.style.setProperty('--nebula-hue', String(Math.round(hueProxy.hue)));
              modeContainer.style.setProperty('--nebula-accent', String(Math.round(hueProxy.accent)));
            },
          },
        });
      }

      // =================================================================
      // 5) GATEWAY PORTAL — scale and fade entry
      // =================================================================
      const gateway = container.querySelector('.ai-scroll-cue');
      if (gateway) {
        const orb = gateway.querySelector('.ai-gateway-orb');
        if (orb) {
          gsap.fromTo(orb,
            { scale: 0.4, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              ease: EASE.scaleReveal,
              scrollTrigger: {
                trigger: gateway,
                start: 'top 80%',
                end: 'top 45%',
                scrub: 1.5,
              },
            },
          );
        }

        // Chevrons — staggered fade
        const chevrons = gateway.querySelectorAll<HTMLElement>('.ai-scroll-chevrons svg');
        chevrons.forEach((chev, i) => {
          gsap.fromTo(chev,
            { opacity: 0, y: -8 },
            {
              opacity: 1 - i * 0.2,
              y: 0,
              duration: 0.5,
              delay: 0.3 + i * 0.15,
              ease: EASE.enter,
              scrollTrigger: {
                trigger: gateway,
                start: 'top 70%',
                toggleActions: 'play none none none',
              },
            },
          );
        });
      }

      // =================================================================
      // 6) FIN SECTION — dramatic cinematic reveal
      // =================================================================
      const finSection = container.querySelector('.ai-fin-separator');
      if (finSection) {
        // FIN text — scale up from tiny
        const finText = finSection.querySelector<HTMLElement>('.ai-fin-text');
        if (finText) {
          gsap.fromTo(finText,
            { scale: 0.3, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              ease: EASE.scaleReveal,
              scrollTrigger: {
                trigger: finSection,
                start: 'top 65%',
                end: 'top 30%',
                scrub: 1.5,
              },
            },
          );
        }

        // FIN lines — grow from center
        const finLineL = finSection.querySelector('.ai-fin-line-left');
        const finLineR = finSection.querySelector('.ai-fin-line-right');
        [finLineL, finLineR].forEach((line) => {
          if (!line) return;
          gsap.fromTo(line,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: finSection,
                start: 'top 60%',
                end: 'top 25%',
                scrub: 1.2,
              },
            },
          );
        });

        // FIN subtitle
        const finSub = finSection.querySelector('.ai-fin-subtitle');
        if (finSub) {
          gsap.fromTo(finSub,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: EASE.enter,
              scrollTrigger: {
                trigger: finSection,
                start: 'top 40%',
                toggleActions: 'play none none none',
              },
            },
          );
        }

        // FIN glow backdrop
        const finGlow = finSection.querySelector('.ai-fin-glow');
        if (finGlow) {
          gsap.fromTo(finGlow,
            { opacity: 0 },
            {
              opacity: 1,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: finSection,
                start: 'top 70%',
                end: 'top 35%',
                scrub: 2,
              },
            },
          );
        }

        // Diamond ornament
        const diamond = finSection.querySelector('.ai-fin-diamond');
        if (diamond) {
          gsap.fromTo(diamond,
            { scale: 0, rotation: 0 },
            {
              scale: 1,
              rotation: 45,
              ease: EASE.scaleReveal,
              scrollTrigger: {
                trigger: finSection,
                start: 'top 55%',
                end: 'top 30%',
                scrub: 1.0,
              },
            },
          );
        }

        // Particle burst — shower of purple particles from FIN center
        if (!isMobile && finText) {
          ScrollTrigger.create({
            trigger: finSection,
            start: 'top 40%',
            once: true,
            onEnter() {
              const PARTICLE_COUNT = 16;
              const parent = finText.parentElement ?? finText;
              parent.style.position = parent.style.position || 'relative';

              for (let i = 0; i < PARTICLE_COUNT; i++) {
                const p = document.createElement('div');
                p.setAttribute('aria-hidden', 'true');
                const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
                const dist = 60 + Math.random() * 100;
                const dx = Math.cos(angle) * dist;
                const dy = Math.sin(angle) * dist;
                const size = 2 + Math.random() * 3;
                const hue = 260 + Math.random() * 40;
                Object.assign(p.style, {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: '50%',
                  background: `hsla(${hue}, 80%, 75%, 0.9)`,
                  boxShadow: `0 0 ${size * 3}px hsla(${hue}, 70%, 60%, 0.5)`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: '30',
                  opacity: '0',
                });
                parent.appendChild(p);

                const delay = Math.random() * 120;
                requestAnimationFrame(() => {
                  p.style.transition = `all ${0.5 + Math.random() * 0.5}s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
                  p.style.opacity = '1';
                  p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`;
                  setTimeout(() => {
                    p.style.transition = 'all 0.5s ease-in';
                    p.style.opacity = '0';
                    p.style.transform = `translate(calc(-50% + ${dx * 1.4}px), calc(-50% + ${dy * 1.4}px)) scale(0)`;
                    setTimeout(() => p.remove(), 550);
                  }, 400 + delay);
                });
              }
            },
          });
        }
      }

      // =================================================================
      // 6b) ACHIEVEMENT TOAST — "scan complete" notification at FIN
      // =================================================================
      if (finSection) {
        ScrollTrigger.create({
          trigger: finSection,
          start: 'top 50%',
          once: true,
          onEnter() {
            // Build toast DOM
            const toast = document.createElement('div');
            toast.className = 'ai-achievement-toast';
            toast.setAttribute('aria-hidden', 'true');
            toast.innerHTML = `
              <div class="ai-achievement-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L10.2 5.5L15 6.2L11.5 9.6L12.4 14.4L8 12.1L3.6 14.4L4.5 9.6L1 6.2L5.8 5.5L8 1Z" fill="rgba(192,132,252,0.6)" stroke="rgba(192,132,252,0.9)" stroke-width="0.75"/>
                </svg>
              </div>
              <div class="ai-achievement-text">
                <span class="ai-achievement-title">Skan Zakończony</span>
                <span class="ai-achievement-sub">przeanalizowano wszystkie sekcje</span>
              </div>
            `;
            Object.assign(toast.style, {
              transform: 'translateX(120%)',
              opacity: '0',
            });
            document.body.appendChild(toast);

            // Slide in
            requestAnimationFrame(() => {
              toast.style.transition = 'all 0.6s cubic-bezier(0.16,1,0.3,1)';
              toast.style.transform = 'translateX(0)';
              toast.style.opacity = '1';

              // Auto-dismiss after 4s
              setTimeout(() => {
                toast.style.transition = 'all 0.5s cubic-bezier(0.7,0,0.84,0)';
                toast.style.transform = 'translateX(120%)';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 550);
              }, 4000);
            });
          },
        });
      }

      // =================================================================
      // 7) DISCLAIMER — subtle center fade
      // =================================================================
      const disclaimer = container.querySelector('[data-ai-card="center"]');
      if (disclaimer) {
        gsap.fromTo(disclaimer,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: disclaimer,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        );
      }

      // =================================================================
      // 8) PROXIMITY-REACTIVE CARD GLOW — viewport center distance
      // =================================================================
      // GSAP ticker runs every frame: compute each card's distance to
      // viewport center, set CSS custom properties for glow + lift.
      if (!isMobile) {
        const proximityCards = container.querySelectorAll<HTMLElement>('[data-ai-card]');
        let prevScrollY = window.scrollY;
        let scrollVelocity = 0; // -1 to 1 (negative = up, positive = down)

        const updateProximity = () => {
          const viewH = window.innerHeight;
          const center = viewH / 2;
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - prevScrollY;
          prevScrollY = currentScrollY;

          // Smooth velocity (for tilt)
          const targetVelocity = Math.max(-1, Math.min(1, delta / 20));
          scrollVelocity += (targetVelocity - scrollVelocity) * 0.1;

          // Skip when scroll hasn't moved (no delta = nothing changed)
          if (delta === 0 && Math.abs(scrollVelocity) < 0.001) return;

          proximityCards.forEach((card) => {
            const rect = card.getBoundingClientRect();

            // Skip style writes for off-screen cards — avoids unnecessary recalculations
            if (rect.bottom < -100 || rect.top > viewH + 100) return;

            const cardCenter = rect.top + rect.height / 2;
            const dist = Math.abs(cardCenter - center);
            const maxDist = viewH * 0.6;
            const proximity = Math.max(0, 1 - dist / maxDist);

            // Set CSS custom props consumed by proximity glow rules
            card.style.setProperty('--proximity', proximity.toFixed(3));
            const accent = card.querySelector<HTMLElement>('.analysis-card-accent');
            if (accent) {
              accent.style.setProperty('--proximity-glow', (proximity * 0.45).toFixed(3));
              // NOTE: Removed inline style.transform overwrite — it was clobbering the CSS
              // proximity-based translateY/scale from ai-mode.css line 314.
            }
          });
        };

        gsap.ticker.add(updateProximity);

        // Cleanup on context revert
        const ctx = gsap.context(() => {}, container);
        ctx.add(() => {
          return () => gsap.ticker.remove(updateProximity);
        });
      }

      // (Section 9 — inner content parallax removed: GSAP fromTo on h3/h4, SVGs,
      // charts conflicted with CSS transitions on the same elements, causing jumps.)

      // =================================================================
      // 10) SCROLL PROGRESS BAR — GSAP-driven scaleX on progress bar
      // =================================================================
      const progressBar = document.querySelector<HTMLElement>('.ai-scroll-progress');
      if (progressBar) {
        gsap.fromTo(progressBar,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.3,
            },
          },
        );
      }

      // =================================================================
      // 11) SCROLL VELOCITY EDGE GLOW — speed-dependent purple edges
      // =================================================================
      if (!isMobile) {
        const viewportFrame = document.querySelector<HTMLElement>('.ai-viewport-frame');
        let lastScrollY = window.scrollY;
        let velocityGlow = 0;
        let streakCooldown = 0;
        const activeStreaks: HTMLElement[] = [];

        const spawnStreak = (direction: number) => {
          const streak = document.createElement('div');
          streak.className = 'ai-speed-streak';
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const y = Math.random() * vh * 0.8 + vh * 0.1;
          const width = 80 + Math.random() * 160;
          const startX = direction > 0
            ? -width - 20
            : vw + 20;

          Object.assign(streak.style, {
            top: `${y.toFixed(0)}px`,
            left: `${startX.toFixed(0)}px`,
            width: `${width.toFixed(0)}px`,
            opacity: '0',
          });

          document.body.appendChild(streak);
          activeStreaks.push(streak);

          const endX = direction > 0 ? vw + width + 40 : -width - 40;
          gsap.fromTo(streak,
            { x: 0, opacity: 0 },
            {
              x: endX - startX,
              opacity: 0.6,
              duration: 0.3 + Math.random() * 0.2,
              ease: 'power2.in',
              onComplete() {
                streak.remove();
                const idx = activeStreaks.indexOf(streak);
                if (idx >= 0) activeStreaks.splice(idx, 1);
              },
            },
          );
        };

        const updateVelocity = () => {
          const currentY = window.scrollY;
          const rawDelta = currentY - lastScrollY;
          const delta = Math.abs(rawDelta);
          lastScrollY = currentY;

          // Map scroll speed to glow intensity (0-1)
          const speed = Math.min(delta / 40, 1); // 40px/frame = max
          velocityGlow += (speed - velocityGlow) * 0.15; // Smooth lerp

          // Skip style writes when glow has decayed to nothing
          if (delta === 0 && velocityGlow < 0.005) {
            velocityGlow = 0;
            return;
          }

          if (viewportFrame) {
            const intensity = velocityGlow * 0.6;
            viewportFrame.style.boxShadow = intensity > 0.02
              ? `inset 0 0 ${30 + intensity * 80}px rgba(168,85,247,${(intensity * 0.35).toFixed(3)}), inset 0 0 ${60 + intensity * 120}px rgba(139,92,246,${(intensity * 0.15).toFixed(3)})`
              : '';
          }

          // Speed streaks — spawn when scrolling fast
          streakCooldown = Math.max(0, streakCooldown - 1);
          if (speed > 0.55 && streakCooldown <= 0 && activeStreaks.length < 6) {
            const direction = rawDelta > 0 ? 1 : -1;
            const count = speed > 0.8 ? 2 : 1;
            for (let s = 0; s < count; s++) {
              spawnStreak(direction);
            }
            streakCooldown = 3 + Math.floor(Math.random() * 3); // 3-5 frames cooldown
          }
        };

        gsap.ticker.add(updateVelocity);

        // Stash for cleanup
        const cleanupVelocity = () => {
          gsap.ticker.remove(updateVelocity);
          activeStreaks.forEach((s) => s.remove());
          activeStreaks.length = 0;
        };
        container.dataset.aiCleanup = '1';
        // Will be cleaned up in the return block
        (container as unknown as { _aiVelocityCleanup: () => void })._aiVelocityCleanup = cleanupVelocity;
      }

      // =================================================================
      // 11) STATS BANNER — handled by component's own IntersectionObserver
      //     (no GSAP override needed)
      // =================================================================

      // ── Late-mounting Suspense observer ──
      const lateObs = new MutationObserver(
        debounce(() => {
          // Re-scan for newly mounted cards that need animations
          const newCards = container.querySelectorAll<HTMLElement>('[data-ai-card]:not([data-ai-animated])');
          newCards.forEach((card) => {
            card.setAttribute('data-ai-animated', '1');
            const dir = card.getAttribute('data-ai-card');
            const xOffset = dir === 'right'
              ? CFG.translateX * tScale
              : dir === 'left'
                ? -CFG.translateX * tScale
                : 0;

            gsap.fromTo(card,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.8,
                ease: EASE.enter,
                scrollTrigger: {
                  trigger: card,
                  start: 'top 88%',
                  toggleActions: 'play none none none',
                },
                onComplete() {
                  const accent = card.querySelector<HTMLElement>('.analysis-card-accent');
                  if (accent) {
                    accent.classList.add('ai-scanned');
                    // Ink-reveal headings
                    accent.querySelectorAll<HTMLElement>('h3, h4').forEach((h, hi) => {
                      setTimeout(() => h.classList.add('ai-ink-revealed'), 200 + hi * 150);
                    });
                  }
                },
              },
            );

            const rotOffset = dir === 'right' ? 2.5 : dir === 'left' ? -2.5 : 0;
            gsap.fromTo(card,
              { x: xOffset, y: CFG.translateY * tScale, rotation: rotOffset },
              {
                x: 0,
                y: 0,
                rotation: 0,
                ease: EASE.scrub,
                scrollTrigger: {
                  trigger: card,
                  start: CFG.start,
                  end: CFG.end,
                  scrub: CFG.scrub * (isMobile ? 0.6 : 1),
                },
              },
            );
          });
        }, 150),
      );
      lateObs.observe(container, { childList: true, subtree: true });

      // Mark initial cards as animated
      allCards.forEach((c) => c.setAttribute('data-ai-animated', '1'));

      // ── Cleanup ──
      return () => {
        lateObs.disconnect();
        motionQuery.removeEventListener('change', handleMotionChange);
        // Remove will-change
        [...allCards, ...allHeaders, ...allLines].forEach((el) => {
          el.style.willChange = 'auto';
        });
        // Velocity ticker cleanup
        const velCleanup = (container as unknown as { _aiVelocityCleanup?: () => void })._aiVelocityCleanup;
        if (velCleanup) velCleanup();
      };
    },
    { scope: containerRef },
  );
}
