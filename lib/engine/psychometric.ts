// ─────────────────────────────────────────────────────────────
//  心理統計スコアリング（MBTI / エニアグラム）
//  出生データからは出せない「自己申告ベースの心理傾向」を、
//  設問への回答から実際にスコアリングする。
//  ※ 簡易診断。本格判定は外部サイトへ誘導する想定（ビジョン準拠）。
//  既にMBTI/エニアを知っているユーザーは直接入力でこれをスキップ可。
// ─────────────────────────────────────────────────────────────

import type { Language } from '@/types';

type Tri<T> = Record<Language, T>;
type MBTIAxis = 'EI' | 'SN' | 'TF' | 'JP';

type DiagOption = {
  label: Tri<string>;
  mbtiPole?: string;     // 'E'|'I'|'S'|'N'|'T'|'F'|'J'|'P'
  enneaType?: number;    // 1〜9
  value?: number;        // エニアの同意度（2=そう,1=少し,0=違う）
};
export type DiagQuestion = {
  id: number;
  category: 'mbti' | 'ennea';
  axis?: MBTIAxis;
  text: Tri<string>;
  options: DiagOption[];
};

export type Psychometric = {
  mbti: { type: string; axes: Record<MBTIAxis, { letter: string; strength: number }> };
  enneagram: { type: number; wing: number; label: string };
};

const t = (ja: string, en: string, es: string): Tri<string> => ({ ja, en, es });

// ── 設問バンク（簡易版・Phase 5でUI拡張＆翻訳精緻化） ──────
export const DIAGNOSTIC_QUESTIONS: DiagQuestion[] = [
  // MBTI: E/I
  { id: 1, category: 'mbti', axis: 'EI', text: t('休日に元気が出るのは？', 'What energizes you on a day off?', '¿Qué te da energía en un día libre?'),
    options: [
      { label: t('人と会って話す', 'Meeting and talking with people', 'Reunirte y hablar con gente'), mbtiPole: 'E' },
      { label: t('一人で静かに過ごす', 'Quiet time alone', 'Tiempo tranquilo a solas'), mbtiPole: 'I' },
    ] },
  { id: 2, category: 'mbti', axis: 'EI', text: t('考えごとは？', 'You think best by...', 'Piensas mejor...'),
    options: [
      { label: t('声に出して話しながら整理', 'Talking it out loud', 'Hablándolo en voz alta'), mbtiPole: 'E' },
      { label: t('頭の中でじっくり', 'Reflecting internally', 'Reflexionando por dentro'), mbtiPole: 'I' },
    ] },
  // MBTI: S/N
  { id: 3, category: 'mbti', axis: 'SN', text: t('興味を持つのは？', 'You are drawn to...', 'Te atrae...'),
    options: [
      { label: t('具体的な事実・経験', 'Concrete facts and experience', 'Hechos y experiencia concretos'), mbtiPole: 'S' },
      { label: t('possibility・全体像・理論', 'Possibilities and patterns', 'Posibilidades y patrones'), mbtiPole: 'N' },
    ] },
  { id: 4, category: 'mbti', axis: 'SN', text: t('説明されて好きなのは？', 'You prefer explanations that are...', 'Prefieres explicaciones...'),
    options: [
      { label: t('手順が具体的', 'Step-by-step and practical', 'Paso a paso y prácticas'), mbtiPole: 'S' },
      { label: t('意味や背景の理論', 'Conceptual and big-picture', 'Conceptuales y globales'), mbtiPole: 'N' },
    ] },
  // MBTI: T/F
  { id: 5, category: 'mbti', axis: 'TF', text: t('判断の基準は？', 'You decide based on...', 'Decides según...'),
    options: [
      { label: t('論理と公平さ', 'Logic and fairness', 'Lógica y justicia'), mbtiPole: 'T' },
      { label: t('人の気持ちと調和', 'People and harmony', 'Las personas y la armonía'), mbtiPole: 'F' },
    ] },
  { id: 6, category: 'mbti', axis: 'TF', text: t('褒められて嬉しいのは？', 'You like to be seen as...', 'Te gusta que te vean como...'),
    options: [
      { label: t('「有能だね」', '"Competent"', '"Competente"'), mbtiPole: 'T' },
      { label: t('「優しいね」', '"Kind"', '"Amable"'), mbtiPole: 'F' },
    ] },
  // MBTI: J/P
  { id: 7, category: 'mbti', axis: 'JP', text: t('予定は？', 'You prefer plans that are...', 'Prefieres planes...'),
    options: [
      { label: t('きっちり決めたい', 'Settled and organized', 'Definidos y organizados'), mbtiPole: 'J' },
      { label: t('流れで柔軟に', 'Flexible and open', 'Flexibles y abiertos'), mbtiPole: 'P' },
    ] },
  { id: 8, category: 'mbti', axis: 'JP', text: t('締切は？', 'With deadlines you...', 'Con los plazos...'),
    options: [
      { label: t('早めに片付ける', 'Finish early', 'Terminas pronto'), mbtiPole: 'J' },
      { label: t('直前に集中する', 'Rush near the end', 'Te concentras al final'), mbtiPole: 'P' },
    ] },
];

