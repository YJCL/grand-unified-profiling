'use client';

// THESIS: 十の行動場面から、強みの名前ではなく「どう使う人か」を立体的に見つける。
// OWN-WORLD: Orbaの夜、暖かな結果紙、希少な金、観測軌道、明朝の一つの主文を継承する。
// STORY: 自然な行動を思い出す → 十の場面を選ぶ → 主傾向と副傾向を受け取る → 結果を残す／本編で深める。
// FIRST VIEWPORT: 左にわかりやすい約束と開始、右に十の観測点を持つ一つの装置。主CTAは折り目より上。
// FORM: Constellation triage expanded into a ten-point behavioral instrument inside Orba's Celestial Instrument world.

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Copy, Download, MessageCircle, RotateCcw, Share2 } from 'lucide-react';
import { OrbaMark } from '@/app/components/OrbaMark';
import { BrandOrb } from '@/app/components/BrandOrb';
import { track } from '@/lib/analytics';
import {
  STRENGTH_RESULT_IDS,
  STRENGTH_RESULTS,
  type StrengthResult,
  type StrengthResultId,
} from './strengths-data';

export type { StrengthResultId } from './strengths-data';

type Phase = 'intro' | 'questions' | 'result';
type Scores = Partial<Record<StrengthResultId, number>>;
type AnswerOption = { label: string; scores: Scores };
type Question = { prompt: string; note: string; options: AnswerOption[] };

