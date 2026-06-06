// ─────────────────────────────────────────────────────────────
//  計算済みプロフィール → LLM用ファクトシート
//  GrandProfile / DailyState の「硬い事実」を簡潔なテキストに変換。
//  LLMはこれを“計算”せず“解釈・統合”するだけ＝ハルシネーション撲滅。
// ─────────────────────────────────────────────────────────────

import type { GrandProfile, DailyState } from './types';
import type { Psychometric } from './psychometric';

export function summarizeProfile(p: GrandProfile): string {
  const w = p.westernAstrology;
  const fp = p.fourPillars;
  const hd = p.humanDesign;
  const num = p.numerology;

  const planets = w.planets
    .map((pl) => `${pl.planet}${pl.sign}${pl.degree.toFixed(0)}度${pl.retrograde ? '(逆)' : ''}`)
    .join('・');
  const aspects = w.aspects.slice(0, 6).map((a) => `${a.a}${a.type}${a.b}`).join('・');
  const ascLine = w.hasAscendant
    ? `アセンダント=${w.ascendant!.sign}${w.ascendant!.degree.toFixed(0)}度・MC=${w.midheaven!.sign}`
    : 'アセンダント=出生時刻不明のため未算出';

  return `# 計算済み占術データ（これは天体暦による実計算。再計算せず解釈すること）

【西洋占星術】
太陽=${w.sun.sign}${w.sun.degree.toFixed(0)}度(サビアン:${w.planets[0].sabian.sign}${w.planets[0].sabian.degreeInSign}度) / 月=${w.moon.sign}${w.moon.degree.toFixed(0)}度
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
