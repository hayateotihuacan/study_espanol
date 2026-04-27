# Lector Español Clean

## 1. アプリ概要
Lector Español Clean は、GitHub Pages でそのまま公開できる、スペイン語学習用の静的PWAです。HTML / CSS / JavaScriptのみで実装し、iPad Safari のホーム画面追加とオフライン利用を想定しています。

## 2. A1〜C1対応
A1 / A2 / B1 / B2 / C1 の5レベルに対応しています。単語・文法・長文読解・復習・学習履歴でレベル切替できます。

## 3. 教材JSONを後から編集する前提
`data/` 配下の JSON をユーザーが編集・差し替えする前提で設計しています。アプリ側は固定のキーを読み取るだけなので、同じ形式を守れば教材を自由に入れ替えできます。

## 4. ファイル構成
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `service-worker.js`
- `README.md`
- `DATA_GUIDE.md`
- `data/words_A1.json` 〜 `data/words_C1.json`
- `data/grammar_A1.json` 〜 `data/grammar_C1.json`
- `data/readings_A1.json` 〜 `data/readings_C1.json`
- `icons/icon.svg`
- `icons/icon-maskable.svg`

## 5. GitHub Pagesで公開する手順
1. このリポジトリを GitHub に push します。
2. GitHub の `Settings` → `Pages` を開きます。
3. `Build and deployment` で `Deploy from a branch` を選択します。
4. Branch を `main`（または公開したいブランチ）/`root` に設定します。
5. 発行された URL へアクセスして表示を確認します。

## 6. iPad Safariで開く手順
1. iPad の Safari で GitHub Pages のURLを開きます。
2. 初回だけオンラインで開き、教材JSONとService Workerを読み込みます。

## 7. ホーム画面に追加する手順
1. Safari の共有ボタンを押します。
2. 「ホーム画面に追加」を選択します。
3. アイコン名を確認して追加します。

## 8. オフライン確認手順
1. 1回オンラインでアプリを開きます。
2. その後、機内モードまたはWi-Fiオフにします。
3. ホーム画面アイコンから起動し、各画面（ホーム/単語/文法/長文/復習/履歴）が表示できるか確認します。

## 9. 更新後に古い画面が表示される場合の対処
- Safariで強制再読み込み（更新ボタン長押し等）を行う。
- ホーム画面アイコンを削除して追加し直す。
- iPad 設定 > Safari > 詳細 > Webサイトデータ から対象データを削除する。
- `service-worker.js` の `CACHE_NAME` を更新して再デプロイする。

## 10. 教材追加方法
1. `data/words_*.json`、`data/grammar_*.json`、`data/readings_*.json` を編集します。
2. 既存キー（`id`, `level`, `word`, `meaning`, `text`, `translation` など）を維持します。
3. コミット後、GitHub Pages反映を待ちます。

## 11. localStorageに保存される内容
- 単語の状態（覚えた / 未習得）
- 長文の読了状態
- クイズ回答結果（正誤、問題、正答、レベル）
- 最終学習日
- 現在選択中レベル

## 12. 注意事項
- パスはすべて相対パス（`./`始まり）です。
- 外部API、ログイン、クラウド同期、AI機能は未実装です。
- 画面下部に `version 1.0.0` を表示しています。
