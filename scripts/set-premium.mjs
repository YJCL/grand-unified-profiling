// 指定メールのアカウントの isPremium を切り替える運用スクリプト。
//   付与:   node scripts/set-premium.mjs you@example.com
//   解除:   node scripts/set-premium.mjs you@example.com off
// admin（全機能開放）アカウントの作成や、招待・手動付与に使う。
// ※ .env / .env.local の DATABASE_URL を読む（本番DBに直接書き込むので注意）。
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
const on = process.argv[3] !== 'off';
if (!email) {
  console.error('usage: node scripts/set-premium.mjs <email> [off]');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({ where: { email }, data: { isPremium: on } });
  console.log(`${user.email} -> isPremium=${user.isPremium}`);
} catch (e) {
  console.error('failed:', e.message, '（そのメールのアカウントが存在しない可能性）');
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
