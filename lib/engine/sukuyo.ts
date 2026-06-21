// ─────────────────────────────────────────────────────────────
//  宿曜（27宿）
//  出生時の「月のトロピカル黄経」が属する宿を算出。
//  昴宿(=Krittika)始まりに並べ替えて27宿を割り当てる。
//
//  ※ 重要: 日本の宿曜道は歳差補正をしない伝統＝月のトロピカル黄経を
//    そのまま宿に割り当てる方式。ヴェーダ占星術のラヒリ恒星黄経（約24°差）
//    を使うと約2宿ずれ、日本の宿曜サイト/書籍の本命宿と一致しない。
//    （実証: 1993-10-23生は各種サイトで「危宿」。
//      トロピカル計算=危宿 / ラヒリ計算=女宿。よってトロピカルを採用。）
// ─────────────────────────────────────────────────────────────

import type { Sukuyo } from './types';
import { moonLongitude } from './ephemeris';

// 27宿（昴宿=Krittika から黄道順）
const MANSIONS = [
  '昴宿', '畢宿', '觜宿', '参宿', '井宿', '鬼宿', '柳宿', '星宿', '張宿',
  '翼宿', '軫宿', '角宿', '亢宿', '氐宿', '房宿', '心宿', '尾宿', '箕宿',
  '斗宿', '女宿', '虚宿', '危宿', '室宿', '壁宿', '奎宿', '婁宿', '胃宿',
];
const MANSION_SPAN = 360 / 27; // 13.333°

// ナクシャトラの起点(Ashwini)から数えた index → 宿曜(昴宿始まり)へ
// Ashwini=0, Bharani=1, Krittika=2。昴宿=Krittika なので -2 シフト。
function nakshatraToSukuyoIndex(nak: number): number {
  return ((nak - 2) % 27 + 27) % 27;
}

export function computeSukuyo(birthUTC: Date): Sukuyo {
  // 月のトロピカル黄経をそのまま27宿に割り当てる（日本の宿曜方式）。
  const longitude = ((moonLongitude(birthUTC)) % 360 + 360) % 360;
  const nak = Math.floor(longitude / MANSION_SPAN);
  const idx = nakshatraToSukuyoIndex(nak);
  return {
    mansion: MANSIONS[idx],
    index: idx,
    group: '', // 三九の秘法など相性ロジックはPhase 4で
    method: '月のトロピカル黄経による（日本の宿曜方式）',
  };
}
