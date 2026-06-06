'use client';

// ─────────────────────────────────────────────────────────────
//  OrbField — 背景に漂う無数の小さな光のオーブ
//  「数ある無数のオーブの中から、君だけのパートナーを」の世界観。
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';

// 6つのパートナー色相を散りばめる
const HUES = [46, 8, 322, 250, 190, 150];

export function OrbField({ count = 24, className = '' }: { count?: number; className?: string }) {
  // 決定論的擬似乱数（SSRとクライアントで一致させる）
  const orbs = useMemo(() => {
    let seed = 20240607;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    return Array.from({ length: count }, (_, i) => {
      const hue = HUES[i % HUES.length];
      const size = 4 + rnd() * 12;
      return {
        hue,
        size,
        left: rnd() * 100,
        top: rnd() * 100,
        dx: `${(rnd() - 0.5) * 80}px`,
        dy: `${-30 - rnd() * 70}px`,
        dur: 14 + rnd() * 18,
        delay: -rnd() * 20,
        peak: 0.35 + rnd() * 0.45,
        blur: rnd() < 0.5 ? 0.5 : 1.5,
      };
    });
  }, [count]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {orbs.map((o, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${o.left}%`,
            top: `${o.top}%`,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle at 35% 30%, #fff, hsl(${o.hue} 85% 68%) 55%, transparent 100%)`,
            boxShadow: `0 0 ${o.size * 1.6}px hsla(${o.hue}, 85%, 65%, 0.6)`,
            filter: `blur(${o.blur}px)`,
            animation: `orb-float ${o.dur}s ease-in-out ${o.delay}s infinite`,
            ['--dx' as string]: o.dx,
            ['--dy' as string]: o.dy,
            ['--peak' as string]: String(o.peak),
          }}
        />
      ))}
    </div>
  );
}
