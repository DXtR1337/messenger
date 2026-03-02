const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cv-bzcommerce', 'index.html');
const content = fs.readFileSync(filePath, 'utf8');

// 1. Zmiana CSS dla "Pasja do AI" sekcji z pepe i 0-cognitive load elementów
let newContent = content.replace(
    /(\.tw-pepe\s*\{[^}]*opacity:\s*)0\.15([^}]*\})/i,
    '$10.4$2\n            mix-blend-mode: normal;\n            filter: grayscale(80%) sepia(10%);'
);

// Usunięcie inwazyjnego overu z `.tw-section:hover .tw-pepe` 
newContent = newContent.replace(/\.tw-section:hover \.tw-pepe\s*\{[^}]*\}/i, '');


// 2. Dodanie CSS do "Spotlight Glow" / "Tilt" (ambient cards)
const cssInsert = `
        /* ══ 0-COGNITIVE LOAD MICRO-INTERACTIONS ══ */
        .ambient-card {
            position: relative;
        }
        .ambient-card::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.04) 0%, transparent 60%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 10;
        }
        .ambient-card:hover::before {
            opacity: 1;
        }
`;
newContent = newContent.replace('</style>', cssInsert + '\n    </style>');

// 3. Dodanie czystego mikro JS
const jsInsert = `

        // ══ ZERO COGNITIVE LOAD: Ambient Glow & Micro-Tilt ══
        document.querySelectorAll('.crd, .scard, .bi, .pvis').forEach(card => {
            card.classList.add('ambient-card');
            
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                card.style.setProperty('--mouse-x', \`\${x}px\`);
                card.style.setProperty('--mouse-y', \`\${y}px\`);
                
                // Extremely subtle tilt (Max 1.5 degrees) for 3D feeling without cognitive toll
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -1.5; 
                const rotateY = ((x - centerX) / centerX) * 1.5;
                
                // Apply ONLY to large visual bento block, keep text cards stable
                if(card.classList.contains('bi') || card.classList.contains('pvis') || card.classList.contains('scard')) {
                    card.style.transform = \`perspective(1000px) scale3d(1.02, 1.02, 1.02) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`;
                }
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = ''; // Reset CSS handles transition
            });
            
            // Native transition override for hardware acceleration
            card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.05), box-shadow 0.4s ease';
        });

`;
newContent = newContent.replace('</script>', jsInsert + '\n    </script>');


fs.writeFileSync(filePath, newContent);
console.log('Zero Cognitive Load Micro-Interactions Applied!');
