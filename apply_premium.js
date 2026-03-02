const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cv-bzcommerce', 'index.html');
const content = fs.readFileSync(filePath, 'utf8');

const newCSS = `    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            /* Premium Minimalist Palette */
            --white: #ffffff;
            --black: #050505;
            --dark: #0a0a0a;
            --dark-card: #141414;
            --gray: #737373;
            --gray-light: #a3a3a3;
            --gray-border: #e5e5e5;
            --accent: #2563eb; /* Modern tasteful blue instead of yellow for a more software-engineering feel, or we can keep it monochrome */
            --accent-glow: rgba(37, 99, 235, 0.15);
            
            /* Typography */
            --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --mono: 'JetBrains Mono', monospace;
            
            /* Layout & Animation */
            --max-w: 1120px;
            --ease: cubic-bezier(0.16, 1, 0.3, 1);
            --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.05);
        }

        html { scroll-behavior: smooth; font-size: 16px; background: var(--white); }

        body {
            font-family: var(--font);
            color: var(--black);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow-x: hidden;
            padding-bottom: 60px;
        }

        a { color: inherit; text-decoration: none; }
        img { max-width: 100%; display: block; }
        
        ::selection { background: var(--black); color: var(--white); }

        .wrap {
            max-width: var(--max-w);
            margin: 0 auto;
            padding: 0 5vw;
        }

        /* ══ BOTTOM NAV ══ */
        .bot-nav {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
            display: flex;
            align-items: center;
            background: rgba(10, 10, 10, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 100px;
            padding: 6px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .bot-nav .logo-box {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--white);
            color: var(--black);
            font-weight: 800;
            font-size: 0.65rem;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
        }

        .bot-nav a:not(.logo-box) {
            padding: 8px 16px;
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--gray-light);
            transition: color 0.3s var(--ease);
            border-radius: 100px;
        }

        .bot-nav a:not(.logo-box):hover {
            color: var(--white);
            background: rgba(255, 255, 255, 0.1);
        }

        @media(max-width: 768px) {
            .bot-nav { bottom: 16px; width: calc(100% - 32px); justify-content: space-between; overflow-x: auto; }
            .bot-nav::-webkit-scrollbar { display: none; }
        }

        /* ══ EYEBROW ══ */
        .top-eye {
            text-align: center;
            padding: 60px 0 0;
            font-family: var(--mono);
            font-size: 0.65rem;
            font-weight: 500;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--gray);
        }

        /* ══ HERO ══ */
        .hero {
            text-align: center;
            padding: 12vh 0 10vh;
            position: relative;
        }

        .hero-row {
            display: inline-flex;
            align-items: center;
            gap: 24px;
            justify-content: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .hero h1 {
            font-size: clamp(3.5rem, 8vw, 7rem);
            font-weight: 800;
            line-height: 1;
            letter-spacing: -0.04em;
            color: var(--black);
        }

        .logo-badge {
            background: var(--dark);
            color: var(--white);
            padding: 16px 24px;
            border-radius: 16px;
            font-weight: 800;
            font-size: clamp(1rem, 2vw, 1.5rem);
            letter-spacing: -0.02em;
            text-transform: uppercase;
            line-height: 1.1;
            text-align: left;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            transform: rotate(2deg);
        }

        .logo-badge small {
            font-size: 0.4em;
            vertical-align: super;
            font-weight: 600;
            opacity: 0.5;
        }

        .speech-bubble {
            position: absolute;
            bottom: -12px;
            right: -20px;
            background: var(--white);
            color: var(--black);
            border: 1px solid var(--gray-border);
            padding: 6px 14px;
            border-radius: 100px;
            font-family: var(--mono);
            font-size: 0.7rem;
            font-weight: 500;
            white-space: nowrap;
            display: flex;
            align-items: center;
            transform: rotate(-4deg);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
        }

        #speech-tw::after {
            content: '';
            display: inline-block;
            width: 4px;
            height: 1em;
            background: var(--accent);
            margin-left: 4px;
            vertical-align: middle;
            animation: blink 1s step-end infinite;
        }

        .hero-sub {
            font-size: clamp(1.1rem, 2vw, 1.25rem);
            color: var(--gray);
            margin: 0 auto;
            line-height: 1.5;
            font-weight: 400;
            max-width: 500px;
        }
        
        .hero-sub span {
            display: block;
            margin-top: 8px;
            font-size: 0.9em;
            opacity: 0.7;
        }

        .arrow-down {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid var(--gray-border);
            margin: 60px auto 0;
            font-size: 1rem;
            color: var(--gray);
            transition: all 0.3s var(--ease);
        }

        .arrow-down:hover {
            background: var(--black);
            color: var(--white);
            border-color: var(--black);
        }

        /* ══ 3 DARK CARDS ══ */
        .cards-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            padding: 0 5vw;
            margin: 0 auto 120px;
            max-width: 1200px;
        }

        .scard {
            background: var(--dark);
            border-radius: 20px;
            overflow: hidden;
            transition: transform 0.5s var(--ease), box-shadow 0.5s var(--ease);
            cursor: pointer;
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .scard:hover {
            transform: translateY(-8px);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
        }

        .scard-img {
            width: 100%;
            aspect-ratio: 4/3;
            overflow: hidden;
            position: relative;
            background: var(--dark-card);
        }

        .scard-img .dots {
            position: absolute;
            top: 20px;
            left: 20px;
            display: flex;
            gap: 6px;
            z-index: 5;
        }

        .scard-img .dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transition: all 0.4s var(--ease);
        }

        .scard-img .dots span.active {
            background: var(--white);
            transform: scale(1.5);
        }

        .carousel-track {
            display: flex;
            width: 400%;
            height: 100%;
            transition: transform 0.8s var(--ease);
        }

        .carousel-slide {
            width: 25%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4.5rem;
            filter: grayscale(100%) opacity(0.8);
            transition: filter 0.5s var(--ease);
        }
        
        .scard:hover .carousel-slide {
            filter: grayscale(0%) opacity(1);
        }

        .scard-body {
            padding: 32px;
            color: var(--white);
            background: var(--dark);
        }

        .scard-body h3 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 6px;
            letter-spacing: -0.01em;
        }

        .scard-body .sub {
            font-size: 0.75rem;
            color: var(--gray-light);
            font-family: var(--mono);
        }

        .scard .arr {
            position: absolute;
            bottom: 32px;
            right: 32px;
            width: 36px;
            height: 36px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            color: var(--white);
            transition: all 0.4s var(--ease);
        }

        .scard:hover .arr {
            background: var(--white);
            color: var(--black);
            transform: rotate(45deg);
        }

        /* ══ INTRO ══ */
        .intro {
            text-align: center;
            padding: 60px 5vw 120px;
            max-width: 800px;
            margin: 0 auto;
        }

        .intro h2 {
            font-size: clamp(2rem, 4vw, 3rem);
            font-weight: 800;
            line-height: 1.2;
            letter-spacing: -0.03em;
            margin-bottom: 32px;
        }

        .intro .hl {
            color: var(--accent);
            position: relative;
            display: inline-block;
        }

        .intro p {
            font-size: clamp(1rem, 1.5vw, 1.15rem);
            color: var(--gray);
            line-height: 1.8;
            font-weight: 400;
        }

        /* ══ SECTION BASE ══ */
        section {
            padding: 120px 0;
            border-top: 1px solid var(--gray-border);
        }
        
        section.dark {
            background: var(--dark);
            color: var(--white);
            border-top: none;
        }

        .sh {
            margin-bottom: 64px;
        }

        .sh .lab {
            font-family: var(--mono);
            font-size: 0.7rem;
            font-weight: 500;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--gray);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .sh .lab::before {
            content: '';
            display: block;
            width: 24px;
            height: 1px;
            background: currentColor;
        }

        .sh h2 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 800;
            letter-spacing: -0.04em;
            line-height: 1.1;
        }

        section.dark .sh .lab { color: var(--gray-light); }

        .sh p {
            font-size: 1.1rem;
            color: var(--gray);
            max-width: 600px;
            margin-top: 24px;
            line-height: 1.6;
        }

        /* ══ 01. STACK TECHNOLOGICZNY ══ */
        .g2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
        }

        .crd {
            border: 1px solid var(--gray-border);
            border-radius: 20px;
            padding: 40px;
            background: var(--white);
            transition: box-shadow 0.4s var(--ease), transform 0.4s var(--ease);
        }

        .dark .crd {
            border-color: rgba(255,255,255,0.08);
            background: var(--dark-card);
        }

        .crd:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
        }

        .crd-eye {
            font-family: var(--mono);
            font-size: 0.65rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 16px;
        }
        .dark .crd-eye { color: var(--gray-light); }

        .crd h4 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.01em;
        }

        .crd p {
            font-size: 0.95rem;
            color: var(--gray);
            line-height: 1.7;
        }
        .dark .crd p { color: var(--gray-light); }

        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 40px;
        }

        .tag {
            font-family: var(--mono);
            font-size: 0.7rem;
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 100px;
            border: 1px solid var(--gray-border);
            color: var(--gray);
            background: transparent;
            transition: all 0.3s var(--ease);
        }

        .tag:hover {
            border-color: var(--black);
            color: var(--black);
        }

        .tag.hot {
            background: var(--black);
            color: var(--white);
            border-color: var(--black);
        }
        
        section.dark .tag { border-color: rgba(255,255,255,0.1); color: var(--white); }
        section.dark .tag.hot { background: var(--white); color: var(--black); border-color: var(--white); }

        /* ══ TYPEWRITER PEPE (Moved/Refined) ══ */
        .tw-section {
            background: var(--dark);
            border-radius: 32px;
            margin: 0 5vw 120px;
            padding: 140px 5vw;
            text-align: center;
            color: var(--white);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 70vh;
        }

        .tw-section .eye {
            font-family: var(--mono);
            font-size: 0.8rem;
            font-weight: 500;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--gray-light);
            margin-bottom: 32px;
        }

        .tw-section h2 {
            font-size: clamp(4rem, 10vw, 8rem);
            font-weight: 800;
            letter-spacing: -0.05em;
            line-height: 1;
            position: relative;
            z-index: 2;
        }

        .tw-pepe {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-5deg);
            width: clamp(300px, 40vw, 500px);
            opacity: 0.15;
            z-index: 1;
            mix-blend-mode: luminosity;
            transition: all 1s var(--ease);
            border-radius: 20px;
            pointer-events: none;
        }
        
        .tw-section:hover .tw-pepe {
            opacity: 0.3;
            transform: translate(-50%, -50%) rotate(0deg) scale(1.05);
        }

        .tw-word { position: relative; color: var(--white); }
        .tw-word::after {
            content: '';
            display: inline-block;
            width: 0.1em;
            height: 0.8em;
            background: var(--white);
            margin-left: 8px;
            vertical-align: baseline;
            animation: blink 1s step-end infinite;
        }

        /* ══ PROJECT ══ */
        .plist { display: flex; flex-direction: column; gap: 120px; }

        .proj {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8vh;
            align-items: center;
        }

        .ptype {
            font-family: var(--mono);
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--gray);
            margin-bottom: 12px;
        }
        .dark .ptype { color: var(--gray-light); }

        .pinfo h3 {
            font-size: clamp(2rem, 3vw, 2.5rem);
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 24px;
            line-height: 1.1;
        }

        .pinfo p {
            font-size: 1.05rem;
            color: var(--gray);
            line-height: 1.7;
            margin-bottom: 16px;
        }
        .dark .pinfo p { color: rgba(255,255,255,0.7); }

        .plink {
            font-weight: 600;
            font-size: 0.9rem;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s var(--ease);
            padding: 12px 24px;
            border-radius: 100px;
            border: 1px solid var(--gray-border);
            margin-top: 16px;
        }

        .dark .plink { border-color: rgba(255,255,255,0.2); }

        .plink:hover {
            background: var(--black);
            color: var(--white);
            border-color: var(--black);
            gap: 12px;
        }
        
        .dark .plink:hover {
            background: var(--white);
            color: var(--black);
        }

        .pvis {
            background: #f5f5f5;
            border-radius: 24px;
            aspect-ratio: 4/3;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: 1px solid var(--gray-border);
        }
        .dark .pvis { background: var(--dark-card); border-color: rgba(255,255,255,0.05); }

        .pvis .em { font-size: 6rem; opacity: 0.2; transition: transform 0.5s var(--ease); }
        .proj:hover .pvis .em { transform: scale(1.1); opacity: 0.4; }

        .ptags { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
        .ptag {
            font-family: var(--mono);
            font-size: 0.65rem;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 6px;
            background: #f0f0f0;
            color: var(--gray);
        }
        .dark .ptag { background: rgba(255,255,255,0.05); color: var(--gray-light); }

        .btn-outline {
            display: inline-block;
            padding: 16px 40px;
            border: 1px solid var(--gray-border);
            border-radius: 100px;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: all 0.3s var(--ease);
        }

        .btn-outline:hover { background: var(--black); color: var(--white); border-color: var(--black); }

        /* ══ BENTO ══ */
        .bento {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-auto-rows: 240px;
            gap: 16px;
        }

        .bi {
            position: relative;
            overflow: hidden;
            border-radius: 20px;
            cursor: pointer;
            background: var(--dark-card);
        }

        .bi-tall { grid-row: span 2; }
        .bi-wide { grid-column: span 2; }

        .bi img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.7s var(--ease), filter 0.7s var(--ease);
            filter: brightness(0.7) contrast(1.1);
        }

        .bi:hover img {
            transform: scale(1.05);
            filter: brightness(1) contrast(1);
        }

        .bi-ov {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 60%);
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 24px;
            opacity: 0;
            transition: opacity 0.4s var(--ease);
        }

        .bi:hover .bi-ov { opacity: 1; }

        .bi-badge {
            position: absolute;
            top: 20px;
            right: 20px;
            font-family: var(--mono);
            font-size: 0.6rem;
            font-weight: 700;
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 100px;
            color: #fff;
            border: 1px solid rgba(255,255,255,0.2);
        }

        .bi-ov h4 { color: #fff; font-size: 1.1rem; font-weight: 700; }

        /* ══ TIMELINE ══ */
        .tl { display: flex; flex-direction: column; }
        .tl-i {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 32px;
            padding: 32px 0;
            border-top: 1px solid var(--gray-border);
        }
        .dark .tl-i { border-color: rgba(255,255,255,0.1); }

        .tl-y {
            font-family: var(--mono);
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--gray);
            padding-top: 4px;
        }

        .tl-c h4 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.01em; }
        .tl-s { font-size: 0.85rem; color: var(--accent); font-weight: 600; margin-bottom: 12px; }
        .dark .tl-s { color: var(--white); opacity: 0.8; }
        .tl-d { font-size: 1rem; color: var(--gray); line-height: 1.6; }
        .dark .tl-d { color: var(--gray-light); }

        /* ══ CTA ══ */
        .cta {
            background: var(--dark);
            border-radius: 32px;
            margin: 0 5vw 120px;
            padding: 100px 80px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            align-items: center;
            color: var(--white);
            position: relative;
            overflow: hidden;
        }

        .cta h2 { font-size: clamp(2.5rem, 4vw, 3.5rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 24px;}
        .cta p { font-size: 1.1rem; color: var(--gray-light); line-height: 1.6;}
        
        .cta-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 32px;
            padding: 18px 40px;
            background: var(--white);
            color: var(--black);
            border-radius: 100px;
            font-weight: 700;
            font-size: 0.95rem;
            transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
        }

        .cta-btn:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(255, 255, 255, 0.15);
        }

        .cta-r { display: flex; flex-direction: column; gap: 24px; text-align: left; background: rgba(255,255,255,0.03); padding: 40px; border-radius: 24px;}
        .cta-r .cl {
            font-family: var(--mono);
            font-size: 0.65rem;
            color: var(--gray);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .cta-r a, .cta-r span {
            font-size: 1.1rem;
            font-weight: 500;
            color: var(--white);
            transition: opacity 0.3s ease;
        }
        .cta-r a:hover { opacity: 0.7; }

        /* ══ FOOTER ══ */
        .foot {
            padding: 40px 5vw 100px;
            text-align: center;
            border-top: 1px solid var(--gray-border);
        }
        .foot .fn { font-weight: 700; font-size: 0.9rem; margin-bottom: 8px; }
        .foot p { font-size: 0.8rem; color: var(--gray); line-height: 1.6; }
        .gdpr { margin-top: 32px; max-width: 600px; margin-inline: auto; opacity: 0.6;}

        /* ══ PREMIUM REVEAL ANIMATIONS ══ */
        .rv, .rv-left, .rv-right, .rv-scale {
            opacity: 0;
            filter: blur(10px);
            will-change: transform, opacity, filter;
            transition: opacity 1.2s var(--ease), transform 1.2s var(--ease), filter 1.2s var(--ease);
        }

        .rv { transform: translateY(40px); }
        .rv-left { transform: translateX(-50px); }
        .rv-right { transform: translateX(50px); }
        .rv-scale { transform: scale(0.95) translateY(20px); }

        .vis {
            opacity: 1 !important;
            transform: translate(0, 0) scale(1) !important;
            filter: blur(0) !important;
        }

        .stagger > * {
            opacity: 0;
            transform: translateY(30px);
            filter: blur(8px);
            transition: opacity 1s var(--ease), transform 1s var(--ease), filter 1s var(--ease);
        }

        .stagger.vis > * {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
        }

        /* Stagger Delays up to 10 elements */
        .stagger.vis > *:nth-child(1) { transition-delay: 0.05s; }
        .stagger.vis > *:nth-child(2) { transition-delay: 0.15s; }
        .stagger.vis > *:nth-child(3) { transition-delay: 0.25s; }
        .stagger.vis > *:nth-child(4) { transition-delay: 0.35s; }
        .stagger.vis > *:nth-child(5) { transition-delay: 0.45s; }
        .stagger.vis > *:nth-child(6) { transition-delay: 0.55s; }
        .stagger.vis > *:nth-child(7) { transition-delay: 0.65s; }
        .stagger.vis > *:nth-child(8) { transition-delay: 0.75s; }

        @media(max-width: 1024px) {
            .cards-3 { grid-template-columns: repeat(2, 1fr); }
            .bento { grid-template-columns: repeat(2, 1fr); }
            .proj { grid-template-columns: 1fr; gap: 40px; }
            .proj.rev .pinfo { order: 2; }
            .proj.rev .pvis { order: 1; }
            .cta { grid-template-columns: 1fr; padding: 60px 40px; }
        }

        @media(max-width: 768px) {
            .g2, .cards-3, .bento { grid-template-columns: 1fr; }
            .tl-i { grid-template-columns: 1fr; gap: 8px; padding: 24px 0; }
            .hero { padding: 8vh 0; }
            section { padding: 80px 0; }
            .tw-section { padding: 80px 5vw; }
            .cta { padding: 40px 24px; }
            .cta-r { padding: 24px; }
        }
    </style>`;

