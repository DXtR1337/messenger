import sharp from 'sharp';
import { readdir, rename } from 'fs/promises';
import { join } from 'path';

const dir = 'public/icons/badges';
const files = (await readdir(dir)).filter(f => f.endsWith('.png'));

for (const file of files) {
  const filePath = join(dir, file);
  const img = sharp(filePath);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();

  // Check if corners have dark pixels (ANY alpha > 10)
  let darkCorners = 0;
  const corners = [[0,0], [width-1,0], [0,height-1], [width-1,height-1]];
  for (const [x,y] of corners) {
    const idx = (y * width + x) * 4;
    const r = raw[idx], g = raw[idx+1], b = raw[idx+2], a = raw[idx+3];
    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    if (a > 10 && brightness < 30) darkCorners++;
  }

  if (darkCorners >= 3) {
    console.log(`${file}: DARK BG detected — removing...`);

    const output = Buffer.from(raw);
    for (let i = 0; i < output.length; i += 4) {
      const r = output[i], g = output[i+1], b = output[i+2];
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      if (brightness < 30) {
        output[i+3] = 0;
      } else if (brightness < 60) {
        const factor = (brightness - 30) / 30;
        output[i+3] = Math.round(factor * output[i+3]);
      }
    }

    await sharp(output, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(filePath + '.tmp');

    await rename(filePath + '.tmp', filePath);
    console.log(`  -> Fixed`);
  } else {
    console.log(`${file}: OK`);
  }
}

console.log('\nDone!');
