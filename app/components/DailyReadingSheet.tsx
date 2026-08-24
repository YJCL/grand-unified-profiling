'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Crown, Loader2, Ticket, X } from 'lucide-react';
import type { DailyReadingContent } from '@/types';

type ReadingStatus = {
  reading: DailyReadingContent | null;
  tickets: number;
  included: boolean;
  launchFree: boolean;
  canCreate: boolean;
};

const SECTIONS: { key: keyof DailyReadingContent; label: string }[] = [
  { key: 'overall', label: '今日全体の流れ' },
  { key: 'work', label: '仕事・学び' },
  { key: 'relationships', label: '人との間' },
  { key: 'inner', label: '心の内側' },
  { key: 'timing', label: '動く時間、待つ時間' },
  { key: 'action', label: '今日の一歩' },
];

export function DailyReadingSheet({
  userId,
  onClose,
  onUpgrade,
  onTicketChange,
}: {
  userId: string;
  onClose: () => void;
  onUpgrade: () => void;
  onTicketChange?: (tickets: number) => void;
}) {
  const [status, setStatus] = useState<ReadingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/daily-reading?userId=${userId}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '今日の鑑定を確認できませんでした。');
        setStatus(data);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [userId]);

  const createReading = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/daily-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || '今日の鑑定を読みきれませんでした。');
      setStatus((current) => current ? { ...current, reading: data.reading, tickets: data.tickets, canCreate: true } : current);
      onTicketChange?.(data.tickets);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '今日の鑑定を読みきれませんでした。');
    } finally {
      setGenerating(false);
    }
  };

  const reading = status?.reading;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="orba-daily-reading"
      onClick={onClose}
    >
      <motion.section
        initial={{ y: 42, opacity: 0, filter: 'blur(8px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        exit={{ y: 28, opacity: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        className="orba-daily-reading__sheet"
        aria-labelledby="daily-reading-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <BookOpen aria-hidden="true" />
            <h2 id="daily-reading-title">今日の鑑定</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="今日の鑑定を閉じる"><X /></button>
        </header>

        {loading ? (
          <div className="orba-daily-reading__loading" role="status">
            <Loader2 aria-hidden="true" />
            <p>今日の輪郭を確かめています。</p>
          </div>
        ) : reading ? (
          <article className="orba-daily-reading__paper">
            <p className="orba-daily-reading__date">{reading.date.replaceAll('-', '.')}</p>
            <h3>{reading.title}</h3>
            <p className="orba-daily-reading__opening">{reading.opening}</p>
            <div className="orba-daily-reading__sections">
              {SECTIONS.map(({ key, label }) => (
                <section key={key}>
                  <h4>{label}</h4>
                  <p>{reading[key]}</p>
                </section>
              ))}
            </div>
            <blockquote>{reading.closing}</blockquote>
            <p className="orba-daily-reading__ai-note is-paper">
              この鑑定文はAIを用いて生成しています。重要な判断は、現実の情報や専門家の助言も確認してください。
              <Link href="/safety" target="_blank">AI利用と安全性</Link>
            </p>
          </article>
        ) : (
          <div className="orba-daily-reading__intro">
            <h3>今日を、ひとつの読み物に。</h3>
            <p>プロフィールと今日の星・暦を重ね、仕事、人との間、心の内側、動くタイミングまで丁寧に読み解きます。</p>
            <p className="orba-daily-reading__ai-note">
              占術計算はプログラムで行い、鑑定文の生成にAIを使用します。結果は未来や成果を保証するものではありません。
              <Link href="/safety" target="_blank">AI利用と安全性</Link>
            </p>

            {status?.included ? (
              <div className="orba-daily-reading__access is-included">
                <Crown aria-hidden="true" />
                <div>
                  <strong>{status.launchFree ? 'ローンチ記念で無料開放中' : 'Orba Plusに含まれています'}</strong>
                  <span>今日の鑑定はチケットを使いません。</span>
                </div>
              </div>
            ) : (
              <div className="orba-daily-reading__access">
                <Ticket aria-hidden="true" />
                <div>
                  <strong>鑑定チケット 1枚</strong>
                  <span>現在の残り {status?.tickets ?? 0}枚</span>
                </div>
              </div>
            )}

            {error && <p className="orba-daily-reading__error" role="alert">{error}</p>}
            {status?.canCreate ? (
              <button type="button" className="orba-daily-reading__primary" onClick={() => void createReading()} disabled={generating}>
                {generating ? <><Loader2 aria-hidden="true" /> 鑑定しています…</> : <>{status.included ? '今日の鑑定をひらく' : 'チケット1枚で鑑定する'} <ArrowRight aria-hidden="true" /></>}
              </button>
            ) : (
              <button type="button" className="orba-daily-reading__primary" onClick={onUpgrade}>
                Orba Plusを見る <ArrowRight aria-hidden="true" />
              </button>
            )}
            <p className="orba-daily-reading__note">生成後は、今日中なら何度でも読み返せます。</p>
          </div>
        )}

        {!reading && !loading && error && !status && (
          <button type="button" className="orba-daily-reading__secondary" onClick={onClose}>閉じる</button>
        )}
      </motion.section>
    </motion.div>
  );
}
