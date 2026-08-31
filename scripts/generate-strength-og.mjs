import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUTPUT_DIR = resolve('public/share/strengths');

const cards = [
  { id: 'default', title: 'あなたの強みは、\nどう使われる？', lead: '10問から、得意な動き方と\n力が出やすい環境を見つけます。', active: -1 },
  { id: 'organizer', title: '道筋をつくる人', lead: '複雑なことを分けて、\n次に進める形をつくる。', active: 0 },
  { id: 'observer', title: '小さな変化に気づく人', lead: 'まだ言葉になっていない違いを、\nほかの人より少し早く受け取る。', active: 1 },
  { id: 'starter', title: '最初の一歩をつくる人', lead: '正解が見えなくても、\n小さく始めて流れをつくる。', active: 2 },
  { id: 'connector', title: '人の間をつなぐ人', lead: '違う考えの間に入り、\n話しやすい空気をつくる。', active: 3 },
  { id: 'explorer', title: '深く確かめる人', lead: '表面の答えで終わらず、\n理由や仕組みまで確かめる。', active: 4 },
  { id: 'creator', title: '新しい見方をひらく人', lead: '当たり前の中に、\n別の組み合わせや可能性を見つける。', active: 5 },
];

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

function textLines(value, x, y, lineHeight, attributes = '') {
  return value.split('\n').map((line, index) => (
    `<text x="${x}" y="${y + index * lineHeight}" ${attributes}>${escapeXml(line)}</text>`
  )).join('');
}

function createSvg(card) {
  const dots = Array.from({ length: 6 }, (_, index) => {
    const x = 90 + index * 28;
    const active = index === card.active;
    return `<circle cx="${x}" cy="552" r="${active ? 5 : 3}" fill="${active ? '#F4C060' : 'rgba(251,248,240,.28)'}"${active ? ' filter="url(#dotGlow)"' : ''}/>`;
  }).join('');

  const titleSize = card.id === 'default' ? 62 : card.title.length > 11 ? 57 : 66;
  const titleY = card.id === 'default' ? 218 : 246;

  return `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="orb" cx="38%" cy="30%" r="70%">
        <stop offset="0" stop-color="#FFF5D2"/>
        <stop offset=".12" stop-color="#F4C060"/>
        <stop offset=".38" stop-color="#9B6E82"/>
        <stop offset=".7" stop-color="#40305F"/>
        <stop offset="1" stop-color="#16142B"/>
      </radialGradient>
      <radialGradient id="aura">
        <stop offset="0" stop-color="#F4C060" stop-opacity=".24"/>
        <stop offset="1" stop-color="#F4C060" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="night" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#070713"/>
        <stop offset="1" stop-color="#111126"/>
      </linearGradient>
      <filter id="orbShadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="26" stdDeviation="28" flood-color="#000" flood-opacity=".58"/>
      </filter>
      <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="1200" height="630" fill="url(#night)"/>
    <circle cx="995" cy="184" r="270" fill="url(#aura)"/>
    <circle cx="995" cy="184" r="142" fill="url(#orb)" filter="url(#orbShadow)"/>
    <ellipse cx="995" cy="184" rx="226" ry="74" fill="none" stroke="#F4C060" stroke-opacity=".5" stroke-width="1.5" transform="rotate(-18 995 184)"/>
    <ellipse cx="995" cy="184" rx="178" ry="58" fill="none" stroke="#8B7FD4" stroke-opacity=".35" stroke-width="1" transform="rotate(54 995 184)"/>
    <circle cx="785" cy="228" r="5" fill="#FFF0BD" filter="url(#dotGlow)"/>
    <path d="M72 70H1128" stroke="#FFF" stroke-opacity=".1"/>
    <path d="M72 532H1128" stroke="#FFF" stroke-opacity=".1"/>
    <text x="76" y="120" fill="#FFF0BD" font-family="Georgia, serif" font-size="42" font-style="italic" font-weight="500">Orba</text>
    <text x="76" y="164" fill="#F4C060" font-family="Noto Sans CJK JP, sans-serif" font-size="15" font-weight="700" letter-spacing="2">10問で見つけた、強みの使われ方</text>
    ${textLines(card.title, 76, titleY, 84, `fill="#FBF8F0" font-family="A-OTF Ryumin Pr5, Noto Serif CJK JP, serif" font-size="${titleSize}" font-weight="500"`)}
    ${textLines(card.lead, 80, card.id === 'default' ? 408 : 368, 40, 'fill="#FBF8F0" fill-opacity=".68" font-family="Noto Sans CJK JP, sans-serif" font-size="23" font-weight="400"')}
    ${dots}
    <text x="272" y="558" fill="#FBF8F0" fill-opacity=".48" font-family="Noto Sans CJK JP, sans-serif" font-size="14">無料・登録不要</text>
    <text x="1128" y="558" text-anchor="end" fill="#FFF0BD" font-family="Noto Sans CJK JP, sans-serif" font-size="15">orba.life/diagnosis/strengths</text>
  </svg>`;
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (const card of cards) {
  await sharp(Buffer.from(createSvg(card)))
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUTPUT_DIR, `${card.id}.png`));
}

console.log(`Generated ${cards.length} strength share cards in ${OUTPUT_DIR}`);
