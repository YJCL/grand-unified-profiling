export type Language = 'ja' | 'en' | 'es';

export type Question = {
  id: number;
  text: Record<Language, string>;
  optionA: Record<Language, string>;
  optionB: Record<Language, string>;
  type: string; // 'HumanDesign', 'Enneagram', etc.
};

export type CharacterType = 'fairy' | 'shaman' | 'sage' | 'friend' | 'cool' | 'burn';

export type UserProfile = {
  name: string;
  birthDate: string;
  birthTime: string; // HH:mm format
  birthPlace: string;
  gender: string;
  currentWorry: string;
  language: Language;
  characterType: CharacterType | '';
  mbti: string;
  enneagram: string;
  answers: { questionId: number; selected: 'A' | 'B' }[];
};

export type AnalysisResult = {
  summary?: string;   // シェア用の一言キャッチ
  coreNature: string; // 魂の本質
  strategy: string;   // 行動戦略
  timing: string;     // 今の運気
  advice: string;     // 具体的アドバイス
  dailyTheme: string; // 今日のテーマ
  luckyAction: string; // ラッキーアクション
};

export type DailyContent = {
  theme: string;
  guidance: string;
  timing: string;
  action: string;
  affirmation: string;
};
