export type AiSafetyCategory = 'crisis' | 'medical' | 'legal' | 'financial' | 'life_event' | 'personal_data';

export type AiSafetyInputDecision = {
  categories: AiSafetyCategory[];
  ruleIds: string[];
  action: 'allow' | 'redact' | 'block';
  blockReason?: 'crisis' | 'medical_prognosis';
  response?: string;
  sanitizedText: string;
};

export type AiSafetyOutputReview<T> = {
  value: T;
  flagged: boolean;
  ruleIds: string[];
};

const CRISIS_PATTERNS = [
  /死にたい/u,
  /消えたい/u,
  /自殺(?:したい|する|しよう|を考)/u,
  /自傷(?:したい|する|しよう)/u,
  /リスカ(?:したい|する|しよう)/u,
  /命を絶ちたい/u,
  /生きていたくない/u,
  /生きるの(?:が|は)(?:つらい|辛い|苦しい)/u,
  /もう(?:人生を|全部を|すべてを)?終わりにしたい/u,
];

const MEDICAL_WORDS = /(?:病気|病名|癌|がん|うつ|鬱|症状|手術|治療|薬|服薬|通院|余命|妊娠|流産)/u;
const MEDICAL_DECISION_WORDS = /(?:治る|完治|助かる|死ぬ|大丈夫|いつまで|効く|やめる|止める|中止|飲まない|受けるべき|しないべき|診断して|病名を当て)/u;
const LEGAL_WORDS = /(?:訴訟|弁護士|裁判|逮捕|違法|犯罪|慰謝料|告訴)/u;
const FINANCIAL_WORDS = /(?:投資|株|仮想通貨|暗号資産|FX|借金|ローン|ギャンブル|競馬|宝くじ)/iu;
const LIFE_EVENT_WORDS = /(?:離婚|退職|会社を辞|別れる|退学|絶縁)/u;

const PERSONAL_DATA_PATTERNS: { id: string; pattern: RegExp; replacement: string }[] = [
  { id: 'pii.email', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, replacement: '[メールアドレス]' },
  { id: 'pii.phone', pattern: /(?<!\d)(?:0\d{1,4}[-ー\s]?\d{1,4}[-ー\s]?\d{3,4})(?!\d)/gu, replacement: '[電話番号]' },
  { id: 'pii.postal', pattern: /〒?\s?\d{3}[-ー]\d{4}/gu, replacement: '[郵便番号]' },
  { id: 'pii.card', pattern: /(?<!\d)(?:\d[ -]?){13,19}(?!\d)/gu, replacement: '[番号情報]' },
];

const CRISIS_RESPONSE = `今は占いや鑑定ではなく、あなたの安全をいちばんに考えます。

もし今すぐ自分を傷つけるおそれがある、またはすでに傷つけた場合は、119へ連絡してください。できれば一人にならず、近くの信頼できる人に「今ひとりにしないで」と伝えてください。

電話で話せるなら「いのちSOS」0120-061-338（無料・毎日24時間）があります。電話以外の相談先も、厚生労働省「まもろうよ こころ」で探せます。
https://www.mhlw.go.jp/mamorouyokokoro/`;

const MEDICAL_RESPONSE = `病気が治るか、薬や治療を変えるべきかといった医療上の結論は、Orbaの鑑定では判断できません。症状や治療については、主治医や医療機関に確認してください。急な悪化や命に関わる不安がある場合は119へ連絡してください。`;

export const AI_SAFETY_PROMPT = `
## 安全性と透明性（世界観や口調より優先）
- 占術上の象徴や傾向は、自己理解と選択肢の整理に使う。未来、健康、生死、合否、恋愛結果、金銭的利益を事実として断定・保証しない。
- 「絶対」「必ず」「100%」「確実に」「間違いなく」など、結果を保証する表現を使わない。
- 医療・服薬・法律・投資・犯罪・緊急の安全に関する判断を代行しない。現実の情報と有資格の専門家を優先するよう案内する。
- 自傷や自殺の意図が疑われる相談には、占いや運勢の解釈を行わず、安全確保と公的相談先の利用を優先する。
- サービスのAI利用を尋ねられた場合は、文章生成と対話の一部に生成AIを利用していることを否定・隠蔽せず、「AI利用と安全性」ページを案内する。
`;

