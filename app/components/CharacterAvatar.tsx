'use client';

// ─────────────────────────────────────────────────────────────
//  CharacterAvatar — パートナーオーブ
//  絵文字なし。色で明確に区別される、純粋な発光オーブ。
//  小さな伴星がまわる「生きた光の玉」。
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type CharacterType = 'fairy' | 'shaman' | 'sage' | 'friend' | 'cool' | 'burn';

// 6色を色相環で明確に分離
const ORBS: Record<CharacterType, { hue: number; sat: number; label: string; tone: string }> = {
  fairy:  { hue: 46,  sat: 92, label: '妖精オーブ', tone: 'ふわっと優しく、無邪気に寄り添う' },   // 金
  burn:   { hue: 8,   sat: 88, label: '焔オーブ',   tone: '熱量高め、力強く背中を押す' },         // 朱
  shaman: { hue: 322, sat: 70, label: '巫女オーブ', tone: '凛として神秘的、言葉に重みがある' },   // 薔薇
  sage:   { hue: 250, sat: 68, label: '賢者オーブ', tone: '落ち着いて論理的、知的で包容力' },     // 藍
  cool:   { hue: 190, sat: 78, label: '氷オーブ',   tone: '端的でシャープ、的確な一言' },         // 青緑
  friend: { hue: 150, sat: 62, label: '親友オーブ', tone: 'フランクで等身大、一緒に考える' },     // 緑
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
  const style = {
    width: size,
    height: size,
    '--orb-hue': hue,
    '--orb-size': `${size}px`,
  } as CSSProperties;

  return (
    <div
      className={cn('orba-character-orb', speaking && 'is-speaking', className)}
      style={style}
      aria-hidden="true"
    >
      <span className="orba-character-orb__halo" />
      <span className="orba-character-orb__orbit"><i /></span>
      <span className="orba-character-orb__sphere">
        <i className="orba-character-orb__mineral" />
        <i className="orba-character-orb__shade" />
        <i className="orba-character-orb__glint" />
      </span>
    </div>
  );
}

export const CHARACTER_META = ORBS;
