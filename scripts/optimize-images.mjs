/**
 * One-off asset compressor: converts every PNG/SVG in apps/web/src/components/assets
 * to a right-sized WebP (photos <=1920px, logo/alpha art <=1024px) and prints a
 * before/after size report. Sources stay in git history, so the originals can be
 * re-derived if ever needed.
 *
 * Run: node scripts/optimize-images.mjs
 */
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
// pnpm keeps transitive deps nested; resolve sharp from its .pnpm store explicitly.
const requireLocal = createRequire(join(process.cwd(), 'apps/web/package.json'));
let sharp;
try {
  sharp = requireLocal('sharp');
} catch {
  sharp = require(join(
    process.cwd(),
    'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp',
  ));
}

const ASSETS = join(process.cwd(), 'apps/web/src/components/assets');

/** Max output width per asset (px). Chosen for the largest rendered size in the UI. */
const MAX_WIDTH = {
  'hero': 1920,                        // full-bleed hero background
  'melkora_cafe_scene': 1920,
  'melkora_dark_background': 1920,
  'melkora_limestone_background': 1920,
  'origin_story': 1600,
  'melkora_product_lineup': 1600,
  'melkora_bag': 1024,                 // product shots (svg -> raster w/ alpha)
  'coffee_bag': 1024,
  'melkora_logo_mark': 512,
  'hosty-home-command-transparent': 1200,
};

function maxWidthFor(name) {
  const stem = name.replace(/\.(png|jpe?g|svg|webp)$/i, '');
  const key = Object.keys(MAX_WIDTH).find((k) => stem.startsWith(k));
  return key ? MAX_WIDTH[key] : 1600;
}

const files = readdirSync(ASSETS).filter((f) => /\.(png|jpe?g|svg|webp)$/i.test(f));
let before = 0;
let after = 0;
const rows = [];

for (const file of files) {
  const inPath = join(ASSETS, file);
  const outName = `${file.replace(/\.(png|jpe?g|svg|webp)$/i, '')}.webp`;
  const outPath = join(ASSETS, outName);
  const sizeBefore = statSync(inPath).size;

  const isLineArt = /logo|bag/i.test(file);
  const pipeline = sharp(inPath, { density: isLineArt ? 300 : 96 }).resize({
    width: maxWidthFor(file),
    withoutEnlargement: true,
  });

  // Line art / packshots keep transparency; photos get a solid compression profile.
  pipeline.webp({ quality: isLineArt ? 88 : 72, alphaQuality: 90, effort: 6 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  if (outName !== file) require('node:fs').rmSync(inPath); // remove original after success
  require('node:fs').writeFileSync(outPath, data);
  const sizeAfter = data.length;
  before += sizeBefore;
  after += sizeAfter;
  rows.push(`${file}  ${(sizeBefore / 1024).toFixed(0)}KB  ->  ${outName}  ${(sizeAfter / 1024).toFixed(0)}KB  (${info.width}x${info.height})`);
}

console.log(rows.join('\n'));
console.log(`\nTOTAL: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
