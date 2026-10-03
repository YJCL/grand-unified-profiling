import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';
import { CHAT_CLOSED_MESSAGE } from '@/lib/service-policy';

// Retain existing history, protected by the same signed owner session.
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');
  const access = await checkUserAccess(userId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const log = await prisma.chatLog.findFirst({ where: { userId: userId! }, orderBy: { createdAt: 'desc' } });
    const messages = log ? JSON.parse(log.messages) : [];
    return NextResponse.json({ messages, readOnly: true });
  } catch {
    console.error('Error fetching chat history');
    return NextResponse.json({ error: '会話履歴を読み込めませんでした。' }, { status: 500 });
  }
}

// Deletion previously triggered model-based memory distillation; close it too.
// Reject before body parsing, model calls, counters, events or database work.
export async function POST() {
  return NextResponse.json({ error: CHAT_CLOSED_MESSAGE, code: 'chat_closed' }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: CHAT_CLOSED_MESSAGE, code: 'chat_closed' }, { status: 410 });
}
