import Link from 'next/link';
import { ContactForm } from './ContactForm';

export const metadata = {
  title: 'お問い合わせ | Orba',
  description: 'Orbaのサービス、アカウント、お支払い・解約に関するお問い合わせ窓口です。',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-mesh text-white">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <p className="text-[11px] tracking-[0.22em] text-amber-200/55 mb-3">CONTACT / SUPPORT</p>
        <h1 className="text-3xl mb-4">お問い合わせ</h1>
        <p className="text-sm leading-relaxed text-white/60 mb-9">
          サービスの使い方、アカウント、お支払い・解約、不具合についてはこちらからご連絡ください。通常3営業日以内を目安に返信します。
        </p>
        <ContactForm />
        <div className="mt-8 rounded-2xl border border-white/10 px-5 py-4 text-sm text-white/55">
          <p>メールでのお問い合わせ：<a className="text-amber-100 hover:underline" href="mailto:orba.support@gmail.com">orba.support@gmail.com</a></p>
        </div>
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45" aria-label="関連情報">
          <Link href="/">← トップへ</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/legal/cancellation">キャンセルポリシー</Link>
          <Link href="/legal/tokushoho">特商法表記</Link>
        </nav>
      </div>
    </main>
  );
}
