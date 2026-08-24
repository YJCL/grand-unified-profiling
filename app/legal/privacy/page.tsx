import Link from 'next/link';

export const metadata = { title: 'プライバシーポリシー | Orba' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-2xl mb-2">プライバシーポリシー</h1>
        <p className="text-xs text-white/55 mb-10">最終更新日：2026年8月24日</p>

        <div className="space-y-8 text-sm leading-relaxed text-white/75 font-serif-jp">
          <section>
            <h2 className="text-base text-amber-200/80 mb-2">1. 取得する情報</h2>
            <p>本サービスは、以下の情報をユーザーの入力に基づいて取得します。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>アカウント情報：メールアドレス、パスワード（不可逆なハッシュ値のみ保存し、平文は保存しません）</li>
              <li>プロフィール情報：ニックネーム、生年月日、出生時刻、出生地、性別（任意）</li>
              <li>相談内容：チャットでの会話、悩みとして入力されたテキスト</li>
              <li>利用記録：鑑定結果、利用日時等のログ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">2. 利用目的</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>占術計算・鑑定文の生成・日々の運勢等、本サービスの提供のため</li>
              <li>アカウントの認証、複数端末でのデータ同期のため</li>
              <li>有料プランの管理・課金状態の判定のため</li>
              <li>不正利用の防止、AI出力の安全性確認、サービスの改善のため</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">3. 第三者への提供・外部送信</h2>
            <p>取得した情報を第三者に販売することはありません。サービス提供に必要な範囲で、以下の外部事業者に情報が送信されます。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Anthropic：鑑定文・会話の生成のため、プロフィール・相談内容をAPIに送信します。Anthropic APIの入力・出力は、明示的に同意した場合等を除き、初期設定ではモデル学習に使用されません。標準では入力・出力が同社側で最大30日間保持される場合があります</li>
              <li>Vercel（米国）／Supabase（データはアジア太平洋リージョン）：ホスティングおよびデータベースとして利用します</li>
              <li>KOMOJU（株式会社DEGICA）：有料プランのカード決済・継続課金の処理に利用します。当サービスはカード番号を取得・保存しません</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">4. データの保管と安全管理</h2>
            <p>通信はTLSにより暗号化されます。パスワードはソルト付きの一方向ハッシュ（scrypt）で保存され、運営者を含め何人も元のパスワードを復元できません。安全ルールが作動した場合は、対象機能、判定分類、適用したルール、日時を安全管理ログとして記録します。このログには相談文や生成文の原文を複製しません。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">5. データの削除</h2>
            <p>アプリ内のプロフィール削除機能により、プロフィール・鑑定履歴・会話履歴を削除できます。アカウントの完全な削除をご希望の場合は、下記の連絡先までお問い合わせください。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">6. 免責</h2>
            <p>本サービスの鑑定・アドバイスは娯楽および自己理解の補助を目的とするものであり、医療・法律・金融等の専門的助言に代わるものではありません。</p>
          </section>

          <section>
            <h2 className="text-base text-amber-200/80 mb-2">7. お問い合わせ</h2>
            <p>本ポリシーに関するお問い合わせは、運営者（岩切 秀樹／orba.support@gmail.com）までお願いします。</p>
          </section>
        </div>

        <div className="mt-12 flex gap-6 text-xs text-white/40">
          <Link href="/" className="hover:text-white/70">← トップへ</Link>
          <Link href="/legal/terms" className="hover:text-white/70">利用規約</Link>
          <Link href="/safety" className="hover:text-white/70">AI利用と安全性</Link>
          <Link href="/legal/tokushoho" className="hover:text-white/70">特商法表記</Link>
          <Link href="/contact" className="hover:text-white/70">お問い合わせ</Link>
        </div>
      </div>
    </main>
  );
}
