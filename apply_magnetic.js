const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cv-bzcommerce', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const jsInsert = `

        // ══ ZERO COGNITIVE LOAD: Magnetic Elements ══
        // Zastosowane do głównych akcji, wychylenie reaguje na kursor na dystansie samej szerokości elementu, z ułamkiem sily.
        const magneticElements = document.querySelectorAll('.cta-btn, .bot-nav a, .arrow-down');
        
        magneticElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                // Ultra-dysretny ruch (około 10-15% odległości kursora od centrum)
                const translateX = x * 0.15;
                const translateY = y * 0.15;
                
                el.style.transform = \`translate(\${translateX}px, \${translateY}px)\`;
            });
            
            el.addEventListener('mouseleave', () => {
                el.style.transform = ''; // Wróci dzięki klasie CSS bazowej
            });
            
            // Wymuszamy spring-transition tylko na transform
            el.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s, color 0.3s';
        });

`;

if (!content.includes('Magnetic Elements')) {
    content = content.replace('</script>', jsInsert + '\n    </script>');
    fs.writeFileSync(filePath, content);
    console.log('Magnetic Edge added successfully.');
} else {
    console.log('Magnetic Edge already present.');
}
