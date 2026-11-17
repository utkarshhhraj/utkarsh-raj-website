// Build-time only. Turns /src-decks/<id>.pdf into slide images and a downloadable PDF,
// then writes `slides` and `pdfSize` into /data/decks.json. Run from the repo root:
//   node scripts/decks.mjs
// Needs: pdftoppm (poppler) on PATH; Ghostscript (gs) only if a PDF is over 8 MB.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(new URL('./package.json', import.meta.url));
const sharp = require('sharp');

const root = process.cwd();
const dataPath = join(root, 'data/decks.json');
const decks = JSON.parse(readFileSync(dataPath, 'utf8'));
const WIDTHS = [640, 1200, 1920];

for (const deck of decks) {
  const src = join(root, 'src-decks', `${deck.id}.pdf`);
  try { statSync(src); } catch { console.warn(`skip ${deck.id}: no ${src}`); continue; }

  const outDir = join(root, 'decks', deck.id);
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (f.startsWith('slide-')) rmSync(join(outDir, f));

  const tmp = mkdtempSync(join(tmpdir(), `deck-${deck.id}-`));
  execFileSync('pdftoppm', ['-r', '200', '-png', src, join(tmp, 'p')]);
  const pages = readdirSync(tmp).filter(f => f.endsWith('.png')).sort();

  for (let i = 0; i < pages.length; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const input = join(tmp, pages[i]);
    const meta = await sharp(input).metadata();
    for (const w of WIDTHS) {
      const width = Math.min(w, meta.width, 1920);
      const base = sharp(input).resize({ width, withoutEnlargement: true });
      await base.clone().avif({ quality: 55 }).toFile(join(outDir, `slide-${nn}-${w}.avif`));
      await base.clone().webp({ quality: 80 }).toFile(join(outDir, `slide-${nn}-${w}.webp`));
      await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(join(outDir, `slide-${nn}-${w}.jpg`));
    }
  }
  rmSync(tmp, { recursive: true, force: true });

  const pdfOut = join(root, deck.pdf.replace(/^\//, ''));
  mkdirSync(dirname(pdfOut), { recursive: true });
  if (statSync(src).size > 8 * 1024 * 1024) {
    execFileSync('gs', ['-sDEVICE=pdfwrite', '-dPDFSETTINGS=/ebook', '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${pdfOut}`, src]);
  } else {
    copyFileSync(src, pdfOut);
  }

  deck.slides = pages.length;
  deck.pdfSize = `${(statSync(pdfOut).size / 1048576).toFixed(1)} MB`;
  console.log(`${deck.id}: ${deck.slides} slides, PDF ${deck.pdfSize}`);
}

writeFileSync(dataPath, JSON.stringify(decks, null, 2) + '\n');
