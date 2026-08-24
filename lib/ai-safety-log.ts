import { prisma } from '@/lib/prisma';
import type { AiSafetyCategory } from '@/lib/ai-safety';

export async function recordAiSafetyEvent(opts: {
  userId?: string | null;
  route: 'chat' | 'iching' | 'daily' | 'daily_reading' | 'profile_reading';
  phase: 'input' | 'output';
  action: 'blocked' | 'redacted' | 'output_rewritten';
  categories?: AiSafetyCategory[];
  ruleIds: string[];
}): Promise<void> {
  try {
    await prisma.event.create({
      data: {
        name: 'ai_safety_event',
        userId: opts.userId || null,
        // 原文・生成文は保存しない。審査と改善に必要な分類情報だけを記録する。
        props: JSON.stringify({
          route: opts.route,
          phase: opts.phase,
          action: opts.action,
          categories: opts.categories ?? [],
          ruleIds: opts.ruleIds,
          policyVersion: '2026-08-24',
        }),
      },
    });
  } catch (error) {
    // 安全案内そのものをログ障害で止めない。
    console.error('[ai-safety] failed to record event', error);
  }
}
