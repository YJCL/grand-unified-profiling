'use client';

// THESIS: 三つの観測信号を合わせ、自分の強みが使われる条件を一度体感する。診断カード一覧にはしない。
// OWN-WORLD: Orbaの夜、暖かな結果紙、希少な金、観測軌道、明朝の一つの主文を継承する。
// STORY: 強みが見えない理由を知る → 三つの信号を選ぶ → 仮説を受け取る → Orbaで深く確かめる。
// FIRST VIEWPORT: 左に短い約束と開始、右に三つの観測信号を持つ一つの装置。主CTAは折り目より上。
// FORM: Constellation triage, grounded candidate 3, seed 2c0f3df2. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Copy, Download, MessageCircle, RotateCcw, Share2 } from 'lucide-react';
import { OrbaMark } from '@/app/components/OrbaMark';
import { BrandOrb } from '@/app/components/BrandOrb';
import { track } from '@/lib/analytics';

export type StrengthResultId = 'structure' | 'sensitivity' | 'momentum';
type ResultId = StrengthResultId;
type Phase = 'intro' | 'questions' | 'result';

type Result = {
  id: ResultId;
  title: string;
  lead: string;
  strength: string;
  condition: string;
  question: string;
};

const RESULTS: Record<ResultId, Result> = {
  structure: {
    id: 'structure',
    title: '見通しをつくる人',
    lead: '散らばったものを分け、次に選べる形へ整えるとき、あなたの力は見えやすくなります。',
    strength: '混乱した情報や状況に、順序と判断基準をつくること。',
    condition: '考える時間があり、結論だけでなく整理の過程も価値になる環境。',
    question: '最近、誰かが迷っているときに自然と整理していたことは何ですか。',
  },
  sensitivity: {
    id: 'sensitivity',
    title: '変化を拾う人',
    lead: 'まだ言葉になっていない違和感や変化を受け取り、丁寧に言葉へ移すとき、あなたの力は見えやすくなります。',
    strength: '人や場の小さな変化を捉え、必要な調整を見つけること。',
    condition: '速い断定より観察が尊重され、一対一や少人数で深く関われる環境。',
    question: '最近、周囲より先に気づいた小さな変化は何でしたか。',
  },
  momentum: {
    id: 'momentum',
    title: '動きを起こす人',
    lead: '止まっている場に最初の一歩を置き、周囲が動ける状態をつくるとき、あなたの力は見えやすくなります。',
    strength: '不確実な状況でも、小さく始めて反応を確かめること。',
    condition: '試行錯誤が許され、行動から学ぶ速さが評価される環境。',
    question: '最近、誰も始めていないことに最初の一歩を置いた場面はありますか。',
  },
};

const QUESTIONS: Array<{
  prompt: string;
  note: string;
  options: Array<{ label: string; result: ResultId }>;
}> = [
  {
    prompt: '人から頼まれなくても、つい担っているのは？',
    note: '評価されたことではなく、自然にしていることを選んでください。',
    options: [
      { label: '散らばった情報を整理し、順序をつくる', result: 'structure' },
      { label: '相手や場の、小さな変化に気づく', result: 'sensitivity' },
      { label: '止まっているとき、最初の一歩を置く', result: 'momentum' },
    ],
  },
  {
    prompt: '比較的、力を使いやすい時間は？',
    note: '得意そうに見える場面ではなく、消耗しにくい場面を選びます。',
    options: [
      { label: '一人で深く考え、見通しが立っていく時間', result: 'structure' },
      { label: '一対一で、言葉や温度を受け取る時間', result: 'sensitivity' },
      { label: '人や役割が動き、反応が返ってくる時間', result: 'momentum' },
    ],
  },
  {
    prompt: '正解がない場面で、最初にすることは？',
    note: '理想ではなく、実際の自分にいちばん近いものを選んでください。',
    options: [
      { label: '情報を集めて、条件を分ける', result: 'structure' },
      { label: '自分と相手の違和感を確かめる', result: 'sensitivity' },
      { label: '小さく試して、反応を見る', result: 'momentum' },
    ],
  },
];

function resultFromAnswers(answers: ResultId[]): Result {
  const scores: Record<ResultId, number> = { structure: 0, sensitivity: 0, momentum: 0 };
  answers.forEach((answer) => { scores[answer] += 1; });
  const winner = ([...answers].reverse().find((answer) => scores[answer] === Math.max(...Object.values(scores))) || 'structure');
  return RESULTS[winner];
}

