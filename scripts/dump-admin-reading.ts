import { buildProfileFromUser } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';
import { summarizeProfile, summarizeDaily } from '@/lib/engine/summarize';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';

const ADMIN_ID = '59387080-cfc8-4acf-9fb9-3dbc69680636';

async function main() {
  const p = new PrismaClient();
  const u = await p.user.findUnique({ where: { id: ADMIN_ID } });
  if (!u) throw new Error('admin not found');
  const profile = buildProfileFromUser(u)!;
  const daily = computeDailyState(profile);
  const out = {
    generatedAt: new Date().toISOString(),
    meta: { name: u.name, birthDate: u.birthDate, birthTime: u.birthTime, birthPlace: u.birthPlace, gender: u.gender, characterType: u.characterType },
    profile, daily,
    factSheet: summarizeProfile(profile),
    dailySheet: summarizeDaily(daily),
  };
  writeFileSync('../orba-pdf/data/admin.json', JSON.stringify(out, null, 2));
  console.log('OK name:', u.name, '/ sukuyo:', profile.sukuyo.mansion, '/ sun:', profile.westernAstrology.sun.sign, profile.westernAstrology.sun.degree.toFixed(1)+'°');
  console.log('moon:', profile.westernAstrology.moon.sign, '/ ASC:', profile.westernAstrology.ascendant?.sign);
  console.log('HD:', profile.humanDesign.type, '/', profile.humanDesign.authority, '/', profile.humanDesign.profile);
  console.log('四柱日柱:', profile.fourPillars.day.stem + profile.fourPillars.day.branch);
  console.log('九星:', profile.nineStar.main.num + profile.nineStar.main.name);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
