import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  MessageCircle,
  Orbit,
  Sparkles,
} from "lucide-react";
import { BrandOrb } from "./components/BrandOrb";
import { CelestialInstrument } from "./components/CelestialInstrument";
import { LandingAccountActions } from "./components/LandingAccountActions";
import { OrbaMark } from "./components/OrbaMark";
import { isBillingEnabled, PREMIUM_PRICE_LABEL } from "@/lib/launch";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const layers = [
  "東洋の命理",
  "西洋占星術",
  "数の知恵",
  "性格理論",
  "日々の対話",
  "暦の流れ",
  "易の視点",
  "あなたの言葉",
];

export default function LandingPage() {
  const billingEnabled = isBillingEnabled();
  return (
    <main className="orba-lp" id="top">
      <header className="orba-lp__header">
        <a href="#top">
          <OrbaMark />
        </a>
        <nav aria-label="LPナビゲーション">
          <a href="#about">Orbaとは</a>
          <a href="#experience">できること</a>
          <a href="#flow">ご利用の流れ</a>
          <a href="#plus">Orba Plus</a>
          <Link href="/insights">読みもの</Link>
        </nav>
        <LandingAccountActions />
      </header>

      <section className="orba-lp__hero">
        <div className="orba-lp__hero-copy">
          <h1>
            自分を知ることは、
            <br />
            選び直せること。
          </h1>
          <p>
            複数の知恵と、あなた自身の言葉をひとつに。Orbaは、迷いの中に静かな輪郭をつくるパーソナルパートナーです。
          </p>
          <div className="orba-lp__actions">
            <Link className="orba-lp__trial-cta" href="/start">
              無料プロフィールを作る <ArrowRight size={16} />
            </Link>
            <a href="#about">
              もう少し知る <ArrowDown size={15} />
            </a>
          </div>
        </div>
        <CelestialInstrument />
      </section>

      <section className="orba-lp__statement" id="about">
        <h2>
          答えを渡すのではなく、
          <br />
          自分で選べる言葉を増やす。
        </h2>
        <p>
          診断を一度読んで終わりにしない。対話し、暦を眺め、必要なときだけ深く読む。Orbaは、あなたの時間とともに育つ読み物です。
        </p>
      </section>

      <section className="orba-lp__experiences" id="experience">
        <article>
          <Sparkles size={19} />
          <small>PROFILE</small>
          <h3>
            散らばった自分を、
            <br />
            一つの輪郭へ。
          </h3>
          <p>複数の理論を横断し、矛盾も含めてあなたらしい言葉に統合します。</p>
        </article>
        <article>
          <MessageCircle size={19} />
          <small>DIALOGUE</small>
          <h3>
            結論がなくても、
            <br />
            言葉を置ける。
          </h3>
          <p>
            前回の続きから、いま話せることだけ。日々の対話が理解を更新します。
          </p>
        </article>
        <article>
          <CalendarDays size={19} />
          <small>RHYTHM</small>
          <h3>
            急がず、流れを
            <br />
            見渡せる。
          </h3>
          <p>
            今日と今月のリズムを、行動を決めつけない小さな視点として受け取れます。
          </p>
        </article>
      </section>

      <section className="orba-lp__flow" id="flow">
        <div className="orba-lp__flow-intro">
          <h2>
            まず知って、
            <br />
            続きはあとから。
          </h2>
          <p>
            アカウント登録なしで、相棒を選び、6つの質問から最初のプロフィールを作れます。まず少し触れて、続けたいと思ったときに無料登録してください。
          </p>
        </div>
        <ol className="orba-lp__flow-steps">
          <li>
            <span>01</span>
            <div><strong>無料プロフィールを作成</strong><p>メール登録なしで、相棒を選び6つの質問に答えます。</p></div>
          </li>
          <li>
            <span>02</span>
            <div><strong>まずはOrbaを体験</strong><p>最初の読み解き、対話、運気カレンダーを試せます。</p></div>
          </li>
          <li>
            <span>03</span>
            <div><strong>続きは無料アカウント登録</strong><p>気に入ったらメールとパスワードを設定。プロフィールをそのまま引き継ぎます。</p></div>
          </li>
          <li>
            <span>04</span>
            <div><strong>必要な方だけOrba Plusへ</strong><p>プラン内容を確認後、KOMOJUの安全な決済画面で申し込みます。</p></div>
          </li>
        </ol>
      </section>

      <section className="orba-lp__plus" id="plus">
        <div className="orba-lp__plus-intro">
          <small>ORBA PLUS</small>
          <h2>
            必要な日に、
            <br />
            もう少し深く。
          </h2>
          <p>
            無料プロフィールと基本機能はそのまま。毎日の対話や鑑定を生活のリズムにしたい方だけが選べる月額プランです。
          </p>
          <div className="orba-lp__plus-price">
            <strong>{PREMIUM_PRICE_LABEL}</strong>
            <span>18歳以上 / 毎月自動更新 / いつでも解約可能</span>
          </div>
        </div>

        <div className="orba-lp__plus-details">
          <div className="orba-lp__plus-plans" aria-label="無料プランとOrba Plusの比較">
            <article>
              <small>FREE</small>
              <h3>まず、自分を知る。</h3>
              <ul>
                <li><span>対話</span><strong>1日3回</strong></li>
                <li><span>今日の鑑定</span><strong>チケット1枚</strong></li>
                <li><span>易</span><strong>最初の一卦</strong></li>
                <li><span>運気カレンダー</span><strong>7日分</strong></li>
              </ul>
            </article>
            <article className="is-plus">
              <small>PLUS</small>
              <h3>日々の選択に、伴走を。</h3>
              <ul>
                <li><span>対話</span><strong>1日50回</strong></li>
                <li><span>今日の鑑定</span><strong>毎日</strong></li>
                <li><span>易</span><strong>1日1回</strong></li>
                <li><span>運気カレンダー</span><strong>60日分</strong></li>
              </ul>
            </article>
          </div>

          <p className="orba-lp__plus-status">
            {billingEnabled
              ? 'Plusは、無料プロフィールを作成して本登録した後にお申し込みいただけます。'
              : '現在、決済会社による最終確認中です。受付開始までは無料プランをご利用いただけます。'}
          </p>
          <Link className="orba-lp__trial-cta" href="/start">
            無料プロフィールから始める <ArrowRight size={16} />
          </Link>
          <p className="orba-lp__plus-legal">
            お申し込み前に、<Link href="/legal/terms">利用規約</Link>・<Link href="/legal/cancellation">キャンセルポリシー</Link>・<Link href="/legal/tokushoho">特商法表記</Link>をご確認いただけます。
          </p>
        </div>
      </section>

      <section className="orba-lp__method" id="method">
        <div>
          <h2>
            八つの層を、
            <br />
            ひとつの実感へ。
          </h2>
          <p>
            理論を並べるのではなく、重なる部分と異なる部分を計算し、いまのあなたが使える言葉に編集します。
          </p>
        </div>
        <ol>
          {layers.map((layer, index) => (
            <li key={layer}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{layer}</strong>
              <Orbit size={15} />
            </li>
          ))}
        </ol>
      </section>

      <section className="orba-lp__final">
        <BrandOrb />
        <h2>
          まずは、あなたのことを
          <br />
          少しだけ聞かせてください。
        </h2>
        <Link className="orba-lp__trial-cta" href="/start">
          まずは無料でプロフィールを作る <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="orba-lp__footer">
        <OrbaMark />
        <p>精密に確かめ、温かく言葉にする。</p>
        <div>
          <Link href="/insights">読みもの</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/privacy">プライバシー</Link>
          <Link href="/legal/tokushoho">特定商取引法に基づく表記</Link>
          <Link href="/legal/cancellation">キャンセルポリシー</Link>
          <Link href="/contact">お問い合わせ</Link>
          <Link href="/brand">Brand guide</Link>
        </div>
      </footer>
    </main>
  );
}