function downloadResultCard(result: Result) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#070713';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(955, 160, 8, 955, 160, 250);
  glow.addColorStop(0, '#fff0bd');
  glow.addColorStop(0.15, '#f4c060');
  glow.addColorStop(0.43, '#685080');
  glow.addColorStop(1, 'rgba(7,7,19,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(955, 160, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(244,192,96,.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(955, 160, 220, 72, -0.3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f4c060';
  ctx.font = '700 22px "Noto Sans JP", sans-serif';
  ctx.fillText('ORBA / STRENGTH SIGNAL', 88, 86);
  ctx.fillStyle = '#fbf8f0';
  ctx.font = '500 68px "Shippori Mincho", serif';
  ctx.fillText(result.title, 88, 190);

  ctx.fillStyle = 'rgba(251,248,240,.72)';
  ctx.font = '400 28px "Noto Sans JP", sans-serif';
  const lines = [result.strength, result.condition];
  lines.forEach((line, index) => {
    const chars = Array.from(line);
    const first = chars.slice(0, 30).join('');
    const second = chars.slice(30, 60).join('');
    ctx.fillText(first, 92, 315 + index * 112);
    if (second) ctx.fillText(second, 92, 355 + index * 112);
  });
  ctx.fillStyle = 'rgba(251,248,240,.45)';
  ctx.font = '400 20px "Noto Sans JP", sans-serif';
  ctx.fillText('これは答えではなく、自分の経験で確かめるための仮説です。', 88, 560);
  ctx.fillStyle = '#fff0bd';
  ctx.font = 'italic 500 38px serif';
  ctx.fillText('Orba', 1018, 565);

  const link = document.createElement('a');
  link.download = `orba-strength-${result.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function StrengthsDiagnosis({ initialSharedResult }: { initialSharedResult?: StrengthResultId }) {
  const [phase, setPhase] = useState<Phase>(initialSharedResult ? 'result' : 'intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ResultId[]>(initialSharedResult ? [initialSharedResult] : []);
  const [sharedLanding, setSharedLanding] = useState(Boolean(initialSharedResult));
  const [copyLabel, setCopyLabel] = useState('リンクをコピー');

  const result = useMemo(() => resultFromAnswers(answers), [answers]);

  useEffect(() => {
    track('diagnosis_view', { diagnosis: 'strengths' });
    if (initialSharedResult) track('share_landing_view', { diagnosis: 'strengths', result: initialSharedResult });
  }, [initialSharedResult]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase, step]);

  const start = () => {
    setPhase('questions');
    setStep(0);
    setAnswers([]);
    track('diagnosis_start', { diagnosis: 'strengths' });
  };

  const answer = (answerId: ResultId, optionIndex: number) => {
    const next = [...answers, answerId];
    setAnswers(next);
    track('diagnosis_answer', { diagnosis: 'strengths', question: step + 1, option: optionIndex + 1 });
    if (step === QUESTIONS.length - 1) {
      const completed = resultFromAnswers(next);
      setPhase('result');
      track('diagnosis_complete', { diagnosis: 'strengths', result: completed.id });
    } else {
      setStep((current) => current + 1);
    }
  };

  const shareUrl = typeof window === 'undefined'
    ? 'https://orba.life/diagnosis/strengths'
    : `${window.location.origin}/diagnosis/strengths?result=${result.id}&utm_source=orba_share&utm_medium=earned&utm_campaign=strengths_diagnosis`;
  const shareText = `私の強みの使われ方は「${result.title}」でした。答えではなく、経験から確かめるための仮説。`;
  const lineHref = `https://line.me/R/msg/text/?${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  const shareNative = async () => {
    track('share_click', { diagnosis: 'strengths', result: result.id, method: 'native' });
    if (navigator.share) {
      await navigator.share({ title: 'Orba 強みの使われ方診断', text: shareText, url: shareUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopyLabel('コピーしました');
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopyLabel('コピーしました');
    track('share_click', { diagnosis: 'strengths', result: result.id, method: 'copy' });
  };

  const reset = () => {
    setPhase('intro');
    setStep(0);
    setAnswers([]);
    setSharedLanding(false);
    setCopyLabel('リンクをコピー');
  };

  const startHref = `/start?utm_source=orba_diagnosis&utm_medium=owned_tool&utm_campaign=strengths_diagnosis&utm_content=${result.id}&diagnosis_result=${result.id}`;

  return (
    <main className={`orba-mini-diagnosis is-${phase}`}>
      <template
        id="orba-diagnosis-direction"
        hidden
        dangerouslySetInnerHTML={{ __html: '<!-- ORBA_DIAGNOSIS_DIRECTION seed=2c0f3df2 form=constellation-triage -->' }}
      />
      <header className="orba-mini-diagnosis__header">
        <Link href="/" aria-label="Orbaトップへ"><OrbaMark /></Link>
        <Link href="/insights/strengths-are-hard-to-see"><ArrowLeft size={15} /> 強みの記事へ戻る</Link>
      </header>

      {phase === 'intro' && (
        <section className="orba-mini-diagnosis__intro">
          <div className="orba-mini-diagnosis__intro-copy">
            <h1>強みは、<br />自然な行動の<br />中にある。</h1>
            <p>目立つ才能を決めるテストではありません。三つの質問から、あなたの力が使われやすい条件を一つの仮説にします。</p>
            <button type="button" onClick={start} className="orba-mini-diagnosis__primary">
              3問で確かめる <ArrowRight size={17} />
            </button>
            <span>登録不要・無料・約1分</span>
          </div>
          <div className="orba-signal-instrument" aria-label="三つの観測信号">
            <div className="orba-signal-instrument__orb" aria-hidden="true"><BrandOrb /></div>
            <div className="orba-signal-instrument__core"><strong>3</strong><span>OBSERVATIONS</span></div>
            <div className="orba-signal-instrument__orbit orbit-one"><span>自然に担う役割</span></div>
            <div className="orba-signal-instrument__orbit orbit-two"><span>力が出る距離</span></div>
            <div className="orba-signal-instrument__orbit orbit-three"><span>迷ったときの初動</span></div>
          </div>
        </section>
      )}

      {phase === 'questions' && (
        <section className="orba-mini-diagnosis__question" aria-live="polite">
          <div className="orba-mini-diagnosis__progress">
            <span>観測 {step + 1} / {QUESTIONS.length}</span>
            <div><i style={{ transform: `scaleX(${(step + 1) / QUESTIONS.length})` }} /></div>
          </div>
          <div className="orba-mini-diagnosis__question-body" key={step}>
            <h1>{QUESTIONS[step].prompt}</h1>
            <p>{QUESTIONS[step].note}</p>
            <div className="orba-mini-diagnosis__options">
              {QUESTIONS[step].options.map((option, optionIndex) => (
                <button key={option.label} type="button" onClick={() => answer(option.result, optionIndex)}>
                  <span>{option.label}</span><ArrowRight size={17} />
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="orba-mini-diagnosis__back" onClick={step === 0 ? reset : () => { setAnswers((current) => current.slice(0, -1)); setStep((current) => current - 1); }}>
            <ArrowLeft size={14} /> {step === 0 ? '最初に戻る' : '一つ前へ'}
          </button>
        </section>
      )}

      {phase === 'result' && (
        <section className="orba-mini-diagnosis__result">
          <div className="orba-mini-diagnosis__result-paper">
            <h1>{result.title}</h1>
            <p className="orba-mini-diagnosis__result-lead">{result.lead}</p>
            <dl>
              <div><dt>見えやすい強み</dt><dd>{result.strength}</dd></div>
              <div><dt>力が使われる条件</dt><dd>{result.condition}</dd></div>
              <div><dt>経験で確かめる問い</dt><dd>{result.question}</dd></div>
            </dl>
            <p className="orba-mini-diagnosis__caveat">これは答えではなく、三つの回答からつくった仮説です。実際の経験と違う部分は、無理に受け入れる必要はありません。</p>
          </div>

          <aside className="orba-mini-diagnosis__result-actions">
            <h2>もう少し深く、あなた自身の言葉と重ねる。</h2>
            <p>Orba本編では、6つの質問と出生情報を複数の視点に重ね、共通点と違いを整理します。最初の結果まで登録は不要です。</p>
            <Link
              href={startHref}
              className="orba-mini-diagnosis__primary"
              onClick={() => track(sharedLanding ? 'share_landing_cta_click' : 'diagnosis_to_start', { diagnosis: 'strengths', result: result.id })}
            >
              Orbaで詳しく見る <ArrowRight size={17} />
            </Link>
            <div className="orba-mini-diagnosis__share" aria-label="結果を保存・共有">
              <button type="button" onClick={() => { downloadResultCard(result); track('result_save', { diagnosis: 'strengths', result: result.id }); }}><Download size={16} />画像を保存</button>
              <a href={lineHref} target="_blank" rel="noreferrer" onClick={() => track('share_click', { diagnosis: 'strengths', result: result.id, method: 'line' })}><MessageCircle size={16} />LINEで送る</a>
              <button type="button" onClick={shareNative}><Share2 size={16} />共有する</button>
              <button type="button" onClick={copy}><Copy size={16} />{copyLabel}</button>
            </div>
            <button type="button" className="orba-mini-diagnosis__retry" onClick={reset}><RotateCcw size={14} />もう一度答える</button>
          </aside>
        </section>
      )}

      <footer className="orba-mini-diagnosis__footer">
        <p>重要な判断を診断だけで決めず、自分の経験を整理する補助線としてお使いください。</p>
        <div><Link href="/safety">AI利用と安全性</Link><Link href="/legal/privacy">プライバシー</Link><Link href="/contact">お問い合わせ</Link></div>
      </footer>
    </main>
  );
}
