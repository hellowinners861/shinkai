# SHINKAI 生物カタログ監査

- 監査日: 2026-08-06
- 対象: `terra-fish.csv`、`terra-invertebrates.csv`（主カタログ）、`terra-cephalopods-extra.csv`、`terra-crustaceans-extra.csv`（補欠）
- 総合判定: **CONDITIONAL PASS**（調査データ候補としては下限を満たす。公開リリースの素材条件は未達。）

## 監査方法と前提

- 主カタログの担当者は各行の accepted scientific name を WoRMS 等の分類機関で確認している、という調査引継ぎを前提にした。全149行で `taxonomy_source_url` は非空である。この監査では149件をライブ再照会して accepted status を再判定してはいない。
- 学名の完全一致は Unicode NFC、前後空白除去、連続空白の1文字化、英字小文字化で正規化して比較した。
- 「必須URL」は `primary_source_url`、`taxonomy_source_url`、`image_reference_url` の3列を指す。
- 本CSVには `taxon_status`、`taxon_authority_id`、`synonyms`／known synonym 専用列がない。全4ファイルを `synonym`、`accepted name`、`known synonym` で確認したが、既知同物異名の明示メモは見つからなかった。これは「同物異名が存在しない」という意味ではない。正式 `SPECIES_CATALOG.csv` 統合時には、WoRMS等で accepted name・安定ID・known synonym を明示して再検証すること。

## 主カタログの構造QA

| ファイル | 行数 | カテゴリ内訳 | 正規化学名の重複 | `catalog_id`重複 | 必須URL欠損 | 深度逆転 | 属のみ／`sp.`／`spp.` |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| `terra-fish.csv` | 57 | fish: 57 | 0 | 0 | 0 | 0 | 0 |
| `terra-invertebrates.csv` | 92 | gelatinous_plankton相当: 20、squid: 16、octopus: 16、crab: 16、shrimp: 16、other_invertebrate: 8 | 0 | 0 | 0 | 0 | 0 |
| **主カタログ合計** | **149** | 下記参照 | **0** | **0** | **0** | **0** | **0** |

`catalog_id` はファイルをまたいだ主・補欠199行でも重複0件、補欠同士の正規化学名重複も0件だった。分類機関の stable ID はCSVに格納されていないため、`taxon_authority_id` の重複検査はこの段階では実施不能である。

必須URLの空欄はない。ただし、非空であっても次の既知不具合がある。

| 対象 | 問題 | 正式統合時の処置 |
| --- | --- | --- |
| `terra-fish.csv` / `F023` / *Lampanyctus crocodilus* | `taxonomy_source_url` のクエリが `Lampanyctus+crocdilus` となっており、`crocodilus` の `o` が欠けている。 | `tName=Lampanyctus+crocodilus` に修正してからWoRMSのaccepted record／AphiaIDを確定する。 |

## 100種設計下限（主カタログだけで集計）

主カタログの149行はすべて `max_depth_m >= 200` で、ゲームの0–6,000m帯と交差する観察深度を持つ。研究CSVにはまだ spawn depth・条件・score・asset manifest のリリース用列はないため、これはあくまでデータ候補の判定である。

| 設計カテゴリ | 下限 | 主カタログ候補 | 判定 |
| --- | ---: | ---: | --- |
| fish | 20 | 57 | PASS |
| gelatinous_plankton（CSVの `jelly_ctenophore_plankton`） | 16 | 20 | PASS |
| squid | 16 | 16 | PASS |
| octopus | 16 | 16 | PASS |
| crab | 16 | 16 | PASS |
| shrimp | 16 | 16 | PASS |
| **6カテゴリ小計** | **100** | **141** | **PASS** |
| その他無脊椎動物 | — | 8 | 参考 |
| **一意な主カタログ候補** | **100** | **149** | **PASS** |

したがって、100種設計下限は **データ候補として満たす**。補欠を加算する必要はなく、本番候補数を199件や169件として二重／先行計上してはならない。

## 補欠ファイルの重複管理

補欠ファイルは本番カウントに含めない。主カタログとの正規化学名完全一致を以下のとおり検出した。

### `terra-cephalopods-extra.csv`

- 全26件
- 主カタログとの重複: 15件
- 主カタログにない補欠: 11件

