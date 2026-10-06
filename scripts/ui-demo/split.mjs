// Usage: node scripts/ui-demo/split.mjs <in.png> [chunkHeight=1800] [scale=0.5]
// Splits a tall full-page screenshot into downscaled chunks (<in>_0.png, <in>_1.png, ...) for review.
import sharp from 'sharp';

const [input, chunk = '1800', scale = '0.5'] = process.argv.slice(2);
const meta = await sharp(input).metadata();
const step = Number(chunk);
for (let top = 0, i = 0; top < meta.height; top += step, i += 1) {
  const height = Math.min(step, meta.height - top);
  const out = input.replace(/\.png$/, `_${i}.png`);
  await sharp(input).extract({ left: 0, top, width: meta.width, height })
    .resize(Math.round(meta.width * Number(scale))).toFile(out);
  console.log(out);
}
