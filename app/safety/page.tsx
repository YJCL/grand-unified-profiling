import Link from 'next/link';

export const metadata = {
  title: 'AI利用と安全性 | Orba',
  description: 'Orbaにおける生成AIの利用範囲、出力制御、相談時の注意事項をご案内します。',
};

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="text-2xl mb-2">AI利用と安全性</h1>
        <p className="text-xs text-white/55 mb-10">最終更新日：2026年8月24日</p>

        <div className="space-y-9 text-sm leading-relaxed text-white/80 font-serif-jp">
          <section>
            <h2 className="text-base text-amber-200 mb-2">AIを利用する範囲</h2>
            <p>Orbaは、文章生成と対話の一部にAnthropic社の生成AIを利用しています。生年月日・出生情報等に基づく占術データの算出や、易の卦を立てる処理はプログラムで行い、生成AIはその結果を利用者の文脈に合わせて文章化するために使用します。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200 mb-2">結果の位置づけ</h2>
            <p>鑑定や対話は、娯楽と自己理解、選択肢の整理を目的としています。未来、健康、生死、合否、恋愛結果、金銭的利益などを断定または保証するものではありません。重要な判断では、現実の情報と有資格の専門家による助言を優先してください。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200 mb-2">入力と出力の安全対策</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>入力内容から、自傷・自殺、医療上の予後や治療判断、法律、投資などの高リスク領域を送信前に検知します。</li>
              <li>自傷・自殺の危険が疑われる場合は占いや鑑定を行わず、安全確保と公的な相談窓口をご案内します。</li>
              <li>病気が治るか、薬や治療を変えるべきかなどの医療上の結論は回答せず、医療機関への確認をご案内します。</li>
              <li>生成後の文章も検査し、過度に断定的な表現や、医療・生死・利益等を保証する表現を検知した場合は安全な表現へ置き換えます。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base text-amber-200 mb-2">入力しないでいただきたい情報</h2>
            <p>氏名、住所、電話番号、メールアドレス、口座・カード番号、具体的な病歴など、本人または第三者を特定できる情報や機微な情報は入力しないでください。メールアドレスや電話番号等の形式を検知した場合は、生成AIへ送る前に伏せ字へ置き換えます。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200 mb-2">モニタリングと改善</h2>
            <p>安全ルールにより入力を停止した場合や出力を置き換えた場合は、発言原文を安全管理ログへ複製せず、対象機能、判定分類、適用したルール、日時のみを記録します。運営者はこの記録を定期的に確認し、誤検知や見逃しが確認された場合は判定ルールと表示を見直します。</p>
          </section>

          <section className="rounded-2xl bg-white/[0.05] p-5">
            <h2 className="text-base text-amber-200 mb-2">今すぐ安全を保てないとき</h2>
            <p>自分を傷つけるおそれがある、またはすでに傷つけた場合は119へ連絡してください。できれば一人にならず、近くの信頼できる人に助けを求めてください。</p>
            <p className="mt-3">電話で話せる場合は「いのちSOS」0120-061-338（無料・毎日24時間）があります。電話・SNSなど他の相談先は、厚生労働省の案内から選べます。</p>
            <a href="https://www.mhlw.go.jp/mamorouyokokoro/" target="_blank" rel="noreferrer" className="mt-3 inline-block text-amber-200 underline underline-offset-4">厚生労働省「まもろうよ こころ」</a>
          </section>
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/60" aria-label="関連ページ">
          <Link href="/">← トップへ</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/contact">お問い合わせ</Link>
        </nav>
      </div>
    </main>
  );
}
