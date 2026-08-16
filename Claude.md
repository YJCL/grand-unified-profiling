# Orba — Project Context (Claude Code)

最終更新: 2026-08-17
> ⚠️ 本ファイルは全面刷新版。旧内容（Gemini API・SQLite・「Grand Unified Profiling」名称）は現行実装と完全に不一致だったため破棄した。技術スタックの矛盾に気づいたら、まずこのファイルを更新すること。

## プロジェクト概要

**Orba（オーバ）**。西洋占星術・四柱推命・九星気学・宿曜・数秘術・ヒューマンデザイン・干支分析・天体トランジットの**8つの占術・分析レイヤー**を天体暦にもとづき決定論的に実計算し、その確定データをAnthropic Claude APIが解釈する二層設計のプロファイリング／パートナーアプリ。

ポジショニングは「**精密・非属人**」（並木モデル＝底は精密計算、出力は神秘的な語り口）。量産型ライトアプリではなく、計算の厳密性と神秘的な体験の両立を狙い、本気度の高いユーザーに向ける。詳細な背景・戦略は `ROADMAP.md`（収益化の単一ソース）と `orba_sales_strategy_handoff.md` / `orba_integrated_review_handoff.md`（最新の4軸統合レビュー・販売戦略）を参照。

## 現在の技術スタック

- **Framework**: Next.js 16 (App Router) / React 19 / Tailwind CSS v4 / Framer Motion
- **DB/ORM**: Prisma + PostgreSQL（Supabase）
- **占術計算エンジン**: `lib/engine/`（`astronomy-engine` による天体暦計算。8レイヤーを決定論的に算出）
- **LLM**: Anthropic Claude API（計算済みデータの統合・解釈に専念。ハルシネーションでの暗算はさせない）
- **認証**: メール＋パスワード（scryptハッシュ／httpOnlyセッション）
- **PWA**: manifest・アイコン(192/512/maskable/apple-touch)・theme-color(#0a0820)・standalone表示 実装済み
- **言語**: 日本語のみ（多言語UIの辞書は将来のため一部存在するが会話はja固定）

> 旧文書に残っていた「Gemini API」「SQLite」「`@google/generative-ai`」は誤り。現行は上記の通りAnthropic Claude + Prisma/Postgres。

## 実装済み機能（2026-07-03時点）

- 個人プロファイル生成（会話型オンボーディング／出生情報から8レイヤー計算＋LLM解釈）
- 通常チャット（人生相談パートナーとしての日常会話）
- **易占いMVP**：チャット欄から「易を立てる」／三枚コイン法／本卦・変爻・之卦／個人プロファイルを一部使った解釈／履歴保存／同一質問24時間再利用制限／高リスク質問への注意処理
- 結果シェア（`/s/[id]` 公開ページ＋オーブごとのOGP画像）
- チケット制度（シェア+1／ログインボーナス+1）
- Webプッシュ通知（毎朝の「今日の運気」リマインド）
- サーバー側の有料ゲート（`isPremium`、`/api/billing/upgrade` 経由のみ変更可、クライアント改ざん不可）
- 管理ダッシュボード `/admin/stats`（ファネル計測：landing_view→onboarding_start→reading_complete→app_open→paywall_view/click→founding_interest）
- 法務ページ（特商法・プライバシー）

## PDF生成システム（別チャネル・ココナラ用）

Orba本体とは別に、**ココナラで単発の完全個別鑑定PDF（約10ページ・¥10,000）を販売中**（詳細は `orba_sales_strategy_handoff.md`）。生成システムの技術仕様は `ORBA_PDF_SYSTEM.md` を参照（HTML/CSS → Puppeteer(ヘッドレスChromium) → PDF方式。デザインシステムはOrba本体のカバー画像と同じトークン#0a0820/金を継承）。現状は仕様確定済み・実装/自動化は進行中の位置づけ（自動化の度合いは要確認）。

## 料金・収益化の現状（要点のみ。詳細は ROADMAP.md）

- **ココナラ商品**: ¥1,500の悩み別入口商品を中心にし、詳細版・追加質問をオプション化。旧¥10,000商品はアーカイブ予定。
- **Orba本体サブスク**: **Orba Plus ¥1,480/月（税込）**。無料はHaikuで1日3回、PlusはSonnet 5で1日20回。詳細は `REVENUE_MODEL.md`。
- **決済**: KOMOJUを第一候補として、占い・自己理解サービスおよび継続課金の書面承認を得てから実装。未承認の段階では課金を開始しない。
- **Orba本体アプリ自体は実質プレローンチ**（実ユーザーほぼ0）。ココナラは別チャネルとして先行し、実データ（弱いながら）が出ている状態。この2つを混同しないこと。

## 開発コマンド

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

## リリース・収益化ドキュメントの構成（このファイルと合わせて参照）

- `README.md` … 開発者向け技術README
- `RELEASE.md` … リリース前チェックリスト
- `ROADMAP.md` … 収益化ロードマップ・単一ソース（North Star / Exit Gate）
- `REVENUE_MODEL.md` … 価格・商品構成・決済・損益の正典
- `orba_integrated_review_handoff.md` … 4軸（存在意義／UI・UX／技術／収益・販売）統合レビュー依頼（最新・現役）
- `orba_sales_strategy_handoff.md` … ココナラ販売戦略の詳細（最新・現役）
- `ORBA_PDF_SYSTEM.md` … PDF生成システムの技術仕様

> 旧文書 `CLAUDE_AI_PROJECT_PROMPT.md`（GUF）・`HANDOFF_FORTUNE_PARTNER.md`（GULFP）・`LAUNCH_AND_REVIEW_BRIEF.md`（旧¥550モデル）はリブランド前／方針転換前の資料。参照する場合は必ずヘッダーの ARCHIVED 注記を確認すること。

## 引き継ぎメモ

- 出生情報という機微データの取り扱い方針（保存範囲・アクセス制御）は現行実装の妥当性を要精査（`orba_integrated_review_handoff.md` 軸B参照）。
- 易占いMVPの品質データ（応答速度・解釈精度・再利用率）は計測ログの有無を要確認。
- ココナラPDFとOrba本体の接続方法（ココナラは外部送客が規約で全面禁止）は未確定。次の検討課題。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
