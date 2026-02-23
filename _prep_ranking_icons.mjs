import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const outDir = 'public/icons/ranking';

// Ranking icon: source file → output name mapping
const MAPPING = {
  'ranking-trophy': join('docs/nowe ikonki/transparent/dwafdwa', 'Cute_cartoon_bright_2k_202602231919 (3).jpeg'),
  'ranking-message-volume': join('docs/nowe ikonki/transparent/dwafdwa', 'Cute_cartoon_bright_2k_202602231919 (2).jpeg'),
  'ranking-response-time': join('docs/nowe ikonki/transparent/dwafdwa', 'Cute_cartoon_bright_2k_202602231920.jpeg'),
  'ranking-ghost': join('docs/nowe ikonki/transparent/dwafdwa', 'Cute_cartoon_bright_2k_202602231919.jpeg'),
  'ranking-asymmetry': join('docs/nowe ikonki/transparent/dwafdwa', 'Cute_cartoon_bright_2k_202602231919 (1).jpeg'),
};

await mkdir(outDir, { recursive: true });

for (const [name, srcPath] of Object.entries(MAPPING)) {
  const outPath = join(outDir, `${name}.png`);
  console.log(`\n${name} <- ${srcPath}`);

  const img = sharp(srcPath);
  const meta = await img.metadata();
  const { width, height } = meta;

  // JPEG → need to convert to RGBA first, then remove dark background
  const raw = await img.ensureAlpha().raw().toBuffer();
  const output = Buffer.from(raw);

  let removed = 0;
  let faded = 0;
  for (let i = 0; i < output.length; i += 4) {
    const r = output[i], g = output[i + 1], b = output[i + 2], a = output[i + 3];
    if (a === 0) continue;

    const brightness = r * 0.299 + g * 0.587 + b * 0.114;

    // Dark pixels: make fully transparent
    if (brightness < 30) {
      output[i + 3] = 0;
      removed++;
    }
    // Transition zone: fade out proportionally
    else if (brightness < 55 && a < 200) {
      const factor = (brightness - 30) / 25;
      output[i + 3] = Math.round(factor * a);
      faded++;
    }
    // Semi-dark with low saturation (dark gray gradients around icons)
    else if (brightness < 50) {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (saturation < 0.3) {
        const factor = Math.max(0, (brightness - 20) / 30);
        output[i + 3] = Math.round(factor * a * 0.5);
        faded++;
      }
    }
  }

  console.log(`  Removed ${removed} dark pixels, faded ${faded}`);

  // Trim transparent padding + resize to 512x512
  await sharp(output, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 5 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outPath);

  const stat = (await import('fs')).statSync(outPath);
  console.log(`  -> ${outPath} (${Math.round(stat.size / 1024)}KB)`);
}

console.log('\nDone!');
