# Grand Unified Profiling (Fortune) - Project Context & Handover

## プロジェクト概要 (Project Overview)
本プロジェクトは、西洋占星術、東洋占術、宿曜、ヒューマンデザイン、エニアグラム、サビアンシンボルなどの多様な占術を統合した高次元プロファイリング・占いWebアプリケーションです。
Gemini APIを活用し、ユーザーの生年月日や心理テスト(A/B)の回答から、その人の魂の性質や戦略、運気を分析・導き出します。

## 現在の技術スタック (Technology Stack)
- **Framework**: Next.js 16.1.6 (App Router)
- **UI/Styling**: React 19, Tailwind CSS v4, Framer Motion (高度なアニメーション・Glassmorphism対応)
- **Database/ORM**: SQLite, Prisma (`prisma/schema.prisma`)
- **AI Integration**: `@google/generative-ai` (Gemini API:主に `gemini-1.5-flash` 系を使用)
- **Icons**: `lucide-react`
- **言語設定**: 多言語対応(日本語 `ja`, 英語 `en`, スペイン語 `es`)

## ディレクトリ構成と主要ファイル (Architecture & Key Files)
- `app/page.tsx`: メインのSPA画面構成。以下のコンポーネントがStepごとに切り替わります。
  - `Intro`: スタート画面、言語選択。
  - `Form`: 基本情報（名前・生年月日・出生地・性別・悩み）の入力。
  - `Quiz`: 10問の心理テスト（A/B選択）。
  - `Analyzing`: 分析中のローディングアニメーション。
  - `Result`: Gemini API から取得した結果の表示とDBへの保存。
- `app/api/divine/route.ts`: Gemini APIとの主要な通信エンドポイント。システムプロンプトにすべての占術を統合した「グランド・ユニファイド・フォーチュン・テラー」としての振る舞いを定義し、結果をJSON形式で返却します。
- `app/api/user/route.ts` & `app/api/diagnosis/route.ts`: ユーザーの生成と診断結果のDB保存機能。
- `prisma/schema.prisma`: DBスキーマ定義。`User`, `Diagnosis`, `ChatLog` の3モデルが存在。
- `data/questions.ts`, `data/translations.ts`: 心理テストの設問データと国際化(i18n)のための辞書データ。

## これまでの開発履歴と修正内容 (Development History & Requests)
これまでのAIセッションで依頼された主な内容は以下の通りです。

1. **API JSON エラーのデバッグ (Debugging API JSON Error)**
   - APIエンドポイントから JSON ではなく HTML（エラーページ等）が返却されることにより発生していた `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` エラーの解消。DB接続、Prismaの設定、新規ユーザー生成フローの不具合を修正しました。
2. **Formコンポーネントのリファクタリング (Refactoring Form Components)**
   - ユーザーがフォームに入力（タイピング）する度に画面が再レンダリングされてしまう問題を解決するため、`app/page.tsx` 内で巨大な単一コンポーネントになっていた構造を見直しました。`Intro`, `Form`, `Quiz`, `Analyzing`, `Result` それぞれを独立したコンポーネントに分割・最適化しています。
3. **UIデザインの強化 (UI Design Enhancement)**
   - 指定された「リッチでプレミアムなデザイン」を実現するため、Framer Motionを活用したマイクロアニメーションを追加。また、スキャンライン、発光するオーラ効果、Glassmorphismなどを導入し、サイバーパンクや神秘的で高級感のあるUIテーマを確立しました。

## 今後の展望とClaudeCodeへの引継ぎ事項 (Future Goals & Handover Notes)
- **安定した保存とマイグレーション**: 現在 `localStorage` の `guf_user_id` と DB 間で不整合（404等）が起きた時のフォールバック処理は実装済みですが、引き続き`/mypage`等でのデータ表示や安定性の担保が必要です。
- **チャット機能の本格実装**: `prisma/schema.prisma` には `ChatLog` モデルが存在しており、今後は相談ログやAIとの対話機能 (`app/chat/`) のUI/UX拡張が想定されます。
- **プロンプトAIモデルの切り替え**: 現在は Gemini API をベースに組み込まれていますが、ClaudeCode上での開発に伴い、Anthropic/Claude API へのエンドポイント置換やプロンプトの調整を行う場合は `app/api/divine/route.ts` 周辺の修正が中心となります。

以上の情報を基に、ClaudeCode環境にてプロジェクトの保守・拡張をスムーズに続行してください。
