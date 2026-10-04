// One-off generator for the PWA icon set. Run with: node scripts/generate-pwa-icons.mjs
// Rasterizes scripts/icon-source*.svg into public/icons/*.png via sharp.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const jobs = [
  { src: 'icon-source.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon-source.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-source.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'icon-source-maskable.svg', out: 'icon-maskable-512.png', size: 512 }
];

for (const job of jobs) {
  await sharp(join(__dirname, job.src))
    .resize(job.size, job.size)
    .png()
    .toFile(join(outDir, job.out));
  console.log(`wrote ${job.out}`);
}
