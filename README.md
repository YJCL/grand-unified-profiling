# Orba — あなただけのパートナーオーブ

Orba（オーバ）は、西洋・東洋占星術、四柱推命、宿曜、ヒューマンデザイン、数秘術、心理統計（MBTI/エニアグラム）などを**天体暦に基づいて実計算**し、その人だけの結果（オンリーワン）を導く、パーソナルパートナーアプリです。占いを前面に出さず、選んだ「光のオーブ」が日々の相談に寄り添い、求めた時には本格鑑定で道を照らします。

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

占術エンジンの検算：

```bash
npx tsx scripts/test-engine.ts
```

## リリース条件

配信形態・決済・法務などの条件は [`RELEASE.md`](./RELEASE.md) を参照。
