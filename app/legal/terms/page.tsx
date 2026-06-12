import Link from 'next/link';

export const metadata = { title: '利用規約 | Orba' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-2xl mb-2">利用規約</h1>
        <p className="text-xs text-white/35 mb-10">最終更新日：2026年6月7日</p>

        <div className="space-y-8 text-sm leading-relaxed text-white/75 font-serif-jp">
          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第1条（本サービス）</h2>
            <p>本サービスは、占術・心理学等の知見を統合した自己理解の補助、および日々の相談を提供するエンターテインメントサービスです。鑑定結果や助言の正確性・有用性を保証するものではなく、重要な意思決定はご自身の判断と責任で行ってください。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第2条（アカウント）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>アカウント登録なしでも一部機能を利用できますが、複数端末での利用には登録が必要です。</li>
              <li>登録情報は正確に保ち、パスワードは自身で適切に管理してください。</li>
              <li>第三者のなりすまし、アカウントの譲渡・売買は禁止します。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第3条（有料プラン）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>有料プランの内容・価格は、アプリ内の表示によります。</li>
              <li>決済・解約の手続および返金の扱いは、決済手段ごとの規約・法令に従います。</li>
              <li>無料プランには利用回数・閲覧範囲等の制限があります。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第4条（禁止事項）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスへの不正アクセス、リバースエンジニアリング、過度な自動アクセス</li>
              <li>他者の個人情報を本人の同意なく入力する行為</li>
              <li>法令または公序良俗に反する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第5条（免責）</h2>
            <p>運営者は、本サービスの利用または利用不能から生じた損害について、運営者の故意または重過失による場合を除き、責任を負いません。医療・法律・金融等の専門的判断が必要な事項は、必ず専門家にご相談ください。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第6条（サービスの変更・終了）</h2>
            <p>運営者は、事前の告知をもって本サービスの内容を変更し、または提供を終了できるものとします。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第7条（規約の変更）</h2>
            <p>本規約は必要に応じて変更されることがあります。重要な変更はアプリ内で告知します。</p>
          </section>
        </div>

        <div className="mt-12 flex gap-6 text-xs text-white/40">
          <Link href="/" className="hover:text-white/70">← トップへ</Link>
          <Link href="/legal/privacy" className="hover:text-white/70">プライバシーポリシー</Link>
        </div>
      </div>
    </main>
  );
}
