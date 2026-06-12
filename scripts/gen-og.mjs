// OGPシェア画像生成（実行: node scripts/gen-og.mjs）→ public/og.png (1200x630)
import sharp from 'sharp';

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="38%" cy="42%" r="90%">
      <stop offset="0%" stop-color="#16113a"/>
      <stop offset="100%" stop-color="#080818"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8e1" stop-opacity="0.95"/>
      <stop offset="22%" stop-color="#fce9a8" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#e8b54d" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#c98e2f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#fdf0bd"/>
      <stop offset="100%" stop-color="#f2c14e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="180" cy="120" r="3" fill="#cfc4f0" opacity="0.5"/>
  <circle cx="980" cy="90" r="4" fill="#f0d9a0" opacity="0.55"/>
  <circle cx="1080" cy="500" r="3" fill="#a8d8e8" opacity="0.45"/>
  <circle cx="120" cy="520" r="4" fill="#e8b0c8" opacity="0.4"/>
  <!-- オーブ（右寄り） -->
  <circle cx="900" cy="315" r="240" fill="url(#glow)"/>
  <circle cx="900" cy="315" r="120" fill="url(#core)"/>
  <!-- ワードマーク -->
  <text x="110" y="300" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="130" fill="#f7e7b8" letter-spacing="4">Orba</text>
  <text x="116" y="372" font-family="'Hiragino Mincho ProN','Yu Mincho', serif" font-size="30" fill="#cfc4f0" opacity="0.85">あなただけのパートナーオーブ</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('✓ public/og.png');