const QUESTIONS: Question[] = [
  {
    prompt: '何かを始めるとき、最初にすることは？',
    note: '理想ではなく、普段の自分に近いものを選んでください。',
    options: [
      { label: 'やることを分けて、順番を決める', scores: { organizer: 3, explorer: 1 } },
      { label: '周りの様子や反応を見る', scores: { observer: 3, connector: 1 } },
      { label: 'まず一つ試してみる', scores: { starter: 3, creator: 1 } },
      { label: '面白いやり方を考える', scores: { creator: 3, explorer: 1 } },
    ],
  },
  {
    prompt: '誰かが困っていたら、どうすることが多い？',
    note: '自然にやっている行動を思い出してみてください。',
    options: [
      { label: '状況を整理して、次にやることを伝える', scores: { organizer: 3, starter: 1 } },
      { label: 'まず話を聞いて、気持ちを受け取る', scores: { connector: 3, observer: 1 } },
      { label: '本人が気づいていない変化を見つける', scores: { observer: 3, explorer: 1 } },
      { label: '一緒に手を動かして、きっかけをつくる', scores: { starter: 3, connector: 1 } },
    ],
  },
  {
    prompt: '新しいアイデアを思いついたら？',
    note: '思いついた直後の動きに近いものを選びます。',
    options: [
      { label: 'メモして、もっと発想を広げる', scores: { creator: 3, explorer: 1 } },
      { label: '本当に使えるか、詳しく調べる', scores: { explorer: 3, organizer: 1 } },
      { label: '誰かに話して、反応を確かめる', scores: { connector: 3, creator: 1 } },
      { label: '小さな形にして、すぐ試す', scores: { starter: 3, creator: 1 } },
    ],
  },
  {
    prompt: '予定外のことが起きたら？',
    note: '落ち着いたあとではなく、最初の反応を選んでください。',
    options: [
      { label: '優先順位を決め直す', scores: { organizer: 3, starter: 1 } },
      { label: '周りがどう感じているかを見る', scores: { observer: 3, connector: 1 } },
      { label: '何が起きたのか、事実を確かめる', scores: { explorer: 3, organizer: 1 } },
      { label: '別のやり方を考えて切り替える', scores: { creator: 3, starter: 1 } },
    ],
  },
  {
    prompt: '人から頼まれることが多いのは？',
    note: '上手にできることより、なぜか任されることを選びます。',
    options: [
      { label: '複雑な話を、わかりやすくまとめること', scores: { organizer: 3, connector: 1 } },
      { label: '相手の変化や困りごとに気づくこと', scores: { observer: 3, connector: 1 } },
      { label: '止まっていることを前に進めること', scores: { starter: 3, organizer: 1 } },
      { label: '新しい案や別の見方を出すこと', scores: { creator: 3, explorer: 1 } },
    ],
  },
  {
    prompt: 'いちばん集中しやすいのは？',
    note: '時間を忘れやすい場面に近いものを選んでください。',
    options: [
      { label: '一人で静かに、考えを整理するとき', scores: { organizer: 3, explorer: 1 } },
      { label: '一対一で、じっくり話すとき', scores: { connector: 3, observer: 1 } },
      { label: '手を動かしながら、試しているとき', scores: { starter: 3, creator: 1 } },
      { label: '知らないことを、深く調べているとき', scores: { explorer: 3, creator: 1 } },
    ],
  },
  {
    prompt: '話し合いの場では、どんな役になりやすい？',
    note: '頼まれなくても自然にしていることを選びます。',
    options: [
      { label: '話をまとめて、論点をはっきりさせる', scores: { organizer: 3, explorer: 1 } },
      { label: '言葉に出ていない空気を読む', scores: { observer: 3, connector: 1 } },
      { label: '違う意見の間をつなぐ', scores: { connector: 3, observer: 1 } },
      { label: '次に何をするかを決める', scores: { starter: 3, organizer: 1 } },
    ],
  },
  {
    prompt: '迷ったとき、決め手になるのは？',
    note: '最後に「これなら決められる」と思うものを選びます。',
    options: [
      { label: '条件を並べたときの、納得できる順番', scores: { organizer: 3, explorer: 1 } },
      { label: '自分や相手が感じていること', scores: { observer: 2, connector: 2 } },
      { label: '調べて確かめた事実や根拠', scores: { explorer: 3, organizer: 1 } },
      { label: 'やってみたいと思える可能性', scores: { creator: 3, starter: 1 } },
    ],
  },
  {
    prompt: 'うまくいかなかったときは？',
    note: '立て直すために、最初にすることを選んでください。',
    options: [
      { label: '原因を調べて、何が違ったかを確かめる', scores: { explorer: 3, observer: 1 } },
      { label: '手順や役割を組み直す', scores: { organizer: 3, starter: 1 } },
      { label: 'やり方を変えて、もう一度試す', scores: { starter: 3, creator: 1 } },
      { label: '誰かと話して、別の見方をもらう', scores: { connector: 3, observer: 1 } },
    ],
  },
  {
    prompt: '終わったあと、いちばん満足するのは？',
    note: '褒められたことより、自分の中でうれしいことを選びます。',
    options: [
      { label: '複雑だったことが、すっきり整理できた', scores: { organizer: 3, explorer: 1 } },
      { label: '誰かが安心したり、話しやすくなった', scores: { connector: 2, observer: 2 } },
      { label: '止まっていたことが、前に進んだ', scores: { starter: 3, organizer: 1 } },
      { label: '今までにない見方や方法が見つかった', scores: { creator: 3, explorer: 1 } },
    ],
  },
];

type Profile = {
  primary: StrengthResult;
  secondary?: StrengthResult;
  ranking: Array<{ id: StrengthResultId; score: number; percent: number }>;
};

function profileFromAnswers(answers: AnswerOption[]): Profile {
  const scores = Object.fromEntries(STRENGTH_RESULT_IDS.map((id) => [id, 0])) as Record<StrengthResultId, number>;
  const recent: StrengthResultId[] = [];

  answers.forEach((answer) => {
    Object.entries(answer.scores).forEach(([id, value]) => {
      const resultId = id as StrengthResultId;
      scores[resultId] += value || 0;
      recent.unshift(resultId);
    });
  });

  const total = Math.max(1, Object.values(scores).reduce((sum, score) => sum + score, 0));
  const ranking = STRENGTH_RESULT_IDS
    .map((id) => ({ id, score: scores[id], percent: Math.round((scores[id] / total) * 100) }))
    .sort((a, b) => b.score - a.score || recent.indexOf(a.id) - recent.indexOf(b.id));

  return {
    primary: STRENGTH_RESULTS[ranking[0].id],
    secondary: STRENGTH_RESULTS[ranking[1].id],
    ranking,
  };
}

