# DATA_GUIDE.md

このファイルは、`data/` 配下の教材JSONを自分で編集するためのガイドです。  
**重要: JSONのキー名は変更しないでください。**（値は自由に編集可）

---

## 1. words_*.json の編集方法
- 対象ファイル: `words_A1.json` 〜 `words_C1.json`
- 1要素が1単語です。
- 最低限、以下のキーを持つオブジェクトを配列に追加します。

```json
{
  "id": "a1_001",
  "level": "A1",
  "word": "vivir",
  "meaning": "住む、生きる",
  "partOfSpeech": "動詞",
  "example": "Vivo en Japón.",
  "translation": "私は日本に住んでいます。",
  "note": "補足メモ"
}
```

---

## 2. grammar_*.json の編集方法
- 対象ファイル: `grammar_A1.json` 〜 `grammar_C1.json`
- 1要素が1文法項目です。
- `examples` は配列で、`spanish` と `japanese` のセットを入れます。

```json
{
  "id": "grammar_a1_001",
  "level": "A1",
  "title": "ser と estar",
  "explanation": "説明文",
  "examples": [
    { "spanish": "Soy estudiante.", "japanese": "私は学生です。" },
    { "spanish": "Estoy en casa.", "japanese": "私は家にいます。" }
  ],
  "note": "注意点",
  "commonMistake": "よくある間違い"
}
```

---

## 3. readings_*.json の編集方法
- 対象ファイル: `readings_A1.json` 〜 `readings_C1.json`
- 1要素が1本の長文です。
- `vocabulary` は重要語句、`questions` は4択クイズです。

```json
{
  "id": "reading_a2_001",
  "level": "A2",
  "title": "La vida en una ciudad antigua",
  "category": "historia",
  "text": "スペイン語本文",
  "translation": "日本語訳",
  "vocabulary": [
    { "word": "mercado", "meaning": "市場" }
  ],
  "questions": [
    {
      "id": "q_a2_001_1",
      "type": "choice",
      "question": "質問文",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answer": "選択肢1"
    }
  ]
}
```

---

## 4. 各フィールドの意味
- `id`: 一意のID（重複禁止）
- `level`: `A1` / `A2` / `B1` / `B2` / `C1`
- `word`: スペイン語単語
- `meaning`: 単語の日本語訳
- `partOfSpeech`: 品詞
- `example`: スペイン語例文
- `translation`: 日本語訳（単語例文訳 or 長文訳）
- `note`: 補足
- `title`: 見出し
- `explanation`: 文法説明
- `examples`: 文法例文配列
- `commonMistake`: よくある間違い
- `category`: 長文カテゴリ
- `text`: 長文スペイン語本文
- `vocabulary`: 長文中の重要語句
- `questions`: クイズ配列
- `answer`: 正解テキスト

---

## 5. C1単語を追加する方法
1. `data/words_C1.json` を開きます。
2. 既存配列の末尾にオブジェクトを追加します。
3. `id` を重複しない値（例: `c1_006`）にします。
4. `word`（スペイン語）と`meaning`（日本語）を必ず分けて入力します。

---

## 6. C1長文を追加する方法
1. `data/readings_C1.json` を開きます。
2. 新しい長文オブジェクトを追加します。
3. `text` にスペイン語本文、`translation` に日本語訳を入れます。
4. `questions` に4択問題を追加します（`choices` は必ず4件）。

---

## 7. 長文の日本語訳を自分で自然な訳に直す方法
1. `readings_*.json` の `translation` を編集します。
2. 改行したい場合は `\n` を使います。
3. `text`（スペイン語本文）と同じ文章を貼らないようにします。

---

## 8. GitHub上でJSONを編集してCommitする手順
1. GitHubで対象リポジトリを開く。
2. `data/` 配下のファイルを開く。
3. 右上の鉛筆アイコン（Edit）を押す。
4. JSONを編集。
5. 画面下部の `Commit changes...` を押してコミット。
6. Pages公開ブランチに入っていれば、数分で反映。

---

## 9. JSONでよくあるミス
- 最後の要素の後ろにカンマを付ける
- ダブルクォーテーションを忘れる
- `id` が重複する
- `word` と `meaning` を同じにしてしまう
- `text` と `translation` を同じにしてしまう

---

## 10. 編集後にGitHub Pagesへ反映される流れ
1. JSONをコミット
2. GitHub Pages が再配信
3. ブラウザで更新
4. Service Worker の新キャッシュが有効化

---

## 11. PWAキャッシュで古い内容が表示される場合の対処
1. Safariで強制再読み込み
2. ホーム画面アイコンを削除して再追加
3. SafariのWebサイトデータを削除
4. `service-worker.js` の `CACHE_NAME` を更新して再デプロイ

