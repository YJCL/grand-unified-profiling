'use client';

// ─────────────────────────────────────────────────────────────
//  CharacterAvatar — パートナーオーブ
//  絵文字なし。色で明確に区別される、純粋な発光オーブ。
//  小さな伴星がまわる「生きた光の玉」。
// ─────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils';

export type CharacterType = 'fairy' | 'shaman' | 'sage' | 'friend' | 'cool' | 'burn';

// 6色を色相環で明確に分離
const ORBS: Record<CharacterType, { hue: number; sat: number; label: string }> = {
  fairy:  { hue: 46,  sat: 92, label: '妖精オーブ' },   // 金
  burn:   { hue: 8,   sat: 88, label: '焔オーブ' },     // 朱
  shaman: { hue: 322, sat: 70, label: '巫女オーブ' },   // 薔薇
  sage:   { hue: 250, sat: 68, label: '賢者オーブ' },   // 藍
  cool:   { hue: 190, sat: 78, label: '氷オーブ' },     // 青緑
  friend: { hue: 150, sat: 62, label: '親友オーブ' },   // 緑
};

export function CharacterAvatar({
  type,
  size = 120,
  speaking = false,
  className,
}: {
  type: CharacterType;
  size?: number;
  speaking?: boolean;
  className?: string;
}) {
  const { hue } = ORBS[type];
  // 賢者(紫)の柔らかさを基準に、彩度を全色で統一し色相だけ変える
  const sat = 68;
  const glow = `hsla(${hue}, ${sat}%, 60%, 0.45)`;
  // 輪郭を作らず、中心から一様に透明へ溶ける拡散グロー（はっきりした縁を出さない）
  const core = `radial-gradient(circle, #ffffff 0%, hsla(${hue} ${sat}% 80% / 0.95) 14%, hsla(${hue} ${sat}% 62% / 0.7) 32%, hsla(${hue} ${sat}% 54% / 0.28) 52%, transparent 72%)`;

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* 広く柔らかいグロー（呼吸） */}
      <div
        className="absolute rounded-full animate-aura"
        style={{
          width: size * 1.5, height: size * 1.5,
          background: `radial-gradient(circle, ${glow} 0%, transparent 60%)`,
          filter: `blur(${size * 0.1}px)`,
        }}
      />
      {/* 光の玉本体（縁をぼかして拡散・輪郭を消す） */}
      <div
        className="relative rounded-full"
        style={{
          width: size * 0.92, height: size * 0.92,
          background: core,
          filter: `blur(${size * 0.035}px)`,
          animation: `aura-breathe ${speaking ? 1.6 : 5}s ease-in-out infinite`,
        }}
      />
    </div>
  );
}

export const CHARACTER_META = ORBS;
