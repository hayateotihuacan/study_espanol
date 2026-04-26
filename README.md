# Lector Español C1

## 1. アプリ概要
Lector Español C1 は、GitHub Pages で公開し iPad Safari のホーム画面から使える、オフライン対応のスペイン語学習PWAです。機能は「単語」「文法」「長文読解」「復習」「学習履歴」に絞っています。

## 2. A1〜C1対応
CEFR A1 / A2 / B1 / B2 / C1 の5段階に対応し、各画面でレベル切替できます。

## 3. ファイル構成
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `service-worker.js`
- `icons/icon.svg`
- `icons/icon-maskable.svg`
- `data/words_A1.json` 〜 `data/words_C1.json`
- `data/grammar_A1.json` 〜 `data/grammar_C1.json`
- `data/readings_A1.json` 〜 `data/readings_C1.json`

## 4. GitHub Pagesで公開する手順
1. GitHub に push する。
2. リポジトリの **Settings > Pages** を開く。
3. Source を `Deploy from a branch`、Branch を `main`（または利用ブランチ）/`root` に設定。
4. 公開URLにアクセスして動作確認。

## 5. iPad Safariで開く手順
1. iPad の Safari で GitHub Pages のURLを開く。
2. 初回はオンライン状態で全データを読み込む。

## 6. ホーム画面に追加する手順
1. Safari の共有ボタンを押す。
2. 「ホーム画面に追加」を選ぶ。
3. アイコン名を確認して追加。

## 7. オフライン確認手順
1. 一度オンラインでアプリを開く。
2. その後機内モードに切替。
3. ホーム画面アイコンから起動し、単語/文法/長文/復習/履歴が表示できるか確認。

## 8. 更新後に古い画面が表示される場合の対処
- Safariで強制再読み込みする。
- ホーム画面アイコンを削除して再追加する。
- iPadの「設定 > Safari > 履歴とWebサイトデータを消去」を実行する。
- `service-worker.js` の `CACHE_NAME` を更新し再デプロイする。

## 9. 教材追加方法
1. `data/` の JSON を編集。
2. 単語は `words_*.json`、文法は `grammar_*.json`、長文は `readings_*.json` を更新。
3. 必須キー（id、level、answer など）を保つ。

## 10. localStorageに保存される内容
- 単語学習状態（覚えた/未習得）
- 長文読了状態
- クイズ回答結果（正誤、正答）
- 最終学習日
- 現在選択中レベル

## 11. 注意事項
- パスはすべて相対パス（`./`）で実装。
- 外部API、ログイン、クラウド同期は未実装。
- バージョンは `version 1.0.0` を画面フッターに表示。
