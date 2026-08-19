import Link from 'next/link';

export const metadata = { title: '特定商取引法に基づく表記 | Orba' };

// ─────────────────────────────────────────────────────────────
//  ★ リリース前に必ず実情報へ差し替えてください（有料課金の法的必須事項）
//  個人事業の場合、住所・電話番号は「請求があれば遅滞なく開示」で可。
//  氏名（または屋号＋代表者名）と連絡先メールは原則開示が必要です。
// ─────────────────────────────────────────────────────────────
const SELLER = {
  name: '岩切 秀樹',
  manager: '岩切 秀樹',
  address: 'ご請求をいただいた場合、遅滞なく開示いたします',
  phone: 'ご請求をいただいた場合、遅滞なく開示いたします',
  email: 'orba.support@gmail.com',
  support: 'お問い合わせは24時間受け付けています。回答は通常3営業日以内を目安に行います。',
  price: 'Orba Plus：月額 1,480円（税込）',
  extraFees: 'なし（インターネット接続にかかる通信料はお客様のご負担となります）',
  paymentMethod: 'クレジットカード（KOMOJUを通じて決済します。カード情報を当サービスでは保持しません）',
  paymentTiming: 'お申し込み時に課金され、以後は毎月同日に自動更新されます',
  deliveryTiming: '決済完了後、ただちにご利用いただけます',
  cancel: 'いつでも解約できます。解約後も、当該課金期間の終了日まではプレミアム機能をご利用いただけます。デジタルサービスの性質上、決済済みの料金の返金はいたしかねます（法令で認められる場合を除く）。',
  environment: '最新版の主要ブラウザ（Chrome / Safari / Edge 等）。一部機能はネットワーク接続が必要です。',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-4 border-b border-white/8">
      <dt className="text-amber-200/70 text-xs sm:text-sm">{label}</dt>
      <dd className="sm:col-span-2 text-white/80 text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

export default function TokushohoPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <h1 className="text-2xl mb-2">特定商取引法に基づく表記</h1>
        <p className="text-xs text-white/35 mb-10 font-serif-jp">最終更新日：2026年8月19日</p>

        <dl className="font-serif-jp">
          <Row label="販売事業者">{SELLER.name}</Row>
          <Row label="運営統括責任者">{SELLER.manager}</Row>
          <Row label="所在地">{SELLER.address}</Row>
          <Row label="電話番号">{SELLER.phone}</Row>
          <Row label="メールアドレス">{SELLER.email}</Row>
          <Row label="お問い合わせ受付">{SELLER.support}</Row>
          <Row label="販売価格">{SELLER.price}</Row>
          <Row label="商品代金以外の必要料金">{SELLER.extraFees}</Row>
          <Row label="お支払い方法">{SELLER.paymentMethod}</Row>
          <Row label="お支払い時期">{SELLER.paymentTiming}</Row>
          <Row label="役務の提供時期">{SELLER.deliveryTiming}</Row>
          <Row label="解約・返金について">{SELLER.cancel}</Row>
          <Row label="動作環境">{SELLER.environment}</Row>
        </dl>

        <div className="mt-12 flex gap-6 text-xs text-white/40">
          <Link href="/" className="hover:text-white/70">← トップへ</Link>
          <Link href="/legal/terms" className="hover:text-white/70">利用規約</Link>
          <Link href="/legal/privacy" className="hover:text-white/70">プライバシーポリシー</Link>
          <Link href="/legal/cancellation" className="hover:text-white/70">キャンセルポリシー</Link>
          <Link href="/contact" className="hover:text-white/70">お問い合わせ</Link>
        </div>
      </div>
    </main>
  );
}
