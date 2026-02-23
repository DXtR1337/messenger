import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { statSync } from 'fs';
import { join } from 'path';

const srcDir = 'docs/nowe ikonki/transparent/dwafdwa';
const outDir = 'public/icons/cards';

// Card ID → source filename mapping
const MAPPING = {
  'receipt':           'Cute_cartoon_bright_2k_202602231934 (2).jpeg',
  'versus-v2':         'Cute_cartoon_bright_2k_202602231928.jpeg',
  'redflag':           'Cute_cartoon_bright_2k_202602231928 (1).jpeg',
  'ghost-forecast':    'Cute_cartoon_bright_2k_202602231933.jpeg',
  'compatibility-v2':  'Cute_cartoon_bright_2k_202602231933 (1).jpeg',
  'label':             'Cute_cartoon_bright_2k_202602231933 (6).jpeg',
  'passport':          'Cute_cartoon_bright_2k_202602231924.jpeg',
  'stats':             'Cute_cartoon_bright_2k_202602231924 (1).jpeg',
  'versus':            'Cute_cartoon_bright_2k_202602231925.jpeg',
  'health':            'Cute_cartoon_bright_2k_202602231925 (3).jpeg',
  'flags':             'Cute_cartoon_bright_2k_202602231925 (1).jpeg',
  'personality':       'Cute_cartoon_bright_2k_202602231925 (2).jpeg',
  'scores':            'Cute_cartoon_bright_2k_202602231925 (4).jpeg',
  'badges':            'Cute_cartoon_bright_2k_202602231934 (1).jpeg',
  'mbti':              'Cute_cartoon_bright_2k_202602231933 (3).jpeg',
  'cps':               'Cute_cartoon_bright_2k_202602231933 (2).jpeg',
  'subtext':           'Cute_cartoon_bright_2k_202602231933 (4).jpeg',
  'delusion':          'Cute_cartoon_bright_2k_202602231934.jpeg',
  'couple-quiz':       'Cute_cartoon_bright_2k_202602231933 (5).jpeg',
  'mugshot':           'Cute_cartoon_bright_2k_202602231934 (3).jpeg',
  'dating-profile':    'Cute_cartoon_bright_2k_202602231935.jpeg',
  'simulator':         'Cute_cartoon_bright_2k_202602231934 (4).jpeg',
};

await mkdir(outDir, { recursive: true });

for (const [name, srcFile] of Object.entries(MAPPING)) {
  const srcPath = join(srcDir, srcFile);
  const outPath = join(outDir, `card-${name}.png`);
  console.log(`\n${name} <- ${srcFile}`);

  const img = sharp(srcPath);
  const meta = await img.metadata();
  const { width, height } = meta;

  // Center-crop 60% to remove dark edges (JPEG artifacts at corners)
  const cropFrac = 0.60;
  const cropW = Math.round(width * cropFrac);
  const cropH = Math.round(height * cropFrac);
  const cropX = Math.round((width - cropW) / 2);
  const cropY = Math.round((height - cropH) / 2);

  const cropped = await img
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const output = Buffer.from(cropped);
  let removed = 0, faded = 0;

  for (let i = 0; i < output.length; i += 4) {
    const r = output[i], g = output[i + 1], b = output[i + 2];
    const brightness = r * 0.299 + g * 0.587 + b * 0.114;

    // Dark pixels: fully transparent
    if (brightness < 25) {
      output[i + 3] = 0;
      removed++;
    }
    // Transition zone
    else if (brightness < 50) {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.25) {
        // Low saturation dark = background gradient, fade out
        const factor = Math.max(0, (brightness - 15) / 35);
        output[i + 3] = Math.round(factor * 100);
        faded++;
      } else {
        // Colored but dark = glow edge, partial transparency
        const factor = (brightness - 25) / 25;
        output[i + 3] = Math.round(Math.min(255, factor * 255));
        faded++;
      }
    }
  }

  console.log(`  Removed ${removed} dark px, faded ${faded}`);

  // Trim transparent padding + resize to 256x256 (card icons are smaller)
  await sharp(output, { raw: { width: cropW, height: cropH, channels: 4 } })
    .trim({ threshold: 5 })
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const stat = statSync(outPath);
  console.log(`  -> ${outPath} (${Math.round(stat.size / 1024)}KB)`);
}

console.log('\nDone! Generated', Object.keys(MAPPING).length, 'card icons.');
