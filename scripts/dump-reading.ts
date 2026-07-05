// 任意の購入者情報から鑑定JSON（orba-pdf用）を生成する。DB不要。
//
// 使い方:
//   npx tsx scripts/dump-reading.ts --name "山田花子" --birth 1990-05-10 \
//     [--time 08:30] [--place 横浜市] [--gender female] \
//     [--out ../orba-pdf/data/yamada.json] [--sample]
//
//   --name    表示名（PDF表紙・本文で使用）
//   --birth   生年月日 YYYY-MM-DD（必須）
//   --time    出生時刻 HH:MM（不明なら省略可。ASC等の精度が下がる）
//   --place   出生地（市区町村名。省略時は東京でタイムゾーン解決）
//   --gender  male / female / other（省略可）
//   --out     出力先。省略時は ../orba-pdf/data/<name>.json
//   --sample  匿名サンプルモード（PDFに SAMPLE リボンと見本注記が入る）
//
// ココナラ受注時: 購入者から届いた出生情報をそのまま引数に渡す。
// 実在ユーザーのDB登録は不要（このスクリプトはDBに一切書き込まない）。

import { buildGrandProfile } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';
import { summarizeProfile, summarizeDaily } from '@/lib/engine/summarize';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const name = arg('name');
const birthDate = arg('birth');
const birthTime = arg('time');
const birthPlace = arg('place');
const gender = arg('gender');
const theme = arg('theme');
const sample = flag('sample');

if (!name || !birthDate) {
  console.error('必須: --name <表示名> --birth <YYYY-MM-DD>');
  console.error('任意: --time HH:MM --place 出生地 --gender male|female|other --theme 知りたいテーマ --out 出力先.json --sample');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
  console.error('--birth は YYYY-MM-DD 形式で指定してください:', birthDate);
  process.exit(1);
}
if (birthTime && !/^\d{1,2}:\d{2}$/.test(birthTime)) {
  console.error('--time は HH:MM 形式で指定してください:', birthTime);
  process.exit(1);
}

const slug = (arg('out')
  ? arg('out')!
  : `../orba-pdf/data/${name.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]+/gi, '-')}.json`);
const outPath = resolve(slug);

const profile = buildGrandProfile({
  name,
  birthDate,
  birthTime: birthTime || undefined,
  birthPlace: birthPlace || undefined,
  gender: gender || undefined,
});
const daily = computeDailyState(profile);

const out = {
  generatedAt: new Date().toISOString(),
  meta: { name, birthDate, birthTime: birthTime ?? null, birthPlace: birthPlace ?? null, gender: gender ?? null, theme: theme ?? null, sample },
  profile,
  daily,
  factSheet: summarizeProfile(profile),
  dailySheet: summarizeDaily(daily),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log('OK →', outPath, sample ? '（サンプルモード）' : '');
console.log('  太陽:', profile.westernAstrology.sun.sign, profile.westernAstrology.sun.degree.toFixed(1) + '°',
  '/ 月:', profile.westernAstrology.moon.sign,
  '/ ASC:', profile.westernAstrology.ascendant?.sign ?? '（出生時刻なし）');
console.log('  日柱:', profile.fourPillars.day.stem + profile.fourPillars.day.branch,
  '/ 九星:', profile.nineStar.main.num + profile.nineStar.main.name,
  '/ 宿曜:', profile.sukuyo.mansion,
  '/ HD:', profile.humanDesign.type);
