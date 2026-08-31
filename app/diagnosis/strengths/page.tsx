import type { Metadata } from 'next';
import { StrengthsDiagnosis, type StrengthResultId } from './StrengthsDiagnosis';

export const metadata: Metadata = {
  title: '強みの使われ方を3問で整理｜無料・登録不要｜Orba',
  description: '自分の強みがわからないときに、自然に担う役割、力が出やすい距離、迷ったときの初動から、強みが使われる条件を3問で整理します。登録不要・無料。',
  alternates: { canonical: '/diagnosis/strengths' },
  openGraph: {
    title: '強みの使われ方を3問で整理｜Orba',
    description: '目立つ才能ではなく、自然に担っている役割から強みの仮説をつくります。',
    url: '/diagnosis/strengths',
  },
};

export default async function StrengthsDiagnosisPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  const initialResult = result === 'structure' || result === 'sensitivity' || result === 'momentum'
    ? result as StrengthResultId
    : undefined;
  return <StrengthsDiagnosis initialSharedResult={initialResult} />;
}
