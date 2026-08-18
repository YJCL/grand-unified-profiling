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

// 直感的な「色と数字」セクション。Sonnetが五行・星座から根拠付きで選定。
export type SignatureColor = {
  role: 'KEY' | 'ACCENT' | 'SHADOW';
  name: string;   // 色名（例: 夜明け前の紫紺）
  hex: string;    // #RRGGBB
  why: string;    // この色がこの人の核である理由
  use: string;    // どう使うと良いか
};
export type Signature = {
  lead: string;
  colors: SignatureColor[];           // KEY / ACCENT / SHADOW の3つ
  number: { main: number; sub: number; why: string };
  items: string[];                    // 象徴アイテム3つ
};

// 行動アドバイス「羅針盤」: 迷ったとき/不安なとき/踏み出したいとき
export type CompassCard = {
  title: string;
  word: string;       // お守りの一言
  steps: string[];    // 具体的アクション3つ
  anchor: string;     // 占術的な根拠の一言
};
export type Compass = {
  lead: string;
  lost: CompassCard;
  anxious: CompassCard;
  stepping: CompassCard;
};

export type AnalysisResult = {
  summary?: string;   // シェア用の一言キャッチ
  coreNature: string; // 魂の本質
  strategy: string;   // 行動戦略
  timing: string;     // 今の運気
  advice: string;     // 具体的アドバイス
  dailyTheme: string; // 今日のテーマ
  luckyAction: string; // ラッキーアクション
  // ── 拡張（v2 オンボ以降）。既存ユーザーの古い鑑定には無い場合あり = optional。
  signature?: Signature;
  compass?: Compass;
};

export type DailyContent = {
  theme: string;
  guidance: string;
  timing: string;
  action: string;
  affirmation: string;
};

export type DailyReadingContent = {
  date: string;
  title: string;
  opening: string;
  overall: string;
  work: string;
  relationships: string;
  inner: string;
  timing: string;
  action: string;
  closing: string;
};

export type DailyLogEnvelope = {
  daily?: DailyContent;
  reading?: DailyReadingContent;
};
