import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { OrbaMark } from "../../components/OrbaMark";
import { getInsight, insights } from "../../data/insights";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return insights.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) return {};
  const title = insight.title.replace("\n", " ");
  return {
    title: `${title}｜Orba Insights`,
    description: insight.description,
    keywords: insight.keywords,
    alternates: { canonical: `/insights/${slug}` },
    openGraph: {
      type: "article",
      title,
      description: insight.description,
      url: `/insights/${slug}`,
      publishedTime: insight.publishedAt,
      modifiedTime: insight.updatedAt,
    },
  };
}

export default async function InsightArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) notFound();

  const currentIndex = insights.findIndex((item) => item.slug === slug);
  const nextInsight = insights[(currentIndex + 1) % insights.length];
  const title = insight.title.replace("\n", " ");
  const articleUrl = `https://orba.life/insights/${insight.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: insight.description,
    datePublished: insight.publishedAt,
    dateModified: insight.updatedAt,
    mainEntityOfPage: articleUrl,
    author: { "@type": "Organization", name: "Orba", url: "https://orba.life" },
    publisher: { "@type": "Organization", name: "Orba", url: "https://orba.life" },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Orba", item: "https://orba.life" },
      { "@type": "ListItem", position: 2, name: "Insights", item: "https://orba.life/insights" },
      { "@type": "ListItem", position: 3, name: title, item: articleUrl },
    ],
  };

  return (
    <main className="orba-article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <header className="orba-article__header">
        <Link href="/" aria-label="Orbaトップへ"><OrbaMark /></Link>
        <Link href="/insights"><ArrowLeft size={14} /> 読みもの一覧</Link>
      </header>

      <article>
        <header className="orba-article__lead">
          <div className="orba-article__coordinate" aria-hidden="true">
            <span>{String(currentIndex + 1).padStart(2, "0")}</span>
            <i />
            <small>FIELD NOTE<br />ORBA / 2026</small>
          </div>
          <div>
            <p>{insight.category} · {insight.readingTime}</p>
            <h1>{insight.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
            <p>{insight.lead}</p>
            <time dateTime={insight.updatedAt}>更新 {insight.updatedAt.replaceAll("-", ".")}</time>
          </div>
        </header>

        <div className="orba-article__body">
          <aside>
            <p>この記事で考えること</p>
            <ol>
              {insight.sections.map((section) => <li key={section.heading}><a href={`#${section.heading}`}>{section.heading}</a></li>)}
            </ol>
          </aside>
          <div className="orba-article__prose">
            {insight.sections.map((section) => (
              <section key={section.heading} id={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
              </section>
            ))}
            <div className="orba-article__note">
              <strong>Orbaの考え方</strong>
              <p>占術や診断は、医療・法律・投資・転職などの重要な判断を代行するものではありません。自分の経験を見直し、選択肢を整理するための補助線として利用してください。</p>
            </div>
          </div>
        </div>
      </article>

      <section className="orba-article__next">
        <p>NEXT FIELD NOTE</p>
        <h2>{nextInsight.title.replace("\n", " ")}</h2>
        <Link href={`/insights/${nextInsight.slug}`}>次の記事を読む <ArrowRight size={15} /></Link>
      </section>

      <section className="orba-article__cta">
        <p>YOUR OWN PROFILE</p>
        <h2>今度は、あなた自身の言葉で。</h2>
        <span>無料プロファイリングから、自分の輪郭を少しずつ確かめられます。</span>
        <Link href="/start">Orbaをはじめる <ArrowRight size={15} /></Link>
      </section>
    </main>
  );
}
