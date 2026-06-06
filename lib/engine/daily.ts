// ─────────────────────────────────────────────────────────────
//  日々変化する状態：バイオリズム・正確な月相・トランジット運気・今日の宿
//  出生図（GrandProfile）を踏まえた“その人だけの今日”を算出する。
// ─────────────────────────────────────────────────────────────

import type { Biorhythm, MoonState, DailyState, GrandProfile } from './types';
import { moonPhaseInfo, toUTCDate } from './ephemeris';
import { computeTransits } from './transits';
import { computeSukuyo } from './sukuyo';

export function computeBiorhythm(birthDate: string, targetDate: Date): Biorhythm {
  const { date: birth } = toUTCDate(birthDate);
  const days = (targetDate.getTime() - birth.getTime()) / 86_400_000;
  return {
    physical: Math.sin((2 * Math.PI * days) / 23),
    emotional: Math.sin((2 * Math.PI * days) / 28),
    intellectual: Math.sin((2 * Math.PI * days) / 33),
  };
}

function phaseName(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return '新月';
  if (angle < 67.5) return '三日月';
  if (angle < 112.5) return '上弦';
  if (angle < 157.5) return '十三夜';
  if (angle < 202.5) return '満月';
  if (angle < 247.5) return '十八夜';
  if (angle < 292.5) return '下弦';
  return '晦日月';
}

export function computeMoonState(targetDate: Date): MoonState {
  const { phaseAngle, illumination } = moonPhaseInfo(targetDate);
  return {
    age: (phaseAngle / 360) * 29.530588853,
    phaseName: phaseName(phaseAngle),
    illumination,
    phaseAngle,
  };
}

// 出生図を踏まえた「今日」の総合状態
export function computeDailyState(profile: GrandProfile, target: Date = new Date()): DailyState {
  const birthDate = profile.meta.birthDate;
  const bio = computeBiorhythm(birthDate, target);
  const moon = computeMoonState(target);
  const { hits, score: transitScore } = computeTransits(profile.westernAstrology, target);

  // バイオリズム平均（-1〜1）→ 0〜100
  const bioAvg = bio.physical * 0.4 + bio.emotional * 0.35 + bio.intellectual * 0.25;
  const bioScore = (bioAvg + 1) * 50;

  // トランジット7割 + バイオリズム3割
  const score = Math.max(0, Math.min(100, Math.round(transitScore * 0.7 + bioScore * 0.3)));

  return {
    date: target.toISOString().split('T')[0],
    score,
    phase: score >= 55 ? 'attack' : 'defense',
    biorhythm: bio,
    moon,
    transits: hits.slice(0, 6),
    sukuyoDay: computeSukuyo(target).mansion,
  };
}

// カレンダー用：指定範囲の日次スコア
export function computeScoreRange(
  profile: GrandProfile,
  startOffsetDays: number,
  count: number
): { date: string; score: number; phase: 'attack' | 'defense'; moon: string }[] {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + startOffsetDays + i);
    const s = computeDailyState(profile, d);
    out.push({ date: s.date, score: s.score, phase: s.phase, moon: s.moon.phaseName });
  }
  return out;
}
