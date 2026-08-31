export const STRENGTH_RESULT_IDS = [
  'organizer',
  'observer',
  'starter',
  'connector',
  'explorer',
  'creator',
] as const;

export type StrengthResultId = (typeof STRENGTH_RESULT_IDS)[number];

export type StrengthResult = {
  id: StrengthResultId;
  title: string;
  lead: string;
  strength: string;
  condition: string;
  watchout: string;
  nextStep: string;
  question: string;
};

export const STRENGTH_RESULTS: Record<StrengthResultId, StrengthResult> = {
  organizer: {
    id: 'organizer',
    title: '道筋をつくる人',
    lead: '情報が散らかっているほど、何から手をつけるかを見つけるのが得意です。',
    strength: '複雑な話を分けて、順番や判断の基準をつくること。',
    condition: '考える時間があり、整理した過程も大切にされる環境。',
    watchout: '全部を整えてから動こうとして、最初の一歩が遅くなること。',
    nextStep: '完成形ではなく、まず「次にやる一つ」だけを決めると力が出やすくなります。',
    question: '最近、あなたが整理したことで、誰かが動きやすくなった場面はありますか？',
  },
  observer: {
    id: 'observer',
    title: '小さな変化に気づく人',
    lead: '人や場のわずかな違いを、ほかの人より少し早く受け取るタイプです。',
    strength: 'まだ言葉になっていない違和感や変化を見つけること。',
    condition: '急いで答えを出すより、よく見ることが認められる環境。',
    watchout: '周りの空気を受け取りすぎて、自分の気持ちが後回しになること。',
    nextStep: '気づいたことを抱え込まず、事実と自分の感想を分けて言葉にすると活かしやすくなります。',
    question: '最近、周りより先に気づいていた小さな変化は何でしたか？',
  },
  starter: {
    id: 'starter',
    title: '最初の一歩をつくる人',
    lead: '正解が見えなくても、小さく始めて流れをつくるのが得意です。',
    strength: '止まっている状況に、試せる最初の一歩を置くこと。',
    condition: '試行錯誤が許され、動きながら直せる環境。',
    watchout: '動く速さが先に立ち、周りの準備や説明が追いつかないこと。',
    nextStep: '始める前に「何を確かめるための一歩か」を一言にすると、行動が成果につながりやすくなります。',
    question: '最近、あなたが先に動いたことで、周りも動き始めたことはありますか？',
  },
  connector: {
    id: 'connector',
    title: '人の間をつなぐ人',
    lead: '違う考えを持つ人の間に入り、話しやすい空気をつくるタイプです。',
    strength: '相手の話を受け取り、共通点や次に話すべきことを見つけること。',
    condition: '一人で競うより、誰かと一緒に進めることが大切にされる環境。',
    watchout: '全員に合わせようとして、自分の意見が見えにくくなること。',
    nextStep: '人をつなぐ前に、自分はどうしたいかを一度言葉にすると、調整力がさらに活きます。',
    question: '最近、あなたがいたことで話がまとまった場面はありましたか？',
  },
  explorer: {
    id: 'explorer',
    title: '深く確かめる人',
    lead: '表面の答えだけで終わらず、理由や仕組みまで知りたくなるタイプです。',
    strength: '疑問を掘り下げ、納得できる根拠や本質を見つけること。',
    condition: '急かされず、調べたり考えたりする時間が取れる環境。',
    watchout: 'もっと確かめたい気持ちが強くなり、決めるタイミングを逃すこと。',
    nextStep: '調べる前に「何がわかれば決められるか」を決めておくと、深さを行動へつなげられます。',
    question: '最近、深く調べたことで、最初の見方が変わったことはありますか？',
  },
  creator: {
    id: 'creator',
    title: '新しい見方をひらく人',
    lead: '当たり前に見えるものにも、別の組み合わせや可能性を見つけるタイプです。',
    strength: 'まだ形のないアイデアに、新しい見方や選択肢を与えること。',
    condition: '正解が一つに決まっておらず、自由に試せる余白がある環境。',
    watchout: '可能性が増えすぎて、一つに絞ることが苦しくなること。',
    nextStep: '思いついた案を「今すぐ試す」「あとで育てる」に分けると、発想が形になりやすくなります。',
    question: '最近、あなたの一言で、別のやり方が見つかったことはありますか？',
  },
};

const LEGACY_RESULT_MAP: Record<string, StrengthResultId> = {
  structure: 'organizer',
  sensitivity: 'observer',
  momentum: 'starter',
};

export function parseStrengthResultId(value?: string): StrengthResultId | undefined {
  if (!value) return undefined;
  if (STRENGTH_RESULT_IDS.includes(value as StrengthResultId)) return value as StrengthResultId;
  return LEGACY_RESULT_MAP[value];
}
