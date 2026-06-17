import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { CharacterAvatar, type CharacterType } from '@/app/components/CharacterAvatar';
import { OrbField } from '@/app/components/OrbField';

// サーバーコンポーネントから 'use client' のデータは読めないため、ラベルはここで保持
const ORB_LABEL: Record<CharacterType, string> = {
    fairy: '妖精オーブ', burn: '焔オーブ', shaman: '巫女オーブ', sage: '賢者オーブ', cool: '氷オーブ', friend: '親友オーブ',
};
const VALID = (t: string): CharacterType => (t in ORB_LABEL ? (t as CharacterType) : 'sage');

async function getShare(id: string) {
    const diag = await prisma.diagnosis.findUnique({
        where: { id },
        include: { user: { select: { characterType: true } } },
    }).catch(() => null);
    if (!diag) return null;
    const r = JSON.parse(diag.data) as { summary?: string; coreNature?: string; dailyTheme?: string };
    const summary = r.summary || (r.coreNature ? r.coreNature.split(/[。．]/)[0] : '');
    return { type: VALID(diag.user.characterType || 'sage'), summary, coreNature: r.coreNature ?? '', dailyTheme: r.dailyTheme ?? '' };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const s = await getShare(id);
    if (!s) return { title: 'Orba' };
    const label = ORB_LABEL[s.type];
    const title = s.summary ? `${s.summary} | Orba` : `私のパートナーオーブは「${label}」 | Orba`;
    const desc = `${label}が視た私。あなただけのオーブも30秒で見つけよう。`;
    return {
        title,
        description: desc,
        openGraph: { title, description: desc, images: [{ url: `/share/orb-${s.type}.png`, width: 1200, height: 630 }] },
        twitter: { card: 'summary_large_image', title, description: desc, images: [`/share/orb-${s.type}.png`] },
    };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const s = await getShare(id);

    return (
        <main className="min-h-screen bg-mesh text-white relative flex items-center justify-center px-4 py-12">
            <OrbField count={18} />
            <div className="relative z-10 w-full max-w-md text-center">
                <p className="font-display italic text-amber-200/70 text-2xl mb-6">Orba</p>

                {s ? (
                    <>
                        <div className="flex justify-center mb-5">
                            <CharacterAvatar type={s.type} size={150} />
                        </div>
                        {s.summary && (
                            <h1 className="text-2xl md:text-3xl mb-2 font-serif-jp leading-relaxed">&ldquo;{s.summary}&rdquo;</h1>
                        )}
                        <p className="text-white/50 text-sm font-serif-jp mb-6">{ORB_LABEL[s.type]}が視た、ある人の魂</p>
                        {s.coreNature && (
                            <div className="card p-6 mb-8 text-left">
                                <p className="text-amber-200/70 text-xs tracking-widest mb-2 font-serif-jp">魂のプロファイリング</p>
                                <p className="text-[15px] leading-relaxed text-white/85 font-serif-jp whitespace-pre-line">{s.coreNature}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-white/60 font-serif-jp mb-8">このオーブは見つかりませんでした。</p>
                )}

                <Link href="/" className="btn-gold inline-block px-10 py-4 font-bold">
                    あなたのオーブを見つける →
                </Link>
                <p className="mt-4 text-[11px] text-white/30 font-serif-jp">
                    Orbaは、あらゆる占術を統合してあなただけの結果を導く、人生のパートナーです。
                </p>
            </div>
        </main>
    );
}
