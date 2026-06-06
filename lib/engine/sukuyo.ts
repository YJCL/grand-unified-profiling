// ─────────────────────────────────────────────────────────────
//  宿曜（27宿）
//  出生時の「月の位置」が属する宿を、恒星黄経（サイデリアル）で算出。
//  ナクシャトラ体系で月の位置 → 宿曜は昴宿(=Krittika)始まりに並べ替え。
//
//  ※ 巷の宿曜アプリは旧暦の表引き近似が多く結果がずれることがある。
//    本実装は月の実位置に基づく天文学的に正しい方法。
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

// ラヒリ・アヤナムシャ（恒星基準への補正角）の近似
function lahiriAyanamsa(date: Date): number {
  const year = date.getUTCFullYear();
  // J2000で約23.85°、毎年約50.29″(=0.01397°)増加
  return 23.85 + (year - 2000) * 0.013972;
}

// ナクシャトラの起点(Ashwini)から数えた index → 宿曜(昴宿始まり)へ
// Ashwini=0, Bharani=1, Krittika=2。昴宿=Krittika なので -2 シフト。
function nakshatraToSukuyoIndex(nak: number): number {
  return ((nak - 2) % 27 + 27) % 27;
}

export function computeSukuyo(birthUTC: Date): Sukuyo {
  const tropical = moonLongitude(birthUTC);
  const sidereal = ((tropical - lahiriAyanamsa(birthUTC)) % 360 + 360) % 360;
  const nak = Math.floor(sidereal / MANSION_SPAN); // 0=Ashwini
  const idx = nakshatraToSukuyoIndex(nak);
  return {
    mansion: MANSIONS[idx],
    index: idx,
    group: '', // 三九の秘法など相性ロジックはPhase 4で
    method: '月の恒星黄経（ラヒリ）による',
  };
}
