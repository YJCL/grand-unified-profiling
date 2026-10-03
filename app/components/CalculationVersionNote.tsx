import type { CalculationMetadata } from '@/lib/engine/calculation-meta';

export function CalculationVersionNote({ calculation }: { calculation?: CalculationMetadata }) {
  return <aside className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60 leading-relaxed space-y-1">
    <p>{calculation ? '計算版：' + calculation.version : '旧版の保存結果（計算版の記録なし）'}</p>
    <p>保存済みの結果は自動で再計算・上書きしません。保存結果の再計算専用操作は現在提供していません。旧版の結果と現在の計算では値が異なる場合があります。</p>
    {calculation?.retainedSymbols && <p>色・数字・羅針盤には初回に保存した内容を引き継いでいます。</p>}
    {calculation?.assumptions.map(assumption => <p key={assumption}>{assumption}</p>)}
    <p>計算結果の更新は科学的な予測精度の証明ではありません。鑑定文はAIによる解釈を含みます。</p>
  </aside>;
}
