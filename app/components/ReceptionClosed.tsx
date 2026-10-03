import Link from 'next/link';
import { OrbaMark } from './OrbaMark';
import { LandingAccountActions } from './LandingAccountActions';
import { TransferRestore } from './TransferRestore';
import { RECEPTION_CLOSED_MESSAGE } from '@/lib/service-policy';
export function ReceptionClosed() {
  return <main className="min-h-screen bg-mesh flex items-center justify-center px-6 py-12 text-white">
    <section className="card max-w-lg w-full rounded-3xl p-8 space-y-5">
      <OrbaMark size={42} />
      <h1 className="text-2xl font-serif-jp">Orbaへようこそ</h1>
      <p className="text-sm text-white/75 leading-relaxed">{RECEPTION_CLOSED_MESSAGE}</p>
      <LandingAccountActions />
      <TransferRestore />
      <nav className="flex flex-wrap gap-4 text-xs text-white/60" aria-label="サービス情報">
        <Link href="/contact" className="underline">お問い合わせ</Link><Link href="/safety" className="underline">利用上の注意</Link><Link href="/legal/terms" className="underline">利用規約</Link><Link href="/legal/privacy" className="underline">プライバシーポリシー</Link>
      </nav>
    </section>
  </main>;
}
