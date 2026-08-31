import type { Metadata } from 'next';
import { StrengthsDiagnosis } from './StrengthsDiagnosis';
import { parseStrengthResultId, STRENGTH_RESULTS } from './strengths-data';

type PageSearchParams = Promise<{ result?: string; sub?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const resultId = parseStrengthResultId(params.result);
  const secondaryId = parseStrengthResultId(params.sub);
  const result = resultId ? STRENGTH_RESULTS[resultId] : undefined;
  const title = result
    ? `私の強みタイプは「${result.title}」｜Orba 10問診断`
    : 'あなたの強みは、どう使われる？｜10問・無料・登録不要｜Orba';
  const description = result
    ? `${result.lead} 10問から、得意な動き方と力が出やすい環境を整理するOrbaの無料診断。`
    : '10問に答えると、普段の行動から「得意な動き方」と「力が出やすい環境」がわかります。無料・登録不要、約2〜3分。';
  const image = `/share/strengths/${resultId || 'default'}.png`;
  const shareUrl = resultId
    ? `/diagnosis/strengths?result=${resultId}${secondaryId && secondaryId !== resultId ? `&sub=${secondaryId}` : ''}`
    : '/diagnosis/strengths';

  return {
    title,
    description,
    alternates: { canonical: '/diagnosis/strengths' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: shareUrl,
      images: [{ url: image, width: 1200, height: 630, alt: result ? `Orba 強み診断「${result.title}」` : 'Orba 10問強み診断' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function StrengthsDiagnosisPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const initialResult = parseStrengthResultId(params.result);
  const initialSecondary = parseStrengthResultId(params.sub);

  return (
    <StrengthsDiagnosis
      initialSharedResult={initialResult}
      initialSharedSecondary={initialSecondary && initialSecondary !== initialResult ? initialSecondary : undefined}
    />
  );
}
