'use client';
import { X } from 'lucide-react';
import { RECEPTION_CLOSED_MESSAGE } from '@/lib/service-policy';
import { ModalPortal } from './ModalPortal';
export function FoundingMemberModal({ onClose }: { userEmail?: string | null; onClose: () => void }) {
  return <ModalPortal><div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="reception-closed-title" className="card max-w-sm rounded-3xl p-6 text-white space-y-4" onClick={event => event.stopPropagation()}>
      <div className="flex justify-between items-center"><h2 id="reception-closed-title" className="font-serif-jp">新規有料申込みは停止しています</h2><button onClick={onClose} aria-label="閉じる"><X /></button></div>
      <p className="text-sm text-white/70 leading-relaxed">{RECEPTION_CLOSED_MESSAGE}</p>
      <p className="text-xs text-white/60">既存の利用条件に応じて、鑑定・暦・易を引き続き利用できます。</p>
      <button className="btn-gold w-full py-2" onClick={onClose}>閉じる</button>
    </section>
  </div></ModalPortal>;
}