| 補欠ID | 学名 | 主カタログID |
| --- | --- | --- |
| CS001 | *Architeuthis dux* | I021 |
| CS002 | *Bathyteuthis abyssicola* | I032 |
| CS006 | *Gonatus onyx* | I030 |
| CS007 | *Histioteuthis heteropsis* | I026 |
| CS008 | *Joubiniteuthis portieri* | I033 |
| CS009 | *Mesonychoteuthis hamiltoni* | I022 |
| CS010 | *Octopoteuthis deletron* | I035 |
| CS011 | *Taningia danae* | I027 |
| CS012 | *Vampyroteuthis infernalis* | I024 |
| CS014 | *Ancistrocheirus lesueurii* | I036 |
| CO001 | *Graneledone boreopacifica* | I037 |
| CO004 | *Muusoctopus robustus* | I047 |
| CO006 | *Opisthoteuthis agassizii* | I044 |
| CO011 | *Cirroteuthis muelleri* | I042 |
| CO012 | *Japetella diaphana* | I049 |

補欠11件: CS003 *Chiroteuthis veranii*、CS004 *Cranchia scabra*、CS005 *Galiteuthis armata*、CS013 *Mastigoteuthis agassizii*、CO002 *Muusoctopus januarii*、CO003 *Muusoctopus johnsonianus*、CO005 *Opisthoteuthis californiana*、CO007 *Opisthoteuthis calypso*、CO008 *Opisthoteuthis chathamensis*、CO009 *Grimpoteuthis challengeri*、CO010 *Grimpoteuthis umbellata*。

### `terra-crustaceans-extra.csv`

- 全24件
- 主カタログとの重複: 15件
- 主カタログにない補欠: 9件

| 補欠ID | 学名 | 主カタログID |
| --- | --- | --- |
| CC001 | *Bythograea thermydron* | I065 |
| CC002 | *Kiwa hirsuta* | I064 |
| CC003 | *Chaceon quinquedens* | I057 |
| CC008 | *Neolithodes diomedeae* | I053 |
| CC009 | *Neolithodes grimaldii* | I054 |
| CC010 | *Paralomis multispina* | I055 |
| CC011 | *Paralomis birsteini* | I056 |
| CC012 | *Macroregonia macrochira* | I061 |
| CR001 | *Acanthephyra purpurea* | I072 |
| CR004 | *Oplophorus spinosus* | I073 |
| CR005 | *Hymenopenaeus debilis* | I076 |
| CR007 | *Benthoecetes bartletti* | I081 |
| CR010 | *Rimicaris exoculata* | I069 |
| CR011 | *Alvinocaris markensis* | I070 |
| CR012 | *Mirocaris fortunata* | I071 |

補欠9件: CC004 *Chaceon granulatus*、CC005 *Chaceon fenneri*、CC006 *Chionoecetes tanneri*、CC007 *Chionoecetes angulatus*、CR002 *Acanthephyra acutifrons*、CR003 *Acanthephyra pelagica*、CR006 *Dalicaris altus*、CR008 *Aristeus antennatus*、CR009 *Aristaeomorpha foliacea*。

現時点の本番候補は主カタログ149件のみとし、補欠20件は採用決定後にのみ、主カタログとの学名・同物異名照合を再実施して追加する。

## 画像・公開可否

`image_rights_note` とローカル素材を照合した結果、149件の主カタログと50件の補欠はすべてこの監査では **reference-only** と扱う。`CS006` と `CS008` は文言に `reference-only` を含まないが、いずれも「画像をダウンロードしていない」「後続利用前にライセンス／帰属を検証する」と明記されており、release承認ではない。

- `assets/images/` にあるのは `.gitkeep` のみで、生物写真・科学イラストはリポジトリに同梱されていない。
- `assets/manifest.csv` はまだ存在しない。
- よって `release_approved` は **0件**。hotlinkも公開素材も存在しないが、これは公開済み素材を満たしたことを意味しない。

**公開素材条件は未達（リリースゲートは FAIL）**。各採用種について、再配布・商用利用・必要な加工が許可されたローカル画像／科学イラストを取得し、`assets/manifest.csv` にライセンス、作者、出典、帰属文、SHA-256、承認者を記録して初めて release_approved と数えられる。

## 結論と正式統合の条件

**CONDITIONAL PASS**。主カタログは149の一意なデータ候補を持ち、6カテゴリの100種下限を主カタログのみで満たし、今回の構造チェック（ID、正規化学名、必須URL空欄、深度逆転、属のみ／`sp.`／`spp.`）も通過した。一方、公開用の素材は0件で、分類のaccepted status／安定ID／known synonymの機械検証可能な記録もまだない。

Luna Maxが正式統合する前に、Ultra承認のもとで次を実施する。

1. F023の `crocdilus` を `crocodilus` へ修正し、全採用行にWoRMS等のaccepted status、AphiaID等、known synonymを記録する。
2. 研究CSVを `SPECIES_CATALOG.csv` のリリーススキーマへ変換し、観察範囲と交差するspawn範囲・条件・レア度・得点を定義する。
3. 各公開生物に1点以上の `release_approved` ローカル素材と完全なasset manifest／帰属を用意し、100件の公開素材下限を満たす。
