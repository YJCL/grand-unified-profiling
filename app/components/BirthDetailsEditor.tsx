'use client';

import { useState } from 'react';

export function BirthDetailsEditor({ userId, birthDate, birthTime, birthPlace }: {
  userId: string; birthDate: string | null; birthTime: string | null; birthPlace: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(birthDate || '');
  const [time, setTime] = useState(birthTime || '');
  const [place, setPlace] = useState(birthPlace || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return <div className="space-y-3">
    <button className="text-xs underline text-white/65" onClick={() => setOpen(value => !value)}>出生情報を編集</button>
    {open && <form className="space-y-3 text-xs text-white/70" onSubmit={async event => {
      event.preventDefault(); setSaving(true); setError('');
      try {
        const response = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId, birthDate: date, birthTime: time || null, birthPlace: place || null }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error || '保存できませんでした。'); return; }
        window.location.reload();
      } catch { setError('通信に失敗しました。'); }
      finally { setSaving(false); }
    }}>
      <p>出生時刻が不明なら空欄にできます。時刻や市区町村が不明な場合は、一部の項目を表示できません。</p>
      <label className="block">生年月日<input type="date" required value={date} onChange={event => setDate(event.target.value)} className="block w-full mt-1 bg-white/5 border border-white/20 rounded-lg p-2" /></label>
      <label className="block">出生時刻（不明なら空欄）<input type="time" value={time} onChange={event => setTime(event.target.value)} className="block w-full mt-1 bg-white/5 border border-white/20 rounded-lg p-2" /></label>
      <button type="button" className="underline" onClick={() => setTime('')}>出生時刻を不明にする</button>
      <label className="block">出生地（市区町村まで）<input placeholder="例：宮城県気仙沼市 / Paris, France" value={place} onChange={event => setPlace(event.target.value)} className="block w-full mt-1 bg-white/5 border border-white/20 rounded-lg p-2" /></label>
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      <button disabled={saving} className="btn-gold w-full py-2">{saving ? '保存中…' : '保存する'}</button>
    </form>}
  </div>;
}
