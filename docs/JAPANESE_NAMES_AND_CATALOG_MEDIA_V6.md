# SHINKAI — 和名表示／図鑑比率 V6

- Status: Ultra承認済み
- Last updated: 2026-08-19
- Scope: 149種の生物表示名、図鑑カードの名称表示、図鑑メディア比率

## 1. 表示名ポリシー

- 149種すべてに日本語UI表示ラベルを与える。
- 検証済みの標準和名は `established` とする。
- 標準和名を確認できない行は、明確な日本語のゲーム内呼称を `localized` として表示する。`localized` のラベルを標準和名として主張しない。
- 学名（accepted scientific name）は表示名とは別に表示する。
- 英語の一般名は調査用のソースデータにのみ残し、生物名UIには表示しない。
- 図鑑の発見保存、獲得数、スコア、出現、外部キー、および移行は accepted scientific name をキーとして従来どおり維持する。

## 2. 正本データと生成物

`docs/SPECIES_JA_DISPLAY_NAMES.csv` を和名表示の正本サイドカーとする。列は次の3列で固定する。

```text
source_catalog_id,display_name_ja,name_status
```

このサイドカーは `docs/SPECIES_CATALOG.csv` と一対一で対応し、149件のIDを欠落・重複・余分なく収録する。表示ラベルは空でない日本語文字列とし、`name_status` は `established` または `localized` のいずれかとする。

`scripts/generateSpeciesCatalog.mjs` はサイドカーを厳密に検証してIDで結合し、生成JSONへ次のフィールドを出力する。

- `display_name_ja`
- `ja_name_status`
- 互換フィールド `display_name`（`display_name_ja` と完全一致）

`preferred_en_name` は研究用ソースデータとして生成JSONに保持してよいが、表示名UIの入力には使わない。`established` 行は、カタログの空でない `preferred_ja_name` と一致しなければならない。和名表示サイドカーは研究バッチCSVを統合した正本であり、各研究バッチは provenance として保持する。

カタログで標準和名を確定している78行だけ `preferred_ja_name` を設定し、残る71行は `localized` とする。既存の確定名を保持し、`docs/research/ja-established-fish-v6.csv`（38件）と `docs/research/ja-established-invertebrates-v6.csv`（40件）の監査結果を統合する。`localized` ラベルは `preferred_ja_name` に設定しない。

## 3. ゲーム中の名称表示

- 潜航中の遭遇、発見、スキャン／ステータスレール、結果画面、大型生物イベントは生成された `display_name` を使う。
- 未同定のスキャン／ステータスレールは、英語カテゴリIDを使わず、次の形式で表示する。

  `未同定 / <日本語カテゴリ>`

  日本語カテゴリは `魚類`、`ゼラチン質生物`、`イカ類`、`タコ類`、`カニ類`、`エビ類`、`その他の無脊椎動物` とする。

- 識別後の既知表示、NEW表示、獲得表示、結果表示は日本語の生成表示ラベルを使う。
- 大型生物候補 `I022 Mesonychoteuthis hamiltoni` の表示ラベルはサイドカーの `ダイオウホウズキイカ` とし、英語の `Colossal squid` をハードコードしない。

## 4. 図鑑カード

発見済みカードでは、タイトルに日本語表示ラベルを置き、その直下に和名ステータスを置く。

- `established`: `和名`
- `localized`: `ゲーム内呼称 / 標準和名未確認`

英語の副名称は表示しない。学名は独立した行で `学名 / <accepted scientific name>` と表示する。カテゴリ、深度、事実、出典、獲得数など既存のカード情報は維持する。

## 5. 図鑑メディア比率契約

写真とピクセルアイコンはどちらも共通の `.catalog-media-stage` 内に置く。

- ステージは中央寄せ、`max-width: 16rem`、`aspect-ratio: 4 / 3` とする。
- 写真は `max-width: 100%`、`max-height: 100%`、`width: auto`、`height: auto`、`object-fit: contain` とし、縦横を独立に拡大縮小しない。
- アイコンのcanvasは固有の64×64論理解像度を保ち、最大8remまで比例拡大する。
- 写真の帰属キャプションはstageの外側、figure内に置く。
- アイコンのstageには保留フォールバックも置く。
- crop、stretch、独立したx/yスケールを行わない。ピクセル表示の `image-rendering: pixelated` は維持する。

## 6. 受け入れ確認

- サイドカーがカタログと同じ149件のIDを一対一で持つ。
- 149件すべてに日本語文字、許可されたステータス、生成JSONの `display_name_ja`／`ja_name_status`／`display_name` の一致がある。
- 78件の `established` 行が非空の `preferred_ja_name` と一致し、残る71件は `localized` である。
- 監査済み78件の標準和名が保持され、localizedラベルが `preferred_ja_name` に混入しない。
- 未同定表示が日本語カテゴリ形式となり、図鑑に英語副名称が出ない。
- I022の大型生物イベントが `ダイオウホウズキイカ` を表示する。
- 写真とアイコンのDOMラッパー、stage比率、サイズ上限、contain、intrinsic canvas、pixelated指定がメディア歪みを防ぐ。
