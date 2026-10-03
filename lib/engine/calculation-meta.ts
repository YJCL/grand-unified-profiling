import type { GrandProfile } from './types';

export type CalculationMetadata = {
  version: string;
  generatedAt: string;
  assumptions: string[];
  sourceBirth: { birthDate: string; birthTime?: string; birthPlace?: string; tzOffsetMinutes?: number };
  calendarRules: string[];
  retainedSymbols?: boolean;
};

export function calculationMetadata(profile: GrandProfile, retainedSymbols = false): CalculationMetadata {
  return {
    version: profile.meta.calculationVersion!,
    generatedAt: profile.meta.generatedAt,
    assumptions: profile.meta.calculationAssumptions || [],
    sourceBirth: { birthDate: profile.meta.birthDate, birthTime: profile.meta.birthTime, birthPlace: profile.meta.birthPlace, tzOffsetMinutes: profile.meta.tzOffsetMinutes },
    calendarRules: ['グレゴリオ暦を使用', '日柱は出生地の民用日付・0時で日替わり', '23時台の時干は当日の民用日付の日干から算出', '年柱は立春・月柱は節入り基準'],
    retainedSymbols,
  };
}
