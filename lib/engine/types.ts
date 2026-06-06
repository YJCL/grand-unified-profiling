// ─────────────────────────────────────────────────────────────
//  Grand Unified Profiling — 計算エンジンの統一データ構造
//
//  すべての占術モジュールは「決定論的な計算結果」をこの構造に詰める。
//  LLM はこの構造を受け取り、計算ではなく「統合・解釈」だけを担う。
// ─────────────────────────────────────────────────────────────

export type Element5 = '木' | '火' | '土' | '金' | '水';
export type YinYang = '陽' | '陰';

// ── 出生データ（計算の入力） ──────────────────────────────
export type BirthInput = {
  name?: string;
  birthDate: string;   // 'YYYY-MM-DD'
  birthTime?: string;  // 'HH:mm'（不明なら未指定 → 正午と仮定）
  birthPlace?: string; // 自由入力地名
  lat?: number;        // 緯度（ジオコーディング後）
  lon?: number;        // 経度
  tzOffsetMinutes?: number; // 出生地のUTCオフセット（分）。未指定なら +540(JST)と仮定
  gender?: string;
};

// ── 数秘術 ────────────────────────────────────────────────
export type Numerology = {
  lifePath: number;       // ライフパス（運命数）
  birthday: number;       // 誕生数
  expression?: number;    // 表現数（姓名のローマ字が必要）
  soulUrge?: number;      // 魂の数（母音）
  personality?: number;   // 人格数（子音）
  isMaster: { lifePath: boolean }; // マスターナンバー(11/22/33)判定
};

// ── 九星気学 ──────────────────────────────────────────────
export type Star = { num: number; name: string };
export type NineStar = {
  main: Star;          // 本命星
  monthly: Star;       // 月命星
};

// ── 干支・四柱推命 ────────────────────────────────────────
export type Pillar = {
  stem: string;        // 天干（甲〜癸）
  branch: string;      // 地支（子〜亥）
  element: Element5;    // 天干の五行
  yinYang: YinYang;    // 天干の陰陽
  animal: string;      // 地支の動物
  sexagenary: string;  // 干支（例: 甲子）
};
export type FourPillars = {
  year: Pillar;
  month: Pillar;
  day: Pillar;         // 日柱（命式の主体）
  hour?: Pillar;       // 時柱（出生時刻が必要）
  dayMaster: { stem: string; element: Element5; yinYang: YinYang }; // 日干＝自分の本質
};

// ── 干支ベースの十二支占い（簡易） ───────────────────────
export type ChineseZodiac = {
  animal: string;      // 十二支の動物
  element: Element5;    // 年干の五行
  yinYang: YinYang;
  sexagenary: string;  // 年の干支
};

// ── 西洋占星術 ────────────────────────────────────────────
export type PlanetPosition = {
  planet: string;        // 天体名（日本語）
  sign: string;          // 星座（日本語）
  degree: number;        // 星座内の度数 0〜30
  longitude: number;     // 黄経 0〜360
  retrograde: boolean;   // 逆行
  sabian: { num: number; sign: string; degreeInSign: number }; // サビアン度数ポインタ
};
export type Aspect = {
  a: string;             // 天体A
  b: string;             // 天体B
  type: string;          // 合/セクスタイル/スクエア/トライン/オポジション
  orb: number;           // 許容誤差からのズレ（度）
};
export type WesternAstrology = {
  planets: PlanetPosition[];
  sun: { sign: string; degree: number };
  moon: { sign: string; degree: number };
  ascendant?: { sign: string; degree: number; longitude: number }; // 出生時刻・出生地が必要
  midheaven?: { sign: string; degree: number; longitude: number };
  aspects: Aspect[];
  hasAscendant: boolean;
};

// ── ヒューマンデザイン ────────────────────────────────────
export type HDActivation = {
  body: string;          // 天体名
  gate: number;          // ゲート(1〜64)
  line: number;          // ライン(1〜6)
};
export type HumanDesign = {
  type: string;          // マニフェスター/ジェネレーター/MG/プロジェクター/リフレクター
  authority: string;     // 権威（意思決定の中枢）
  profile: string;       // プロファイル（例: 1/3）
  definedCenters: string[];
  channels: string[];    // 成立したチャネル（例: "34-20"）
  personality: HDActivation[]; // 意識（出生時）
  design: HDActivation[];      // 無意識（出生88°前）
  incomplete: boolean;   // 出生時刻が無く精度が落ちる場合true
};

// ── 宿曜 ──────────────────────────────────────────────────
export type Sukuyo = {
  mansion: string;       // 本命宿（27宿）
  index: number;         // 0〜26（昴宿=0）
  group: string;         // 三九の秘法などで使う系統
  method: string;        // 算出方法の注記
};

// ── 静的プロフィール（生涯不変の計算結果） ───────────────
export type GrandProfile = {
  meta: {
    birthDate: string;
    birthTime?: string;
    hasExactTime: boolean;
    birthPlace?: string;
    lat?: number;
    lon?: number;
    generatedAt: string;
  };
  numerology: Numerology;
  nineStar: NineStar;
  fourPillars: FourPillars;
  chineseZodiac: ChineseZodiac;
  westernAstrology: WesternAstrology;
  humanDesign: HumanDesign;
  sukuyo: Sukuyo;
};

// ── 動的な「今日」の状態（日々変化する計算結果） ─────────
export type Biorhythm = {
  physical: number;     // -1〜1
  emotional: number;    // -1〜1
  intellectual: number; // -1〜1
};
export type MoonState = {
  age: number;          // 月齢（0〜29.53）
  phaseName: string;    // 月相名
  illumination: number; // 輝面比 0〜1
  phaseAngle: number;   // 0=新月,90=上弦,180=満月,270=下弦
};
export type TransitHit = {
  transiting: string;   // 運行中の天体
  natal: string;        // 出生図の感受点
  aspect: string;       // 合/セクスタイル/スクエア/トライン/オポジション
  orb: number;          // 正確角からのズレ（度）
  harmony: '吉' | '凶' | '中';
};
export type DailyState = {
  date: string;
  score: number;        // 0〜100（出生図を踏まえた総合運気）
  phase: 'attack' | 'defense'; // 攻め / 守り
  biorhythm: Biorhythm;
  moon: MoonState;
  transits: TransitHit[]; // 今日効いている主要トランジット
  sukuyoDay: string;      // 今日の宿
};