async function downloadResultCard(result: StrengthResult) {
  const imagePath = `/share/strengths/${result.id}.png`;
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `orba-strength-${result.id}.png`;
    link.href = objectUrl;
    link.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(imagePath, '_blank', 'noopener,noreferrer');
  }
}

export function StrengthsDiagnosis({
  initialSharedResult,
  initialSharedSecondary,
}: {
  initialSharedResult?: StrengthResultId;
  initialSharedSecondary?: StrengthResultId;
}) {
  const [phase, setPhase] = useState<Phase>(initialSharedResult ? 'result' : 'intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerOption[]>([]);
  const [sharedLanding, setSharedLanding] = useState(Boolean(initialSharedResult));
  const [copyLabel, setCopyLabel] = useState('投稿文をコピー');

  const profile = useMemo<Profile>(() => {
    if (answers.length) return profileFromAnswers(answers);
    const primary = STRENGTH_RESULTS[initialSharedResult || 'organizer'];
    const secondary = initialSharedSecondary ? STRENGTH_RESULTS[initialSharedSecondary] : undefined;
    return { primary, secondary, ranking: [] };
  }, [answers, initialSharedResult, initialSharedSecondary]);

  const result = profile.primary;
  const secondary = profile.secondary;

  useEffect(() => {
    track('diagnosis_view', { diagnosis: 'strengths' });
    if (initialSharedResult) {
      track('share_landing_view', { diagnosis: 'strengths', result: initialSharedResult, secondary: initialSharedSecondary });
    }
  }, [initialSharedResult, initialSharedSecondary]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase, step]);

  const start = () => {
    setPhase('questions');
    setStep(0);
    setAnswers([]);
    track('diagnosis_start', { diagnosis: 'strengths', questions: QUESTIONS.length });
  };

  const answer = (answerOption: AnswerOption, optionIndex: number) => {
    const next = [...answers, answerOption];
    setAnswers(next);
    track('diagnosis_answer', { diagnosis: 'strengths', question: step + 1, option: optionIndex + 1 });
    if (step === QUESTIONS.length - 1) {
      const completed = profileFromAnswers(next);
      setPhase('result');
      track('diagnosis_complete', {
        diagnosis: 'strengths',
        result: completed.primary.id,
        secondary: completed.secondary?.id,
        questions: QUESTIONS.length,
      });
    } else {
      setStep((current) => current + 1);
    }
  };

  const resultQuery = `result=${result.id}${secondary ? `&sub=${secondary.id}` : ''}`;
  const shareUrl = `https://orba.life/diagnosis/strengths?${resultQuery}&utm_source=orba_share&utm_medium=earned&utm_campaign=strengths_diagnosis`;
  const hashtags = '#Orba #強み診断 #自己分析';
  const shareText = [
    `10問でわかった、私の強みタイプは「${result.title}」でした。`,
    secondary ? `もう一つ強く出たのは「${secondary.title}」。` : '',
    'あなたはどのタイプ？',
    hashtags,
  ].filter(Boolean).join('\n');
  const fullShareText = `${shareText}\n${shareUrl}`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(fullShareText)}`;
  const lineHref = `https://line.me/R/msg/text/?${encodeURIComponent(fullShareText)}`;

  const shareNative = async () => {
    track('share_click', { diagnosis: 'strengths', result: result.id, secondary: secondary?.id, method: 'native' });
    if (navigator.share) {
      await navigator.share({ title: 'Orba 10問強み診断', text: shareText, url: shareUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(fullShareText);
      setCopyLabel('コピーしました');
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(fullShareText);
    setCopyLabel('コピーしました');
    track('share_click', { diagnosis: 'strengths', result: result.id, secondary: secondary?.id, method: 'copy' });
  };

  const reset = () => {
    setPhase('intro');
    setStep(0);
    setAnswers([]);
    setSharedLanding(false);
    setCopyLabel('投稿文をコピー');
    window.history.replaceState({}, '', '/diagnosis/strengths');
  };

  const startHref = `/start?utm_source=orba_diagnosis&utm_medium=owned_tool&utm_campaign=strengths_diagnosis&utm_content=${result.id}&diagnosis_result=${result.id}`;

  return (
    <main className={`orba-mini-diagnosis is-${phase}`}>
      <header className="orba-mini-diagnosis__header">
        <Link href="/" aria-label="Orbaトップへ"><OrbaMark /></Link>
        <Link href="/insights/strengths-are-hard-to-see"><ArrowLeft size={15} /> 強みの記事へ戻る</Link>
      </header>

      {phase === 'intro' && (
        <section className="orba-mini-diagnosis__intro">
          <div className="orba-mini-diagnosis__intro-copy">
            <h1>あなたの強みは、<br />どう使われる？</h1>
            <p>10問に答えると、普段の行動から「得意な動き方」と「力が出やすい環境」がわかります。</p>
            <button type="button" onClick={start} className="orba-mini-diagnosis__primary">
              10問の診断をはじめる <ArrowRight size={17} />
            </button>
            <span>登録不要・無料・約2〜3分</span>
          </div>
          <div className="orba-signal-instrument" aria-label="十の行動場面を観測する装置">
            <div className="orba-signal-instrument__orb" aria-hidden="true"><BrandOrb /></div>
            <div className="orba-signal-instrument__core"><strong>10</strong><span>OBSERVATIONS</span></div>
            <div className="orba-signal-instrument__orbit orbit-one"><span>始め方</span></div>
            <div className="orba-signal-instrument__orbit orbit-two"><span>人との関わり</span></div>
            <div className="orba-signal-instrument__orbit orbit-three"><span>考え方</span></div>
            <div className="orba-signal-instrument__orbit orbit-four"><span>力が出る環境</span></div>
          </div>
        </section>
      )}

      {phase === 'questions' && (
        <section className="orba-mini-diagnosis__question" aria-live="polite">
          <div className="orba-mini-diagnosis__progress">
            <span>質問 {step + 1} / {QUESTIONS.length}</span>
            <ol aria-hidden="true">
              {QUESTIONS.map((_, index) => (
                <li key={index} className={index < step ? 'is-done' : index === step ? 'is-current' : ''} />
              ))}
            </ol>
          </div>
          <div className="orba-mini-diagnosis__question-stage">
            <div className="orba-mini-diagnosis__question-number" aria-hidden="true">
              <span>{String(step + 1).padStart(2, '0')}</span><i />
            </div>
            <div className="orba-mini-diagnosis__question-body" key={step}>
              <h1>{QUESTIONS[step].prompt}</h1>
              <p>{QUESTIONS[step].note}</p>
              <div className="orba-mini-diagnosis__options">
                {QUESTIONS[step].options.map((option, optionIndex) => (
                  <button key={option.label} type="button" onClick={() => answer(option, optionIndex)}>
                    <b>{String.fromCharCode(65 + optionIndex)}</b>
                    <span>{option.label}</span>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="orba-mini-diagnosis__back"
            onClick={step === 0 ? reset : () => { setAnswers((current) => current.slice(0, -1)); setStep((current) => current - 1); }}
          >
            <ArrowLeft size={14} /> {step === 0 ? '最初に戻る' : '一つ前へ'}
          </button>
        </section>
      )}

      {phase === 'result' && (
        <section className="orba-mini-diagnosis__result">
          <div className="orba-mini-diagnosis__result-paper">
            <h1>{result.title}</h1>
            <p className="orba-mini-diagnosis__result-lead">{result.lead}</p>
            {secondary && (
              <p className="orba-mini-diagnosis__secondary">
                もう一つ強く出たのは、<strong>{secondary.title}</strong>の傾向です。
              </p>
            )}

            {profile.ranking.length > 0 && (
              <div className="orba-mini-diagnosis__balance">
                <p>回答に表れた3つの傾向</p>
                {profile.ranking.slice(0, 3).map((item) => (
                  <div key={item.id}>
                    <span>{STRENGTH_RESULTS[item.id].title}</span>
                    <i><b style={{ transform: `scaleX(${item.score / Math.max(1, profile.ranking[0].score)})` }} /></i>
                    <em>{item.percent}%</em>
                  </div>
                ))}
              </div>
            )}

            <dl>
              <div><dt>得意なこと</dt><dd>{result.strength}</dd></div>
              <div><dt>力が出やすい環境</dt><dd>{result.condition}</dd></div>
              <div><dt>気をつけたいこと</dt><dd>{result.watchout}</dd></div>
              <div><dt>強みを活かすコツ</dt><dd>{result.nextStep}</dd></div>
              <div><dt>自分に聞いてみること</dt><dd>{result.question}</dd></div>
            </dl>
            <p className="orba-mini-diagnosis__caveat">これは10問の回答から見つけた傾向です。あなたを決めつける答えではありません。実際の経験に合う部分だけ、これからの選択に使ってください。</p>
          </div>

          <aside className="orba-mini-diagnosis__result-actions">
            <div className="orba-mini-diagnosis__deepening">
              <h2>もう少し詳しく見たいときは。</h2>
              <p>Orba本編では、あなたの言葉と出生情報を重ねて、共通点と違いを整理します。最初の結果まで登録は不要です。</p>
              <Link
                href={startHref}
                className="orba-mini-diagnosis__primary"
                onClick={() => track(sharedLanding ? 'share_landing_cta_click' : 'diagnosis_to_start', { diagnosis: 'strengths', result: result.id, secondary: secondary?.id })}
              >
                Orba本編で詳しく見る <ArrowRight size={17} />
              </Link>
            </div>

            <div className="orba-mini-diagnosis__share-panel">
              <h2>この結果を、きれいに残す。</h2>
              <p>画像と投稿文は用意できています。そのまま保存・投稿できます。</p>
              <div className="orba-mini-diagnosis__share-preview">
                <Image src={`/share/strengths/${result.id}.png`} width={1200} height={630} alt={`強み診断の結果「${result.title}」の共有画像`} priority />
              </div>
              <label htmlFor="orba-share-copy">投稿すると、この文章が入ります</label>
              <textarea id="orba-share-copy" value={fullShareText} readOnly rows={6} />
              <div className="orba-mini-diagnosis__share" aria-label="結果を保存・共有">
                <a href={xHref} target="_blank" rel="noreferrer" onClick={() => track('share_click', { diagnosis: 'strengths', result: result.id, secondary: secondary?.id, method: 'x' })}><span className="orba-share-x">X</span>Xに投稿</a>
                <a href={lineHref} target="_blank" rel="noreferrer" onClick={() => track('share_click', { diagnosis: 'strengths', result: result.id, secondary: secondary?.id, method: 'line' })}><MessageCircle size={16} />LINEで送る</a>
                <button type="button" onClick={async () => { await downloadResultCard(result); track('result_save', { diagnosis: 'strengths', result: result.id }); }}><Download size={16} />画像を保存</button>
                <button type="button" onClick={shareNative}><Share2 size={16} />その他で共有</button>
                <button type="button" onClick={copy}><Copy size={16} />{copyLabel}</button>
              </div>
            </div>

            <button type="button" className="orba-mini-diagnosis__retry" onClick={reset}><RotateCcw size={14} />もう一度答える</button>
          </aside>
        </section>
      )}

      <footer className="orba-mini-diagnosis__footer">
        <p>大切な判断を診断だけで決めず、自分の経験を整理するヒントとしてお使いください。</p>
        <div><Link href="/safety">AI利用と安全性</Link><Link href="/legal/privacy">プライバシー</Link><Link href="/contact">お問い合わせ</Link></div>
      </footer>
    </main>
  );
}
