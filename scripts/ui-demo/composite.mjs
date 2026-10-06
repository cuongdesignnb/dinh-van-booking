// Usage: node scripts/ui-demo/composite.mjs <left.png|jpg> <right.png> <out.png> [columnWidth=900]
// Side-by-side comparison (e.g. mockup vs screenshot), each column scaled to the same width.
import sharp from 'sharp';

const [left, right, out, col = '900'] = process.argv.slice(2);
const width = Number(col);
const gap = 24;
const [a, b] = await Promise.all([left, right].map((file) => sharp(file).resize({ width }).png().toBuffer({ resolveWithObject: true })));
const height = Math.max(a.info.height, b.info.height);
await sharp({ create: { width: width * 2 + gap * 3, height: height + gap * 2, channels: 3, background: '#e9e7df' } })
  .composite([{ input: a.data, left: gap, top: gap }, { input: b.data, left: width + gap * 2, top: gap }])
  .png()
  .toFile(out);
console.log(out, width * 2 + gap * 3, 'x', height + gap * 2);
