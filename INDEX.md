# Orba ドキュメント整理サマリー（2026-08-17）

> フォルダ内のMD9個に齟齬があったため、以下の基準で統一した。
> - **金額面**：このチャット（Claudeとの販売戦略検討）での決定を正とする
> - **方針・現状**：直近日付（2026-07-03）の2文書（`orba_integrated_review_handoff.md` / `orba_sales_strategy_handoff.md`）を正とする

---

## 現在の正典（このセットをフォルダに上書きしてください）

| ファイル | 状態 | 役割 |
|---|---|---|
| `Claude.md` | **全面刷新** | Claude Code用プロジェクトコンテキスト。旧内容(Gemini/SQLite/GUF名称)は現行実装と完全不一致だったため破棄 |
| `README.md` | 更新 | 開発者向け技術README。占術レイヤー構成を実装の現状に統一 |
| `RELEASE.md` | 更新 | リリースチェックリスト。価格・決済記述を現行方針に統一 |
| `ROADMAP.md` | 更新 | 収益化の実行順とExit Gate。価格・損益は`REVENUE_MODEL.md`を参照 |
| `REVENUE_MODEL.md` | **新規・最優先** | 価格・商品構成・販売導線・決済・損益の正典。旧¥3,000案を上書き |
| `orba_integrated_review_handoff.md` | **無変更**（最新のため） | 4軸統合レビュー依頼 |
| `orba_sales_strategy_handoff.md` | **無変更**（最新のため） | ココナラ販売戦略の詳細 |
| `ORBA_PDF_SYSTEM.md`※ | このセットには含めていない | PDF生成システム仕様。以前のチャットで作成済み。フォルダに無ければ別途配置を |

## アーカイブ（矛盾の原因になっていた旧資料）

書き換えず、冒頭にARCHIVED注記のみ追加した。内容は歴史的参考として残し、実用では使わないでください。

| ファイル | アーカイブ理由 |
|---|---|
| `LAUNCH_AND_REVIEW_BRIEF.md` | 旧¥550モデル前提の依頼ブリーフ。役割は`orba_integrated_review_handoff.md`と`orba_sales_strategy_handoff.md`に完全に引き継ぎ済み |
| `CLAUDE_AI_PROJECT_PROMPT.md` | リブランド前(GUF)のスタンドアロン用プロンプト案。現行Orbaとは別物。**実際にどこかで稼働中か要確認** |
| `HANDOFF_FORTUNE_PARTNER.md` | リブランド前(GULFP)の初期構想仕様書。実装は既に分岐済み |

---

## 見つかった具体的な齟齬（一覧）

1. **Orba本体の月額価格**：旧資料には¥500〜3,000が混在
   → **Orba Plus ¥1,480/月（税込）に確定**。`REVENUE_MODEL.md`を正とする

2. **占術レイヤー構成**：バイオリズム記載(README/旧BRIEF) vs 干支分析記載(新2文書＝実装の現状)
   → **新2文書の8レイヤー構成**（西洋占星術／四柱推命／九星気学／宿曜／数秘術／ヒューマンデザイン／干支分析／天体トランジット）に統一

3. **プロジェクト名・技術スタック**：Grand Unified Profiling/Fortune/Life Partner・Gemini API・SQLite（Claude.md旧版） vs Orba・Anthropic Claude・Prisma/Postgres（README.md）
   → **Orba／現行スタックに統一**。旧名称ファイルはアーカイブ

4. **ローンチ状況**：「実ユーザー0・未告知」(ROADMAP/BRIEF) vs 「ココナラで実データ(閲覧7・販売0)あり」(新2文書)
   → **Orba本体アプリは引き続き未ローンチ、ココナラは別の外部チャネルとして先行稼働中**、と明確に切り分けて整理

5. **決済前提**：KOMOJU申請提出済み。承認後に本番キー・Webhook・実決済テストを行い購入導線を有効化

---

## 未解決のまま（次に詰めるべきこと）

- KOMOJUの占い・自己理解サービスおよび継続課金の加盟店審査は未完了
- ココナラPDF購入者とOrba本体の接続方法（外部送客禁止の制約下でどう設計するか）も未確定
- 上記2点は`orba_sales_strategy_handoff.md` §15、`orba_integrated_review_handoff.md`の検討事項として、引き続き別チャット（Claude Fable）側で検討中という認識で合っているか要確認
- `CLAUDE_AI_PROJECT_PROMPT.md`が実際に稼働中のClaude.ai Projectかどうか未確認（稼働していなければ削除推奨）
