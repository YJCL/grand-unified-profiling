import { NextResponse } from 'next/server';
import { RECEPTION_CLOSED_MESSAGE } from '@/lib/service-policy';
// Close before body parsing, authentication, database work or payment API calls.
// Existing login, recovery, subscriptions and cancellation have separate routes.
export async function GET() {
  return NextResponse.json({ error: RECEPTION_CLOSED_MESSAGE, code: 'reception_closed' }, { status: 410 });
}
