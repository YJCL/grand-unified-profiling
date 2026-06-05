import { NextResponse } from 'next/server';

// 月齢計算（簡易版）
function getMoonAge(date: Date): number {
    const known = new Date('2000-01-06'); // 既知の新月
    const diff = (date.getTime() - known.getTime()) / (1000 * 60 * 60 * 24);
    return diff % 29.53;
}

// バイオリズム計算
function getBiorhythm(birthDate: Date, targetDate: Date) {
    const days = (targetDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
    return {
        physical:     Math.sin((2 * Math.PI * days) / 23),
        emotional:    Math.sin((2 * Math.PI * days) / 28),
        intellectual: Math.sin((2 * Math.PI * days) / 33),
    };
}

// 月齢から運気タイプを返す
function getMoonPhase(age: number): { label: string; bonus: number } {
    if (age < 1.5)  return { label: '新月', bonus: 8 };   // 新しい始まり
    if (age < 7.5)  return { label: '上弦', bonus: 5 };   // 成長・行動
    if (age < 14.5) return { label: '満月前', bonus: 3 }; // 高まり
    if (age < 15.5) return { label: '満月', bonus: 7 };   // 完成・開花
    if (age < 22.5) return { label: '下弦', bonus: 2 };   // 整理・手放し
    return              { label: '晦日月', bonus: 4 };    // 内省・準備
}

// 総合スコア算出（0〜100）
function calcScore(birthDate: Date, targetDate: Date): number {
    const bio = getBiorhythm(birthDate, targetDate);
    const moonAge = getMoonAge(targetDate);
    const moon = getMoonPhase(moonAge);

    // バイオリズム3軸の平均（-1〜1）→ 0〜50に変換
    const bioAvg = (bio.physical * 0.4 + bio.emotional * 0.35 + bio.intellectual * 0.25);
    const bioScore = Math.round((bioAvg + 1) * 25);

    // 月齢ボーナス（0〜10）
    const moonScore = moon.bonus;

    // 曜日リズム（日曜=高め、水曜=低め など微細調整）
    const dayOfWeek = targetDate.getDay();
    const dayBonus = [5, 2, 3, 0, 3, 5, 4][dayOfWeek];

    // 合計して 35〜100 の範囲に正規化
    const raw = bioScore + moonScore + dayBonus;
    return Math.max(35, Math.min(100, raw));
}

export type DayScore = {
    date: string;   // YYYY-MM-DD
    score: number;  // 0〜100
    moon: string;   // 月相ラベル
    phase: 'attack' | 'defense'; // 攻め/守り
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const birthDate = searchParams.get('birthDate');
    const range = parseInt(searchParams.get('range') || '30'); // 日数

    if (!birthDate) {
        return NextResponse.json({ error: 'birthDate required' }, { status: 400 });
    }

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
        return NextResponse.json({ error: 'Invalid birthDate' }, { status: 400 });
    }

    const scores: DayScore[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日を含む前後の範囲で計算
    const start = new Date(today);
    start.setDate(today.getDate() - Math.floor(range / 4)); // 過去1週間ほど

    for (let i = 0; i < range; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const score = calcScore(birth, d);
        const moonAge = getMoonAge(d);
        const moon = getMoonPhase(moonAge);
        scores.push({
            date: d.toISOString().split('T')[0],
            score,
            moon: moon.label,
            phase: score >= 60 ? 'attack' : 'defense',
        });
    }

    return NextResponse.json(scores);
}
