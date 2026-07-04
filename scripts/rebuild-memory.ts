// 保存済みチャット全履歴を distillMemory で頭から再蒸留し、User.memory を再構築する。
// 記憶の汚染・欠落が起きたときの修復ツール。
// 使い方:
//   npx tsx scripts/rebuild-memory.ts [email]            # ドライラン（DB未変更・結果をtxt保存）
//   npx tsx scripts/rebuild-memory.ts [email] --write    # DBへ書き込み
// 要 ANTHROPIC_API_KEY。email省略時はadmin。
import { PrismaClient } from '@prisma/client';
import { distillMemory } from '@/lib/memory';

const p = new PrismaClient();
async function main() {
  const email = process.argv.find((a) => a.includes('@')) || 'hideki.iwakiri.works@gmail.com';
  const u = await p.user.findFirst({ where: { email } });
  if (!u) throw new Error('admin not found');
  const log = await p.chatLog.findFirst({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } });
  if (!log) throw new Error('no chatlog');
  const msgs = JSON.parse(log.messages) as { role: string; content: string }[];
  console.log('全履歴:', msgs.length, '件を16件ずつ再蒸留');

  let memory = ''; // 汚染された既存記憶は捨て、全履歴からゼロで再構築
  for (let i = 0; i < msgs.length; i += 16) {
    const chunk = msgs.slice(i, i + 16);
    const mem = await distillMemory({ currentMemory: memory, recent: chunk, userName: u.name });
    if (mem) memory = mem;
    console.log(`  ${i + chunk.length}/${msgs.length} 蒸留済（記憶 ${memory.length}字）`);
  }

  console.log('--- 再構築された記憶 ---');
  console.log(memory);
  if (process.argv.includes('--write')) {
    await p.user.update({ where: { id: u.id }, data: { memory } });
    console.log('DBへ保存しました。');
  } else {
    const { writeFileSync } = await import('fs');
    writeFileSync('scripts/tmp-rebuilt-memory.txt', memory);
    console.log('（ドライラン: DBは未変更。scripts/tmp-rebuilt-memory.txt に保存。--write で書き込み）');
  }
}
main().finally(() => p.$disconnect());