// エニアグラム：9タイプの核心ステートメント（同意度で回答）
const ENNEA_STATEMENTS: Tri<string>[] = [
  t('正しさと改善にこだわり、いい加減が許せない', 'I value correctness and improvement', 'Valoro la corrección y la mejora'),       // 1
  t('人を助け、必要とされることに喜びを感じる', 'I love to help and be needed', 'Me encanta ayudar y ser necesitado'),             // 2
  t('成果と成功、他者からの評価を強く求める', 'I strive for success and recognition', 'Busco el éxito y el reconocimiento'),        // 3
  t('自分は特別で、人と違う感性を大切にする', 'I feel unique and value my individuality', 'Me siento único y valoro mi individualidad'), // 4
  t('知識を深め、一人で考える時間が必要だ', 'I need knowledge and solitude to think', 'Necesito conocimiento y soledad'),          // 5
  t('安全と信頼を重んじ、最悪に備えて備える', 'I seek security and prepare for risks', 'Busco seguridad y me preparo'),            // 6
  t('楽しさと新しい体験、自由を追い求める', 'I chase fun, novelty and freedom', 'Persigo diversión, novedad y libertad'),         // 7
  t('強くありたい、自分や仲間を守り主導する', 'I want to be strong and protect others', 'Quiero ser fuerte y proteger'),           // 8
  t('波風を立てず、平和と調和を保ちたい', 'I keep the peace and avoid conflict', 'Mantengo la paz y evito el conflicto'),         // 9
];
const ENNEA_LABELS = ['', '改革する人', '助ける人', '達成する人', '個性的な人', '探求する人', '忠実な人', '熱中する人', '挑戦する人', '平和をもたらす人'];

// エニア設問を生成（各タイプ1問、3段階の同意度）
for (let i = 0; i < 9; i++) {
  DIAGNOSTIC_QUESTIONS.push({
    id: 100 + i + 1,
    category: 'ennea',
    text: ENNEA_STATEMENTS[i],
    options: [
      { label: t('とてもそう思う', 'Strongly agree', 'Muy de acuerdo'), enneaType: i + 1, value: 2 },
      { label: t('少しそう思う', 'Somewhat', 'Algo'), enneaType: i + 1, value: 1 },
      { label: t('そう思わない', 'Not really', 'No mucho'), enneaType: i + 1, value: 0 },
    ],
  });
}

// ── スコアラー ────────────────────────────────────────────
export type DiagAnswer = { questionId: number; optionIndex: number };

const AXIS_POLES: Record<MBTIAxis, [string, string]> = {
  EI: ['E', 'I'], SN: ['S', 'N'], TF: ['T', 'F'], JP: ['J', 'P'],
};

export function computePsychometric(answers: DiagAnswer[]): Psychometric {
  const byId = new Map(DIAGNOSTIC_QUESTIONS.map((q) => [q.id, q]));
  const poleCount: Record<string, number> = {};
  const enneaScore: Record<number, number> = {};

  for (const ans of answers) {
    const q = byId.get(ans.questionId);
    if (!q) continue;
    const opt = q.options[ans.optionIndex];
    if (!opt) continue;
    if (opt.mbtiPole) poleCount[opt.mbtiPole] = (poleCount[opt.mbtiPole] || 0) + 1;
    if (opt.enneaType) enneaScore[opt.enneaType] = (enneaScore[opt.enneaType] || 0) + (opt.value ?? 1);
  }

  // MBTI 4軸
  const axes = {} as Record<MBTIAxis, { letter: string; strength: number }>;
  let typeStr = '';
  for (const axis of Object.keys(AXIS_POLES) as MBTIAxis[]) {
    const [a, b] = AXIS_POLES[axis];
    const ca = poleCount[a] || 0, cb = poleCount[b] || 0;
    const total = ca + cb || 1;
    const letter = ca >= cb ? a : b;
    axes[axis] = { letter, strength: Math.round((Math.abs(ca - cb) / total) * 100) };
    typeStr += letter;
  }

  // エニア：最高得点タイプ＋ウィング（隣接で高い方）
  let topType = 1, topScore = -1;
  for (let i = 1; i <= 9; i++) {
    const s = enneaScore[i] || 0;
    if (s > topScore) { topScore = s; topType = i; }
  }
  const left = topType === 1 ? 9 : topType - 1;
  const right = topType === 9 ? 1 : topType + 1;
  const wing = (enneaScore[left] || 0) >= (enneaScore[right] || 0) ? left : right;

  return {
    mbti: { type: typeStr, axes },
    enneagram: { type: topType, wing, label: ENNEA_LABELS[topType] },
  };
}
