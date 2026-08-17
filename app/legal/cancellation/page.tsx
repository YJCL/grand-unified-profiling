import Link from 'next/link';

export const metadata = { title: 'キャンセル・返金ポリシー | Orba' };

export default function CancellationPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-2xl mb-2">キャンセル・返金ポリシー</h1>
        <p className="text-xs text-white/35 mb-10">最終更新日：2026年8月17日</p>
        <div className="space-y-8 text-sm leading-relaxed text-white/75 font-serif-jp">
          <section>
            <h2 className="text-base text-amber-200/80 mb-2">1. 月額プランの解約</h2>
            <p>Orba Plusはアプリ内のアカウント・設定からいつでも解約できます。解約手続き後は次回以降の自動更新を停止し、支払済みの利用期間の終了までは有料機能をご利用いただけます。</p>
          </section>
          <section>
            <h2 className="text-base text-amber-200/80 mb-2">2. 返金</h2>
            <p>デジタルサービスの性質上、利用期間開始後の料金について、お客様都合による日割り返金・払い戻しは行いません。ただし、重複決済、当サービスの責めに帰すべき不具合、その他法令上返金が必要な場合は個別に確認します。</p>
          </section>
          <section>
            <h2 className="text-base text-amber-200/80 mb-2">3. 解約できない場合</h2>
            <p>アプリ内から手続きできない場合は、お問い合わせフォームから登録メールアドレスと状況をご連絡ください。確認後、必要な手続きを案内します。</p>
          </section>
          <section>
            <h2 className="text-base text-amber-200/80 mb-2">4. お問い合わせ</h2>
            <p><Link className="text-amber-100 hover:underline" href="/contact">お問い合わせフォーム</Link>、または orba.support@gmail.com までご連絡ください。</p>
          </section>
        </div>
        <nav className="mt-12 flex flex-wrap gap-6 text-xs text-white/40" aria-label="関連情報">
          <Link href="/">← トップへ</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/contact">お問い合わせ</Link>
        </nav>
      </div>
    </main>
  );
}