const newScript = `<script>
        // Advanced Premium Intersection Observer
        const observerConfig = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add slight delay to make scrolling feel more deliberate
                    requestAnimationFrame(() => {
                        entry.target.classList.add('vis');
                    });
                    // Only reveal once for premium feel (no re-animating on scroll up)
                    observer.unobserve(entry.target);
                }
            });
        }, observerConfig);

        document.querySelectorAll('.rv, .rv-left, .rv-right, .rv-scale, .stagger').forEach(el => {
            observer.observe(el);
        });

        // Refined Typewriter Effect
        const words = ['AI', 'Kodowania', 'Design\\'u', 'Psychologii', 'E-commerce'];
        const twEl = document.getElementById('tw');
        let wi = 0, ci = 0, isDeleting = false;
        
        function typeWriter() {
            const currentWord = words[wi];
            const typeSpeed = isDeleting ? 40 : 100;
            
            if (isDeleting) {
                twEl.textContent = currentWord.substring(0, ci - 1);
                ci--;
            } else {
                twEl.textContent = currentWord.substring(0, ci + 1);
                ci++;
            }

            if (!isDeleting && ci === currentWord.length) {
                setTimeout(() => { isDeleting = true; typeWriter(); }, 2000);
            } else if (isDeleting && ci === 0) {
                isDeleting = false;
                wi = (wi + 1) % words.length;
                setTimeout(typeWriter, 500);
            } else {
                setTimeout(typeWriter, typeSpeed + (Math.random() * 50)); // Add slight human randomness
            }
        }

        // Speech Bubble Typewriter
        const speechWords = ['Cześć! 👋', 'Hello! ✨', 'Dzień dobry! 🚀'];
        const speechEl = document.getElementById('speech-tw');
        let swi = 0, sci = 0, sIsDeleting = false;
        
        function speechTypeWriter() {
            const w = speechWords[swi];
            const spd = sIsDeleting ? 30 : 80;
            
            if (sIsDeleting) {
                speechEl.textContent = w.substring(0, sci - 1);
                sci--;
            } else {
                speechEl.textContent = w.substring(0, sci + 1);
                sci++;
            }

            if (!sIsDeleting && sci === w.length) {
                setTimeout(() => { sIsDeleting = true; speechTypeWriter(); }, 3000);
            } else if (sIsDeleting && sci === 0) {
                sIsDeleting = false;
                swi = (swi + 1) % speechWords.length;
                setTimeout(speechTypeWriter, 400);
            } else {
                setTimeout(speechTypeWriter, spd);
            }
        }

        setTimeout(typeWriter, 1000);
        setTimeout(speechTypeWriter, 1500);

        // Smooth Carousel
        const allCards = document.querySelectorAll('.scard-img');
        let carouselIdx = 0;
        setInterval(() => {
            carouselIdx = (carouselIdx + 1) % 4;
            allCards.forEach(card => {
                const track = card.querySelector('.carousel-track');
                const dots = card.querySelectorAll('.dots span');
                if (track) {
                    track.style.transform = \`translateX(-\${carouselIdx * 25}%)\`;
                    dots.forEach((d, i) => d.classList.toggle('active', i === carouselIdx));
                }
            });
        }, 5000);

        // Parallax Effects
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    
                    // Subtle hero parallax
                    const hero = document.querySelector('.hero');
                    if (hero && scrolled < window.innerHeight) {
                        hero.style.transform = \`translateY(\${scrolled * 0.15}px)\`;
                    }
                    
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    </script>`;

// Simple replace by regex matching the blocks
const styleRegex = /<style>[\s\S]*?<\/style>/i;
const scriptRegex = /<script>[\s\S]*?<\/script>/i;

let nextContent = content.replace(styleRegex, newCSS);
// We might have multiple script tags (like devtool.js at the bottom). We want to replace the first inline script block.
// Or we can just explicitly replace the specific script block by finding its start and end.

const scriptStartIdx = nextContent.indexOf('<script>\n                        // Multi-type reveal');
const scriptEndIdx = nextContent.indexOf('</script>', scriptStartIdx) + 9;

if (scriptStartIdx !== -1 && scriptEndIdx !== -1) {
    const beforeScript = nextContent.substring(0, scriptStartIdx);
    const afterScript = nextContent.substring(scriptEndIdx);
    nextContent = beforeScript + newScript + afterScript;
}

fs.writeFileSync(filePath, nextContent);
console.log('UI/UX Premium Design Applied!');
