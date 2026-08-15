import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Layers3 } from "lucide-react";
import { BrandOrb } from "../components/BrandOrb";
import { OrbaMark } from "../components/OrbaMark";

const colors = [
  ["Night 950", "#070713"],
  ["Night 800", "#111126"],
  ["Paper", "#FBF8F0"],
  ["Ink", "#262331"],
  ["Luminous Gold", "#F4C060"],
];

export default function BrandGuidePage() {
  return (
    <main className="orba-brand-page">
      <header>
        <OrbaMark />
        <Link href="/">
          <ArrowLeft size={14} /> LPへ戻る
        </Link>
      </header>
      <section className="orba-brand-page__hero">
        <div>
          <p>BRAND SYSTEM / V1.0</p>
          <h1>
            精密に確かめ、
            <br />
            温かく言葉にする。
          </h1>
          <span>
            LP、サービス、SNS、CG、AI生成物を同じOrbaとして扱うための正本です。
          </span>
        </div>
        <div className="orba-brand-page__orb">
          <BrandOrb />
          <i />
          <b />
        </div>
      </section>
      <section className="orba-brand-page__status">
        <div>
          <CheckCircle2 />
          <strong>Confirmed</strong>
          <span>名前、姿勢、色、言葉</span>
        </div>
        <div>
          <CircleDashed />
          <strong>Provisional</strong>
          <span>発光オーブのシンボル</span>
        </div>
        <div>
          <Layers3 />
          <strong>Expression</strong>
          <span>軌道、CG、観測紙</span>
        </div>
      </section>
      <section className="orba-brand-page__foundation">
        <div>
          <p>01 / FOUNDATION</p>
          <h2>
            静かな精密さを、
            <br />
            人の温度で届ける。
          </h2>
        </div>
        <dl>
          <div>
            <dt>Purpose</dt>
            <dd>自分を知り、選び直せる言葉を増やす。</dd>
          </div>
          <div>
            <dt>Personality</dt>
            <dd>Precise · Warm · Still</dd>
          </div>
          <div>
            <dt>Promise</dt>
            <dd>複数の知恵を、今日使える一つの実感へ。</dd>
          </div>
        </dl>
      </section>
      <section className="orba-brand-page__identity">
        <p>02 / IDENTITY</p>
        <h2>
          ロゴは静かに。
          <br />
          表現は立体的に。
        </h2>
        <div className="orba-brand-page__lockups">
          <div>
            <OrbaMark size={56} />
          </div>
          <div className="paper">
            <OrbaMark size={56} />
          </div>
        </div>
        <p>
          ワードマークは Cormorant Garamond Medium
          Italic。WebGLオーブと軌道はロゴではなく、Orbaが「読み解いている状態」を表す表現体系です。
        </p>
      </section>
      <section className="orba-brand-page__colors">
        <div>
          <p>03 / COLOR</p>
          <h2>
            夜と紙、その間に
            <br />
            一筋の光。
          </h2>
        </div>
        <div>
          {colors.map(([name, value]) => (
            <div
              key={name}
              style={{
                background: value,
                color: name === "Paper" ? "#262331" : "#FBF8F0",
              }}
            >
              <strong>{name}</strong>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>
      <footer>
        <OrbaMark />
        <span>Brand system v1.0 · 2026.08</span>
      </footer>
    </main>
  );
}
