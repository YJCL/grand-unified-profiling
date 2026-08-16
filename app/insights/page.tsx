import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { OrbaMark } from "../components/OrbaMark";
import { insights } from "../data/insights";

export const metadata: Metadata = {
  title: "自己理解の読みもの｜Orba Insights",
  description:
    "自分の強み、適職、複数占術の違い、出生データとAI占いの仕組みを、Orbaの視点から丁寧に整理します。",
  alternates: { canonical: "/insights" },
  openGraph: {
    title: "自己理解の読みもの｜Orba Insights",
    description:
      "答えを決めるためではなく、自分で選ぶために。自己理解と適職を考える読みもの。",
    url: "/insights",
  },
};

export default function InsightsPage() {
  const [featured, ...rest] = insights;

  return (
    <main className="orba-insights">
      <header className="orba-insights__header">
        <Link href="/" aria-label="Orbaトップへ">
          <OrbaMark />
        </Link>
        <span>INSIGHTS / SELF UNDERSTANDING</span>
        <Link href="/start">無料ではじめる <ArrowRight size={14} /></Link>
      </header>

      <section className="orba-insights__hero">
        <div className="orba-insights__hero-copy">
          <p>ORBA FIELD NOTES</p>
          <h1>自分を知るための、<br />静かな読みもの。</h1>
          <span>
            強み、適職、複数の占術、AIの仕組み。答えを決めつけず、
            自分の経験を見直すための視点を集めています。
          </span>
        </div>
        <div className="orba-insights__alignment" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
          <b />
          <span>8 LAYERS<br />1 PERSPECTIVE</span>
        </div>
      </section>

      <section className="orba-insights__featured">
        <div className="orba-insights__index-mark">
          <Compass size={17} />
          <span>まず読むなら</span>
        </div>
        <article>
          <p>{featured.category} · {featured.readingTime}</p>
          <h2>{featured.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h2>
          <div>
            <p>{featured.lead}</p>
            <Link href={`/insights/${featured.slug}`}>
              続きを読む <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      </section>

      <section className="orba-insights__archive" aria-labelledby="archive-title">
        <header>
          <p>ARCHIVE</p>
          <h2 id="archive-title">問いから探す</h2>
        </header>
        <div>
          {rest.map((insight, index) => (
            <article key={insight.slug}>
              <span>{String(index + 2).padStart(2, "0")}</span>
              <div>
                <p>{insight.category} · {insight.readingTime}</p>
                <h3>{insight.title.replace("\n", " ")}</h3>
                <p>{insight.description}</p>
              </div>
              <Link href={`/insights/${insight.slug}`} aria-label={`${insight.title.replace("\n", " ")}を読む`}>
                <ArrowRight size={18} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="orba-insights__cta">
        <p>READING IS A BEGINNING</p>
        <h2>一般論ではなく、<br />あなた自身の輪郭を見る。</h2>
        <span>生年月日といくつかの質問から、最初のプロファイルを作成します。</span>
        <Link href="/start">無料でOrbaをはじめる <ArrowRight size={15} /></Link>
      </section>

      <footer className="orba-insights__footer">
        <OrbaMark />
        <Link href="/">Orbaトップ</Link>
        <Link href="/legal/privacy">プライバシー</Link>
      </footer>
    </main>
  );
}
