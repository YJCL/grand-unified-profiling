import Link from 'next/link';

export const metadata = { title: '利用規約 | Orba' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-2xl mb-2">利用規約</h1>
        <p className="text-xs text-white/55 mb-10">最終更新日：2026年8月24日</p>

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
              <li>18歳未満の方は有料プランを利用できません。未成年者が無料機能を利用する場合は、保護者の同意を得てください。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第3条（生成AIの利用）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスは、鑑定文の生成および対話の一部に生成AIを利用します。</li>
              <li>占術データの算出および易の卦を立てる処理はプログラムで行い、生成AIは主に結果の文章化に使用します。</li>
              <li>生成内容は誤りや不適切な表現を含む可能性があり、未来、健康、生死、合否、恋愛結果、金銭的利益等を保証するものではありません。</li>
              <li>氏名、住所、電話番号、病歴等の本人または第三者を特定できる情報や機微な情報を相談文へ入力しないでください。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第4条（有料プラン）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Orba Plusは月額1,480円（税込）で、お申し込み時に初回課金され、以後毎月同日に自動更新されます。</li>
              <li>決済はKOMOJUを通じて行われ、当サービスはカード番号を保存しません。</li>
              <li>解約はアプリ内からいつでも行えます。解約後も支払済み期間の終了までは利用でき、法令上必要な場合を除き決済済み料金は返金されません。</li>
              <li>解約・返金の詳細は、キャンセル・返金ポリシーに定めます。</li>
              <li>無料プランには利用回数・閲覧範囲等の制限があります。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第5条（禁止事項）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスへの不正アクセス、リバースエンジニアリング、過度な自動アクセス</li>
              <li>他者の個人情報を本人の同意なく入力する行為</li>
              <li>法令または公序良俗に反する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第6条（免責）</h2>
            <p>運営者は、本サービスの利用または利用不能から生じた損害について、運営者の故意または重過失による場合を除き、責任を負いません。医療・法律・金融等の専門的判断が必要な事項は、必ず専門家にご相談ください。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第7条（サービスの変更・終了）</h2>
            <p>運営者は、事前の告知をもって本サービスの内容を変更し、または提供を終了できるものとします。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">第8条（規約の変更）</h2>
            <p>本規約は必要に応じて変更されることがあります。重要な変更はアプリ内で告知します。</p>
          </section>
        </div>

        <div className="mt-12 flex gap-6 text-xs text-white/40">
          <Link href="/" className="hover:text-white/70">← トップへ</Link>
          <Link href="/legal/privacy" className="hover:text-white/70">プライバシーポリシー</Link>
          <Link href="/safety" className="hover:text-white/70">AI利用と安全性</Link>
          <Link href="/legal/tokushoho" className="hover:text-white/70">特商法表記</Link>
          <Link href="/legal/cancellation" className="hover:text-white/70">キャンセルポリシー</Link>
          <Link href="/contact" className="hover:text-white/70">お問い合わせ</Link>
        </div>
      </div>
    </main>
  );
}
