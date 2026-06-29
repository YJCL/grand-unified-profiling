// 易計算の最小検証スクリプト
//   npx tsx scripts/test-iching.ts

import { castIching, reconstructIching, normalizeQuestion, hashQuestion, type LineValue } from '@/lib/engine/iching';

let passed = 0, failed = 0;
const t = (name: string, ok: boolean, hint?: string) => {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${hint ? ' — ' + hint : ''}`); }
};

console.log('=== 易計算テスト ===');

// 1) 爻値は 6〜9
{
  const r = castIching();
  t('values が6本ある', r.values.length === 6);
  t('全爻が 6/7/8/9 のいずれか', r.values.every((v) => [6,7,8,9].includes(v)));
}

// 2) 確率分布（10000回・三枚コイン法の理論値 6=1/8, 7=3/8, 8=3/8, 9=1/8）
{
  const N = 10000;
  const counts: Record<number, number> = { 6:0, 7:0, 8:0, 9:0 };
  for (let i = 0; i < N; i++) {
    const r = castIching();
    for (const v of r.values) counts[v]++;
  }
  const total = 6 * N;
  const p6 = counts[6]/total, p7 = counts[7]/total, p8 = counts[8]/total, p9 = counts[9]/total;
  console.log(`    分布: 6=${(p6*100).toFixed(2)}% / 7=${(p7*100).toFixed(2)}% / 8=${(p8*100).toFixed(2)}% / 9=${(p9*100).toFixed(2)}%`);
  // 理論: 6=12.5% / 7=37.5% / 8=37.5% / 9=12.5%。各値が ±3% の範囲。
  t('p(6) ≈ 12.5% ±3', Math.abs(p6 - 0.125) < 0.03, `actual ${(p6*100).toFixed(2)}%`);
  t('p(7) ≈ 37.5% ±3', Math.abs(p7 - 0.375) < 0.03, `actual ${(p7*100).toFixed(2)}%`);
  t('p(8) ≈ 37.5% ±3', Math.abs(p8 - 0.375) < 0.03, `actual ${(p8*100).toFixed(2)}%`);
  t('p(9) ≈ 12.5% ±3', Math.abs(p9 - 0.125) < 0.03, `actual ${(p9*100).toFixed(2)}%`);
}

// 3) seed固定で再現性
{
  const a = castIching('FREEZE-TEST-SEED-001');
  const b = castIching('FREEZE-TEST-SEED-001');
  t('同一seedで同一卦', JSON.stringify(a.values) === JSON.stringify(b.values));
  const c = castIching('FREEZE-TEST-SEED-002');
  t('異なるseedで異なる卦（基本）', JSON.stringify(a.values) !== JSON.stringify(c.values));
}

// 4) 変爻なし
{
  const r = reconstructIching([7,8,7,8,7,8] as LineValue[]);
  t('変爻なし→changingLines空', r.changingLines.length === 0);
  t('変爻なし→transformed null', r.transformed === null);
}

// 5) 変爻1つ
{
  const r = reconstructIching([9,8,7,8,7,8] as LineValue[]);
  t('初爻9→changingLines=[1]', r.changingLines.length === 1 && r.changingLines[0] === 1);
  t('変爻あり→transformed not null', r.transformed !== null);
  // 9は陽だったので之卦の初爻は陰（0）。元binary=101010 → 之卦=001010
  t('之卦binaryは初爻のみ反転', r.binary.transformed === '001010');
}

// 6) 変爻複数
{
  const r = reconstructIching([9,9,8,8,7,7] as LineValue[]);
  t('変爻が複数', r.changingLines.length === 2);
}

// 7) 全爻変爻
{
  const r = reconstructIching([6,6,6,6,6,6] as LineValue[]);
  t('全爻変爻→changingLines=6本', r.changingLines.length === 6);
  // 本卦=坤(000000)=2, 之卦=乾(111111)=1
  t('坤→乾', r.primary.num === 2 && r.transformed?.num === 1);
}

// 8) 既知の卦番号: 乾為天=1（全陽）, 坤為地=2（全陰）, 既済=63, 未済=64
{
  t('全陽=乾為天(1)', reconstructIching([7,7,7,7,7,7] as LineValue[]).primary.num === 1);
  t('全陰=坤為地(2)', reconstructIching([8,8,8,8,8,8] as LineValue[]).primary.num === 2);
  // 水火既済(63): 上=坎(水・下から陰陽陰)・下=離(火・下から陽陰陽) → 下から[7,8,7,8,7,8]
  t('既済(63) 下から陽陰陽陰陽陰', reconstructIching([7,8,7,8,7,8] as LineValue[]).primary.num === 63);
  // 火水未済(64): 上=離・下=坎 → 下から[8,7,8,7,8,7]
  t('未済(64) 下から陰陽陰陽陰陽', reconstructIching([8,7,8,7,8,7] as LineValue[]).primary.num === 64);
}

// 9) 質問正規化
{
  t('全角空白を正規化', normalizeQuestion('a　b') === 'a b');
  t('連続空白を1つに', normalizeQuestion('a    b') === 'a b');
  t('前後trim', normalizeQuestion('  hello  ') === 'hello');
  t('同じ質問は同じhash', hashQuestion('abc') === hashQuestion('abc'));
  t('違う質問は違うhash', hashQuestion('abc') !== hashQuestion('abd'));
}

// 10) 保存→再構築（再抽選しない）
{
  const orig = castIching('PERSIST-001');
  const back = reconstructIching(orig.values);
  t('保存values→再構築で同じ本卦', orig.primary.num === back.primary.num);
  t('保存values→再構築で同じ之卦', (orig.transformed?.num ?? null) === (back.transformed?.num ?? null));
  t('保存values→再構築で同じchangingLines', JSON.stringify(orig.changingLines) === JSON.stringify(back.changingLines));
}

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed === 0 ? 0 : 1);