function normalize(text: string): string {
  return text.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

export function evaluateAiSafetyInput(rawText: string): AiSafetyInputDecision {
  const normalized = normalize(rawText);
  const categories = new Set<AiSafetyCategory>();
  const ruleIds = new Set<string>();

  if (CRISIS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    categories.add('crisis');
    ruleIds.add('input.crisis-intent');
    return {
      categories: [...categories],
      ruleIds: [...ruleIds],
      action: 'block',
      blockReason: 'crisis',
      response: CRISIS_RESPONSE,
      sanitizedText: '',
    };
  }

  if (MEDICAL_WORDS.test(normalized)) {
    categories.add('medical');
    ruleIds.add('input.medical-topic');
    if (MEDICAL_DECISION_WORDS.test(normalized)) {
      ruleIds.add('input.medical-prognosis');
      return {
        categories: [...categories],
        ruleIds: [...ruleIds],
        action: 'block',
        blockReason: 'medical_prognosis',
        response: MEDICAL_RESPONSE,
        sanitizedText: '',
      };
    }
  }

  if (LEGAL_WORDS.test(normalized)) categories.add('legal');
  if (FINANCIAL_WORDS.test(normalized)) categories.add('financial');
  if (LIFE_EVENT_WORDS.test(normalized)) categories.add('life_event');

  let sanitizedText = normalized;
  for (const item of PERSONAL_DATA_PATTERNS) {
    item.pattern.lastIndex = 0;
    if (item.pattern.test(sanitizedText)) {
      categories.add('personal_data');
      ruleIds.add(item.id);
      item.pattern.lastIndex = 0;
      sanitizedText = sanitizedText.replace(item.pattern, item.replacement);
    }
  }

  return {
    categories: [...categories],
    ruleIds: [...ruleIds],
    action: categories.has('personal_data') ? 'redact' : 'allow',
    sanitizedText,
  };
}

const OUTPUT_RULES: { id: string; pattern: RegExp; replacement: string }[] = [
  { id: 'output.medical-guarantee', pattern: /(?:絶対に|必ず|確実に|間違いなく)(?:病気は?|症状は?)?(?:治る|完治する)/gu, replacement: '回復の結果は断定できません' },
  { id: 'output.medication-order', pattern: /[^。！？\n]*(?:薬|服薬)[^。！？\n]*(?:やめて|やめるべき|中止して|飲まないで)[。！？]?/gu, replacement: '服薬の変更は自己判断せず、医師または薬剤師に確認してください。' },
  { id: 'output.death-prediction', pattern: /[^。！？\n]*(?:必ず死ぬ|死ぬ運命|余命は|自殺すべき)[。！？]?/gu, replacement: '生死に関する結果を占いで断定することはできません。' },
  { id: 'output.profit-guarantee', pattern: /[^。！？\n]*(?:絶対に|必ず|確実に)(?:儲かる|上がる|勝てる|当たる)[。！？]?/gu, replacement: '金銭的な結果を保証することはできません。' },
  { id: 'output.irreversible-order', pattern: /[^。！？\n]*(?:離婚|退職|別れ|絶縁)(?:するべき|しなさい|が正解)[。！？]?/gu, replacement: '大きな決断は、現実の条件と専門家の助言も確かめて慎重に選んでください。' },
  { id: 'output.absolute-claim', pattern: /(?:100[%％]|絶対に|間違いなく|確実に)(?=[^。！？\n]{0,24}(?:なる|できる|起きる|成功|失敗|合格|不合格|結婚|別れる))/gu, replacement: '可能性として' },
];

export function reviewAiGeneratedText(text: string): AiSafetyOutputReview<string> {
  let value = text;
  const ruleIds: string[] = [];
  for (const rule of OUTPUT_RULES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(value)) {
      ruleIds.push(rule.id);
      rule.pattern.lastIndex = 0;
      value = value.replace(rule.pattern, rule.replacement);
    }
  }
  return { value, flagged: ruleIds.length > 0, ruleIds };
}

export function reviewAiGeneratedValue<T>(input: T): AiSafetyOutputReview<T> {
  const ruleIds = new Set<string>();
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const reviewed = reviewAiGeneratedText(value);
      reviewed.ruleIds.forEach((id) => ruleIds.add(id));
      return reviewed.value;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item)]));
    }
    return value;
  };
  const value = walk(input) as T;
  return { value, flagged: ruleIds.size > 0, ruleIds: [...ruleIds] };
}
