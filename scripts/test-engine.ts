// 計算エンジンの検算スクリプト（手計算で確かめられる値と照合）
// 実行: npx tsx scripts/test-engine.ts
import { buildGrandProfile } from '../lib/engine/profile';
import { computeDailyState } from '../lib/engine/daily';
import { computePsychometric } from '../lib/engine/psychometric';

const cases = [
  { name: 'Test One', birthDate: '1985-07-20', birthTime: '14:30', birthPlace: 'Tokyo' },
  { name: 'Test Two', birthDate: '1990-01-15', birthTime: '03:00', birthPlace: 'Osaka' },
  { name: 'Test Three', birthDate: '2000-12-25' },
  // 検算用の既知データ:
  // 1984-02-02 = 甲子の日（日柱アンカー）
  { name: 'Anchor', birthDate: '1984-02-02', birthTime: '12:00' },
];

for (const c of cases) {
  console.log('\n══════════════════════════════════════');
  console.log(`${c.name}  ${c.birthDate} ${c.birthTime ?? '(時刻不明)'}`);
  console.log('══════════════════════════════════════');
  const p = buildGrandProfile(c);
  console.log('数秘術     :', JSON.stringify(p.numerology));
  console.log('九星気学   : 本命', p.nineStar.main.name, '/ 月命', p.nineStar.monthly.name);
  console.log('十二支     :', p.chineseZodiac.sexagenary, p.chineseZodiac.animal, p.chineseZodiac.element, p.chineseZodiac.yinYang);
  console.log('四柱       : 年', p.fourPillars.year.sexagenary,
    '月', p.fourPillars.month.sexagenary,
    '日', p.fourPillars.day.sexagenary,
    '時', p.fourPillars.hour?.sexagenary ?? '—');
  console.log('日主(本質) :', p.fourPillars.dayMaster.stem, p.fourPillars.dayMaster.element, p.fourPillars.dayMaster.yinYang);
  const w = p.westernAstrology;
  console.log('太陽星座   :', w.sun.sign, `${w.sun.degree.toFixed(1)}°`);
  console.log('月星座     :', w.moon.sign, `${w.moon.degree.toFixed(1)}°`);
  console.log('ASC        :', w.hasAscendant ? `${w.ascendant!.sign} ${w.ascendant!.degree.toFixed(1)}° / MC ${w.midheaven!.sign}` : '（出生時刻/出生地が必要）');
  console.log('主要天体   :', w.planets.map(pl => `${pl.planet}${pl.sign}${pl.degree.toFixed(0)}°${pl.retrograde ? 'R' : ''}`).join(' '));
  console.log('サビアン(太陽):', w.planets[0].sabian.sign, `${w.planets[0].sabian.degreeInSign}度`, `(#${w.planets[0].sabian.num})`);
  console.log('アスペクト :', w.aspects.slice(0, 5).map(a => `${a.a}-${a.b}${a.type}`).join(' '));
  const hd = p.humanDesign;
  console.log('HD         :', hd.type, '/', hd.authority, '/ プロファイル', hd.profile, hd.incomplete ? '(時刻不明で暫定)' : '');
  console.log('  定義中枢 :', hd.definedCenters.join('・') || '（全て未定義=リフレクター）');
  console.log('  チャネル :', hd.channels.join(' ') || 'なし');
  console.log('宿曜       :', p.sukuyo.mansion, `(index ${p.sukuyo.index})`);
  const d = computeDailyState(p);
  console.log('今日の運気 :', `${d.score}点`, d.phase === 'attack' ? '【攻め】' : '【守り】', `月相${d.moon.phaseName}`, `今日の宿${d.sukuyoDay}`);
  console.log('  主要T    :', d.transits.slice(0, 4).map(h => `${h.transiting}→${h.natal}${h.aspect}(${h.harmony})`).join(' ') || 'なし');
}

// 心理統計スコアラーの動作確認（サンプル回答）
console.log('\n══════════════════════════════════════');
console.log('心理統計スコアラー（サンプル回答）');
console.log('══════════════════════════════════════');
const sampleAnswers = [
  { questionId: 1, optionIndex: 1 }, { questionId: 2, optionIndex: 1 }, // I,I
  { questionId: 3, optionIndex: 1 }, { questionId: 4, optionIndex: 1 }, // N,N
  { questionId: 5, optionIndex: 1 }, { questionId: 6, optionIndex: 1 }, // F,F
  { questionId: 7, optionIndex: 0 }, { questionId: 8, optionIndex: 0 }, // J,J
  { questionId: 104, optionIndex: 0 }, // タイプ4 とてもそう思う
  { questionId: 105, optionIndex: 0 }, // タイプ5 とてもそう思う
  { questionId: 102, optionIndex: 1 }, // タイプ2 少し
];
const psy = computePsychometric(sampleAnswers);
console.log('MBTI     :', psy.mbti.type, JSON.stringify(psy.mbti.axes));
console.log('エニア   :', `タイプ${psy.enneagram.type}w${psy.enneagram.wing}`, psy.enneagram.label);
