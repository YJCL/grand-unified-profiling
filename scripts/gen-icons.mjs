// PWA/ストア用アプリアイコン生成（実行: node scripts/gen-icons.mjs）
// ブランドの「光のオーブ」を深い夜空の上に描く。
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const orbSvg = (size, pad = 0) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="#141033"/>
      <stop offset="100%" stop-color="#080818"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8e1" stop-opacity="0.95"/>
      <stop offset="22%" stop-color="#fce9a8" stop-opacity="0.85"/>
      <stop offset="48%" stop-color="#e8b54d" stop-opacity="0.55"/>
      <stop offset="75%" stop-color="#c98e2f" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#c98e2f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#fdf0bd"/>
      <stop offset="100%" stop-color="#f2c14e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 110}" fill="url(#bg)"/>
  <!-- 小さな星 -->
  <circle cx="96" cy="120" r="4" fill="#cfc4f0" opacity="0.5"/>
  <circle cx="404" cy="92" r="3" fill="#f0d9a0" opacity="0.55"/>
  <circle cx="430" cy="380" r="4" fill="#a8d8e8" opacity="0.4"/>
  <circle cx="82" cy="400" r="3" fill="#e8b0c8" opacity="0.45"/>
  <!-- オーブ -->
  <circle cx="256" cy="256" r="200" fill="url(#glow)"/>
  <circle cx="256" cy="256" r="110" fill="url(#core)"/>
</svg>`;

mkdirSync('public/icons', { recursive: true });

const jobs = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/icons/maskable-512.png', size: 512, pad: 1 }, // maskableは全面塗り
  { file: 'public/icons/apple-touch-icon.png', size: 180, pad: 1 }, // iOSは角丸を勝手に付ける
];

for (const j of jobs) {
  await sharp(Buffer.from(orbSvg(j.size, j.pad ?? 0)))
    .resize(j.size, j.size)
    .png()
    .toFile(j.file);
  console.log('✓', j.file);
}
