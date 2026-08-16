# Orba — あなただけのパートナーオーブ

Orba（オーバ）は、西洋占星術・四柱推命・九星気学・宿曜・数秘術・ヒューマンデザイン・干支分析・天体トランジットの**8つの占術・分析レイヤーを天体暦に基づいて実計算**し、その人だけの結果（オンリーワン）を導く、パーソナルパートナーアプリです。占いを前面に出さず、選んだ「光のオーブ」が日々の相談に寄り添い、求めた時には本格鑑定で道を照らします。チャットから「易を立てる」易占いMVPも搭載しています。

> 旧版の説明にあった「心理統計（MBTI/エニアグラム）」は現行の実装レイヤーには含まれていません（干支分析・天体トランジットに置き換え）。実装の現状に合わせてこの節を随時更新してください。

## 技術スタック
- Next.js 16 (App Router) / React 19 / Tailwind v4 / Framer Motion
- Prisma + PostgreSQL（Supabase）
- 占術計算エンジン：`lib/engine/`（`astronomy-engine` による天体暦計算）
- LLM：Anthropic Claude（計算済みデータの統合・解釈に専念）
- 認証：メール＋パスワード（scryptハッシュ／httpOnlyセッション）

## 開発

```bash
npm install
npm run dev
```

必要な環境変数（`.env.local` / `.env`）:
- `DATABASE_URL` … Supabase PostgreSQL
- `ANTHROPIC_API_KEY` … Claude API
- `AUTH_SECRET` … セッション署名鍵
- `NEXT_PUBLIC_APP_URL` … 本番URL（OGP等で使用）
- `KOMOJU_SECRET_KEY` / `KOMOJU_WEBHOOK_SECRET` … 決済APIとWebhook署名検証（サーバー限定）
- `NEXT_PUBLIC_BILLING_ENABLED` … 審査・本番疎通後に `true` へ変更して購入導線を公開
- `ADMIN_BASIC_USER` / `ADMIN_BASIC_PASSWORD` … `/admin` と管理APIのBasic認証

占術エンジンの検算：

```bash
npx tsx scripts/test-engine.ts
```

## ドキュメント構成

- [`Claude.md`](./Claude.md) … Claude Code用プロジェクトコンテキスト（開発の起点はここ）
- [`RELEASE.md`](./RELEASE.md) … 配信形態・決済・法務などのリリース条件
- [`ROADMAP.md`](./ROADMAP.md) … 収益化ロードマップ・単一ソース
- `orba_integrated_review_handoff.md` / `orba_sales_strategy_handoff.md` … 事業側の最新の検討資料（ココナラ販売・4軸統合レビュー）
- `ORBA_PDF_SYSTEM.md` … ココナラ向け鑑定PDF生成システムの技術仕様
