const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cv-bzcommerce', 'index.html');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const correctLines = lines.slice(0, 1374);
correctLines.push('            </div>');
correctLines.push('            <span class="arr">↗</span>');
correctLines.push('        </a>');
correctLines.push('    </div>');
correctLines.push('');

const remainingLines = lines.slice(1577);
const unindented = remainingLines.map(line => {
    if (line.startsWith('                ')) {
        return line.substring(16);
    } else if (line.match(/^\s*$/)) {
        return '';
    } else {
        const match = line.match(/^ {0,16}(.*)/);
        return match ? match[1] : line;
    }
});

const newContent = correctLines.join('\n') + '\n' + unindented.join('\n');
fs.writeFileSync(filePath, newContent);
console.log('Fixed file successfully.');
