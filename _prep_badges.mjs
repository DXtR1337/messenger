import sharp from 'sharp';
import { readdir, copyFile, mkdir } from 'fs/promises';
import { join } from 'path';

const srcDir = 'docs/nowe ikonki/transparent';
const outDir = 'public/icons/badges';

// Badge ID → source filename mapping
const MAPPING = {
  'night-owl': 'neon_owl_icon.png',
  'early-bird': 'blue_bird_icon.png',
  'ghost-champion': 'cool_ghost_icon.png',
  'double-texter': 'speech_bubbles_blue.png',
  'novelist': 'open_box_icon.png',
  'speed-demon': 'lightning_yellow_icon.png',
  'emoji-monarch': 'star_yellow_icon.png',
  'initiator': 'hand_wave_icon.png',
  'heart-bomber': 'heart_rocket_icon.png',
  'link-lord': 'chain_link_icon.png',
  'streak-master': 'flame_heart_icon.png',
  'question-master': 'magnifying_glass_icon.png',
  'mention-magnet': 'megaphone_icon.png',
  'reply-king': 'crown_share_icon.png',
  'edit-lord': 'sad_pencil_icon.png',
};

await mkdir(outDir, { recursive: true });

for (const [badgeId, srcFile] of Object.entries(MAPPING)) {
  const srcPath = join(srcDir, srcFile);
  const outPath = join(outDir, `${badgeId}.png`);

  console.log(`\n${badgeId} <- ${srcFile}`);

  const img = sharp(srcPath);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  const output = Buffer.from(raw);

  // Pass 1: Remove dark semi-transparent background pixels
  let removed = 0;
  let faded = 0;
  for (let i = 0; i < output.length; i += 4) {
    const r = output[i], g = output[i + 1], b = output[i + 2], a = output[i + 3];
    if (a === 0) continue;

    const brightness = r * 0.299 + g * 0.587 + b * 0.114;

    // Dark pixels with any alpha: make fully transparent
    if (brightness < 35) {
      output[i + 3] = 0;
      removed++;
    }
    // Transition zone: fade out proportionally
    else if (brightness < 65 && a < 150) {
      const factor = (brightness - 35) / 30;
      output[i + 3] = Math.round(factor * a);
      faded++;
    }
  }

  console.log(`  Removed ${removed} dark pixels, faded ${faded}`);

  // Pass 2: Trim transparent padding + resize to 512x512
  await sharp(output, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 5 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outPath);

  const { size } = await sharp(outPath).metadata();
  const stat = (await import('fs')).statSync(outPath);
  console.log(`  -> ${outPath} (${Math.round(stat.size / 1024)}KB)`);
}

console.log('\nDone!');
