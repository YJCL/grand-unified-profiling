// ─────────────────────────────────────────────────────────────
//  計算済みプロフィール → LLM用ファクトシート
//  GrandProfile / DailyState の「硬い事実」を簡潔なテキストに変換。
//  Supplying calculated values does not independently validate an LLM's interpretation.
// ─────────────────────────────────────────────────────────────

import type { GrandProfile, DailyState } from './types';
import type { Psychometric } from './psychometric';

export function summarizeProfile(p: GrandProfile): string {
  const w = p.westernAstrology;
  const fp = p.fourPillars;
  const hd = p.humanDesign;
  const num = p.numerology;
  // Keep degrees within their named sign; rounding 29.6 to 30 misstates the boundary.
  const degrees = (value: number) => (Math.floor(value * 100) / 100).toFixed(2);

  const planets = w.planets
    .map((pl) => `${pl.planet}${pl.sign}${degrees(pl.degree)}度${pl.retrograde ? '(逆)' : ''}`)
    .join('・');
  const aspects = w.aspects.slice(0, 6).map((a) => `${a.a}${a.type}${a.b}`).join('・');
  const ascLine = w.hasAscendant
    ? `アセンダント=${w.ascendant!.sign}${degrees(w.ascendant!.degree)}度・MC=${w.midheaven!.sign}`
    : 'アセンダント=出生時刻または出生地を特定できないため未算出';
  const assumptions = p.meta.calculationAssumptions?.length
    ? `\n計算上の仮定・制限:\n${p.meta.calculationAssumptions.join('\n')}\n未確定の項目を確定事項として扱わないこと。\n` : '';

  return `# 計算済み占術データ（計算値を再計算せず参照すること。解釈や予測の正しさを保証するものではありません）
${assumptions}

【西洋占星術】
太陽=${w.sun.sign}${degrees(w.sun.degree)}度(サビアン:${w.planets[0].sabian.sign}${w.planets[0].sabian.degreeInSign}度) / 月=${w.moon.sign}${degrees(w.moon.degree)}度
${ascLine}
天体配置: ${planets}
主要アスペクト: ${aspects}

【四柱推命】年柱${fp.year.sexagenary} 月柱${fp.month.sexagenary} 日柱${fp.day.sexagenary}${fp.hour ? ' 時柱' + fp.hour.sexagenary : '(時柱は出生時刻不明)'}
　日主(本質)=${fp.dayMaster.stem}(${fp.dayMaster.element}・${fp.dayMaster.yinYang})

【九星気学】本命星=${p.nineStar.main.name} / 月命星=${p.nineStar.monthly.name}
【干支】${p.chineseZodiac.sexagenary}（${p.chineseZodiac.animal}・${p.chineseZodiac.element}・${p.chineseZodiac.yinYang}）
【数秘術】ライフパス=${num.lifePath}${num.isMaster.lifePath ? '(マスターナンバー)' : ''} 誕生数=${num.birthday}${num.expression ? ` 表現数=${num.expression} 魂の数=${num.soulUrge} 人格数=${num.personality}` : ''}

【ヒューマンデザイン】タイプ=${hd.type} / 権威=${hd.authority} / プロファイル=${hd.profile}${hd.incomplete ? '(出生時刻不明のため暫定)' : ''}
　定義センター: ${hd.definedCenters.join('・') || 'なし'}
　チャネル: ${hd.channels.join('・') || 'なし'}

【宿曜】本命宿=${p.sukuyo.mansion}`;
}

export function summarizeDaily(d: DailyState): string {
  const tr = d.transits
    .map((h) => `${h.transiting}→出生${h.natal}${h.aspect}(${h.harmony})`)
    .join('・');
  return `# 今日の運気データ（実計算）
日付=${d.date} 総合運=${d.score}/100（${d.phase === 'attack' ? '攻め' : '守り'}）
月相=${d.moon.phaseName}(輝面比${(d.moon.illumination * 100).toFixed(0)}%) 今日の宿=${d.sukuyoDay}
バイオリズム: 身体${(d.biorhythm.physical * 100).toFixed(0)} 感情${(d.biorhythm.emotional * 100).toFixed(0)} 知性${(d.biorhythm.intellectual * 100).toFixed(0)}
効いているトランジット: ${tr || '主要なものなし'}`;
}

export function summarizePsychometric(psy?: Psychometric | null): string {
  if (!psy) return '';
  return `\n【心理統計】MBTI=${psy.mbti.type} / エニアグラム=タイプ${psy.enneagram.type}w${psy.enneagram.wing}「${psy.enneagram.label}」`;
}
