# Orba security operations

最終更新: 2026-08-17

## Production controls

- 管理画面と管理APIは `proxy.ts` のHTTP Basic認証で保護し、秘密情報をURLへ含めない。
- 管理者のVercel、Supabase、KOMOJU、GitHubアカウントでは二要素認証を有効にする。
- 一般ユーザーのログインは5回の連続失敗で15分ロックする。
- DBアクセスはPrismaのパラメータ化クエリを使用し、Reactの標準エスケープを維持する。
- 任意ファイルアップロード機能は提供しない。公開ディレクトリに秘密鍵や顧客資料を置かない。
- カード情報はKOMOJUのホスト画面へ直接入力し、Orbaでは取得・保存しない。
- KOMOJU Webhookはraw bodyのHMAC-SHA256署名を検証し、delivery IDで重複処理を防止する。
- 秘密鍵はVercelの暗号化済み環境変数だけに保存する。

## Regular checks

- GitHub Actionsで毎週 `npm audit`、型チェック、ビルドを実行する。
- Dependabotの更新を確認し、重大・高リスクの脆弱性は優先して修正する。
- 月1回、Vercel/Supabase/KOMOJUのアクセス履歴、Webhook失敗、異常なログインを確認する。
- 四半期ごと、または認証・決済の大きな変更時にOWASP Top 10を基準とするレビューを行う。

## Incident response

漏えい・不正利用が疑われる場合は、関連キーを直ちに失効・再発行し、影響範囲をログで確認する。必要に応じて決済を停止し、影響を受ける利用者と関係事業者へ連絡する。
