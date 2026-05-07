#!/usr/bin/env node
/**
 * Génère favicons et dérivés à partir de public/icon.svg.
 * Run: pnpm gen:icons
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'public/icon.svg');

const PUBLIC_DIR = resolve(ROOT, 'public');
const APP_DIR = resolve(ROOT, 'app');

const PNG_OUTPUTS = [
  { path: resolve(PUBLIC_DIR, 'icon-192.png'), size: 192 },
  { path: resolve(PUBLIC_DIR, 'icon-512.png'), size: 512 },
  { path: resolve(APP_DIR, 'apple-icon.png'), size: 180 },
  { path: resolve(APP_DIR, 'icon.png'), size: 512 },
];

const FAVICON_SIZES = [16, 32, 48];
const FAVICON_PATH = resolve(APP_DIR, 'favicon.ico');

const MASKABLE = {
  path: resolve(PUBLIC_DIR, 'icon-maskable-512.png'),
  size: 512,
  safeZone: 0.8, // contenu dans 80% central
  bg: '#0d0c0a',
};

async function ensureDir(file) {
  await mkdir(dirname(file), { recursive: true });
}

async function renderPng(svg, size) {
  return sharp(svg, { density: 384 }).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  const svg = await readFile(SRC);

  for (const out of PNG_OUTPUTS) {
    await ensureDir(out.path);
    const buf = await renderPng(svg, out.size);
    await writeFile(out.path, buf);
  }

  // Maskable: pad le contenu dans la safe-zone, fond plein
  const inner = Math.round(MASKABLE.size * MASKABLE.safeZone);
  const pad = Math.round((MASKABLE.size - inner) / 2);
  const maskableBuf = await sharp({
    create: {
      width: MASKABLE.size,
      height: MASKABLE.size,
      channels: 4,
      background: MASKABLE.bg,
    },
  })
    .composite([
      {
        input: await sharp(svg, { density: 384 }).resize(inner, inner, { fit: 'cover' }).png().toBuffer(),
        left: pad,
        top: pad,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(MASKABLE.path, maskableBuf);

  // favicon.ico multi-tailles
  const icoPngBuffers = await Promise.all(FAVICON_SIZES.map((s) => renderPng(svg, s)));
  const icoBuf = await pngToIco(icoPngBuffers);
  await writeFile(FAVICON_PATH, icoBuf);
}

main().catch((_err) => {
  process.exit(1);
});
