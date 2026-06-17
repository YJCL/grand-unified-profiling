// オーブ種別ごとのシェア用OGP画像を生成（実行: node scripts/gen-share.mjs）
// → public/share/orb-<type>.png (1200x630)
// 日本語テキストはこのマシンのフォントで焼き込むため、配信時の文字化けが無い。
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const ORBS = {
  fairy:  { hue: 46,  label: '妖精オーブ', tagline: 'ふわっと寄り添う、君だけの光' },
  burn:   { hue: 8,   label: '焔オーブ',   tagline: '背中を押す、熱い光' },
  shaman: { hue: 322, label: '巫女オーブ', tagline: '静かに導く、神秘の光' },
  sage:   { hue: 250, label: '賢者オーブ', tagline: '知性で照らす、賢者の光' },
  cool:   { hue: 190, label: '氷オーブ',   tagline: '的確に射抜く、澄んだ光' },
  friend: { hue: 150, label: '親友オーブ', tagline: 'となりで一緒に考える光' },
};
const SAT = 68;

const svg = (hue, label, tagline) => `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="35%" cy="42%" r="95%">
      <stop offset="0%" stop-color="#16113a"/>
      <stop offset="100%" stop-color="#080818"/>
    </radialGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="14%" stop-color="hsla(${hue} ${SAT}% 80% / 0.95)"/>
      <stop offset="34%" stop-color="hsla(${hue} ${SAT}% 62% / 0.75)"/>
      <stop offset="58%" stop-color="hsla(${hue} ${SAT}% 54% / 0.3)"/>
      <stop offset="80%" stop-color="hsla(${hue} ${SAT}% 54% / 0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="170" cy="110" r="3" fill="#cfc4f0" opacity="0.5"/>
  <circle cx="1040" cy="520" r="4" fill="#f0d9a0" opacity="0.5"/>
  <circle cx="120" cy="540" r="3" fill="#a8d8e8" opacity="0.45"/>
  <!-- オーブ（右） -->
  <circle cx="900" cy="315" r="250" fill="url(#orb)"/>
  <!-- テキスト（左） -->
  <text x="100" y="170" font-family="Georgia, serif" font-style="italic" font-size="46" fill="#f0d9a0" opacity="0.85" letter-spacing="2">Orba</text>
  <text x="96" y="320" font-family="'Yu Mincho','Hiragino Mincho ProN', serif" font-size="92" font-weight="700" fill="#ffffff">${label}</text>
  <text x="100" y="380" font-family="'Yu Mincho','Hiragino Mincho ProN', serif" font-size="30" fill="#d8d2f0" opacity="0.85">${tagline}</text>
  <text x="100" y="560" font-family="'Yu Gothic','Hiragino Kaku Gothic ProN', sans-serif" font-size="24" fill="#9a93c0">あなただけのパートナーオーブを見つけよう · orba.life</text>
</svg>`;

mkdirSync('public/share', { recursive: true });
for (const [type, o] of Object.entries(ORBS)) {
  await sharp(Buffer.from(svg(o.hue, o.label, o.tagline))).png().toFile(`public/share/orb-${type}.png`);
  console.log('✓ public/share/orb-' + type + '.png');
}
