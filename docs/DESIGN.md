# SHINKAI — MVP設計

- Status: Ultra承認済み（モバイルファースト／100種対応／計器盤UI／自動潜航縦切り／岩・回復縦切り）
- Last updated: 2026-08-12
- Target: スマートフォン縦画面向け2DシングルプレイWebゲーム（PCフォールバックあり）

## 1. ゲーム概要

深海調査艇を操作し、燃料を維持しながら目標深度まで潜航する2Dアクションゲーム。

潜航中は実在する深海生物を発見・獲得して図鑑とスコアを伸ばし、岩・クジラ・ダイオウイカなどとの衝突を避ける。衝突すると燃料が減少し、燃料が0になるとゲームオーバー。途中に出現する燃料回復アイテムを拾いながら最深部を目指す。

初回公開版はスマートフォンのブラウザを主対象とする1人用ゲームとし、実在の深海生物を最低100種収録する。バックエンド、アカウント、課金は使わない。

表示深度は多様な深海生物を扱うためのゲーム上の圧縮表現であり、実時間の潜航速度を再現するものではない。

## 2. MVPのコアゲームループ

1. 調査艇が自動で深海へ潜航し、深度が増加する。
2. プレイヤーはタッチ操作で画面内の艇を上下左右に操作する。
3. ライト／探知範囲で深海生物を発見し、接触して調査サンプルとして獲得する。
4. 岩や大型生物を回避する。
5. 衝突時は燃料が減る。
6. 燃料アイテムを回収して回復する。
7. 燃料を残して目標深度6,000mへ到達するとクリアする。
8. 燃料が0になるとゲームオーバーになる。
9. 結果画面で到達深度、発見・獲得した生物、スコアを表示する。
10. 複数回の潜航で100種以上の図鑑完成を目指す。

## 3. モバイルファーストUI・操作

### 3.1 画面・safe-area

- 基準は縦画面9:16、論理解像度450 × 800とする。
- 対応最小CSS viewportは320 × 568、主な検証範囲は幅320〜430px、高さ568〜932pxとする。
- Canvasはアスペクト比を保ってFITし、ゲーム内の視野は端末間で固定する。
- devicePixelRatioは最大2に制限し、過剰なGPU・メモリ消費を防ぐ。
- viewport-fit=coverとし、HUDと操作領域をenv(safe-area-inset-*)に12pxを加えた範囲内へ置く。
- ブラウザUIの伸縮、リサイズ、向き変更後にCanvasと入力座標を再計算する。

### 3.2 タッチ操作

- 画面下部にフローティング仮想スティックを置く。操作領域は直径120px以上、つまみは48px以上とする。
- 右上にポーズと音声切替を置き、タッチ対象を最低44 × 44 CSS pxとする。
- ホバー、長押し、2本指操作を必須にせず、Canvas内のみtouch-action: noneを適用する。
- pointerup、pointercancel、タブ非表示、フォーカス喪失時は入力を中立へ戻して自動停止する。
- 調査艇は画面外へ移動できず、世界が上方向へスクロールする。

### 3.3 向き・PCフォールバック

- 縦画面を推奨するが、画面向きを強制ロックしない。
- 横画面では自動停止して回転案内を表示し、継続時は縦比率Canvasを中央配置したレターボックスでプレイできる。
- PCではWASD／矢印キーで移動、Esc／Pで一時停止、Enterで決定できる。マウス操作にも対応する。
- PCの広い画面によって視野や難易度が有利にならないよう、ゲーム内表示範囲を固定する。

### 3.4 アクセシビリティ

- メニュー、設定、結果、図鑑は可能な限りHTML UIとし、フォーカス、ラベル、読み上げ順を提供する。
- WCAG 2.2 AA相当のコントラストを確保し、燃料や危険を色だけで表現しない。
- prefers-reduced-motionを尊重し、画面揺れ、急なズーム、パーティクルを減らせるようにする。
- 点滅は1秒あたり3回未満とし、強い全面フラッシュを使わない。
- 音だけを攻略情報にせず、BGM・効果音を個別に調整・ミュートできる。図鑑本文はCanvasへ焼き込まない。

### 3.5 Ultra承認UIデザイン

- タイトル、プレイHUD、操舵UI、ポーズ、向き案内、復帰案内の正本は `docs/UI_DESIGN.md` とする。
- 実装担当は本書、`AGENTS.md`、`docs/UI_DESIGN.md` の全てを読む。
- 今回は表示と文言だけを改訂し、開始、移動、停止、音声設定、ライフサイクル、固定視野の挙動は変えない。
- 画像生成、外部画像、外部フォント、hotlinkは使わない。

## 4. 基本ルールと推奨初期値

数値は `balance.ts` などの設定ファイルで調整可能にする。

自動潜航、深度進行、通常燃料消費、背景スクロールの実装正本は `docs/DIVE_PROGRESSION.md` とする。

岩、衝突ダメージ、無敵時間、燃料回復の実装正本は `docs/HAZARDS_AND_RECOVERY.md` とする。

| 項目 | 初期値 |
| --- | ---: |
| 最大燃料 | 100 |
| 開始燃料 | 100 |
| 目標深度 | 6,000m |
| 想定プレイ時間 | 約4分 |
| 通常時の燃料消費 | 0.18/秒 |
| 岩との衝突 | -10 |
| クジラとの衝突 | -18 |
| ダイオウイカとの衝突 | -15 |
| 燃料アイテム | +25（最大値を超えない） |
| 衝突後の無敵時間 | 1秒 |
| 生物の得点 | ゲーム内レア度に応じて10〜100点 |

- 最終スコア = 生物得点 + 到達深度ボーナス + 残燃料ボーナス
- クリア条件: 燃料が1以上の状態で6,000mへ到達
- 失敗条件: 燃料が0になる
- 生物はライト／探知範囲に入ると「発見」、接触すると「獲得」とする。
- 大型生物は獲得対象ではなく、接触を避ける観察対象または障害物とする。
- 「レア度」はゲーム内出現率であり、野生個体数や保全状況を意味しない。
- MVPでは発見演出は簡易表示でもよく、獲得処理を優先する。

## 5. 深度別の難易度

- 0〜200m: 導入帯。基本操作と少数の回遊生物
- 200〜1,000m: 中深層。発光生物、ゼラチン質生物、小型魚、岩
- 1,000〜4,000m: 漸深層。イカ、タコ、エビ、クジラ等の大型生物
- 4,000〜6,000m: 深海平原相当。カニ、エビ、底生生物、最高レア度

各生物のゲーム内出現深度は、出典のある観察深度範囲との共通部分に限定する。外洋、海底付近、熱水噴出域等の生息環境もデータ条件に含める。

生成時は以下を保証する。

- 障害物で完全に塞がれた配置を作らない。
- 障害物、生物、回復アイテムを重ねて生成しない。
- 回避不能な至近距離には生成しない。
- 回復アイテムが極端に長時間出現しない状態を避ける。
- タッチ中の指や仮想スティックで危険物が恒常的に隠れない。
- 種ごとの同時出現数、群れサイズ、再出現待ち時間をデータで制限する。
- リリース対象100種すべてが、少なくとも1つの公開済み条件で発見可能である。

## 6. ゲーム状態とデータモデル

```ts
type GamePhase =
  | "title"
  | "playing"
  | "paused"
  | "cleared"
  | "gameOver";

interface GameSession {
  phase: GamePhase;
  depth: number;
  fuel: number;
  score: number;
  collectedSpecies: Record<string, number>;
  discoveredSpecies: Set<string>;
  elapsedSeconds: number;
}
```

エンティティの基本分類:

- `Player`: 調査艇、位置、速度、当たり判定、無敵時間
- `Species`: accepted scientific name、カテゴリ、レア度、得点、移動パターン
- `Obstacle`: 岩、クジラ、ダイオウイカ、接触ダメージ
- `RecoveryItem`: 回復量、位置、移動速度
- `DepthBand`: 深度範囲、出現テーブル、速度、密度

## 7. 技術構成

- TypeScript、Vite、Phaser 3、Phaser Arcade Physics
- Vitest、必要に応じてPlaywright
- GitHub Actionsで型、テスト、カタログ、asset manifest、ビルドを検証
- バックエンドなしの静的Webゲーム。図鑑進捗と設定だけlocalStorageへ保存

主要責務:

- SpeciesCatalogService: 検証済み生成JSONの読込、図鑑表示、外部キー解決
- SpawnSystem: 深度、環境、レア度、端末上限から出現を決定
- AssetRegistry: manifestでrelease_approvedのローカル素材だけをロード
- DiscoveryStore: accepted scientific nameをキーに発見状況を保存し、名称変更時に移行
- AccessibilityLayer: HTML UI、ARIA通知、表示・音声設定

推奨ディレクトリ:

~~~text
src/
  main.ts
  game/
    config.ts
  scenes/
  entities/
    Player.ts
    Species.ts
    Obstacle.ts
    RecoveryItem.ts
  systems/
    SpawnSystem.ts
    CollisionSystem.ts
    FuelSystem.ts
    DifficultySystem.ts
    ScoreSystem.ts
  catalog/
  accessibility/
  data/
    generated/
assets/
  manifest.csv
  species/
  audio/
docs/
  DESIGN.md
  SPECIES_CATALOG.csv
tests/
~~~

調査CSVをランタイムで直接読まず、CI／ビルド時に検証済みJSONへ変換する。システム間はイベントで連携する。

- 衝突 → player-damaged
- 生物発見 → species-discovered
- 生物獲得 → species-collected
- 回復獲得 → fuel-recovered
- 深度到達 → depth-changed
- 燃料0 → game-over
- 目標深度到達 → game-cleared

## 8. 実在深海生物100種のカタログ

### 8.1 リリース下限

初回公開版にはaccepted scientific nameが異なる実在の深海生物を最低100種収録する。偏りを防ぐため、次のカテゴリ下限をすべて満たす。カテゴリはゲーム上の便宜的区分であり、分類階級ではない。

| category | 内容 | 最低種数 |
| --- | --- | ---: |
| fish | 魚類 | 20 |
| gelatinous_plankton | クラゲ、クシクラゲ、サルパ等のゼラチン質生物／深海プランクトン | 16 |
| squid | イカ類 | 16 |
| octopus | タコ類 | 16 |
| crab | カニ類 | 16 |
| shrimp | エビ類 | 16 |

1種を複数カテゴリへ重複計上しない。101種目以降を追加しても各下限を減らしてはならない。

100種として数える条件:

- 分類学的accepted statusと、200m以深での生息・観察を信頼できる出典で確認済みである。
- 深度、カテゴリ、ゲーム内レア度、出現条件、得点が定義されている。
- リリース可能な写真または科学イラストが最低1点あり、asset manifestの審査済みである。
- 日本語名が存在しない場合は創作せず、英名またはaccepted scientific nameへフォールバックする。
- 情報と画像の出典を図鑑または帰属画面から確認でき、公開ゲーム内で発見可能である。

ゲーム内レア度はcommon、uncommon、rare、very_rare、legendaryの5段階とする。これはゲーム内出現率であり、個体数や保全状況ではない。出現は観察深度、生息環境、群れ、同時出現上限、再出現待ち時間等のデータで決める。

## 9. 種データ・分類QA

### 9.1 正本とTerra統合

- 調査・編集用の正本をdocs/SPECIES_CATALOG.csvとする。
- Terraの調査結果はこの仕様へ変換して統合し、未検証メモを直接ランタイムデータにしない。
- CSVはUTF-8、ヘッダー必須、RFC 4180互換とする。複数値はJSON配列文字列で保存する。
- Luna Maxが検証済みCSVからランタイムJSONを生成する。生成JSONを手編集しない。
- 調査値の採用、分類判断、カテゴリ割当、仕様変更はUltra承認対象とする。

### 9.2 SPECIES_CATALOG.csv

論理主キーはaccepted_scientific_nameとし、著者名を含めない。最低限次の列を持つ。

- accepted_scientific_name、scientific_name_authorship
- taxon_authority、taxon_authority_id、taxon_status
- synonyms、preferred_ja_name、ja_aliases、preferred_en_name、en_aliases
- category、rank、phylum、class、order、family
- observed_depth_min_m、observed_depth_max_m
- spawn_depth_min_m、spawn_depth_max_m、habitat_tags、ocean_regions
- game_rarity、spawn_weight、spawn_conditions、behavior_id、score
- asset_id、taxonomy_source_url、depth_source_url
- fact_ja、fact_source_url、last_verified_at、research_status、notes

制約:

- taxon_statusはrelease時accepted、taxon authorityは原則WoRMS、外部IDはAphiaID等の安定IDとする。
- spawn深度は観察深度との共通部分かつ0〜6,000m、minはmax以下とする。
- spawn_conditionsはスキーマ化したJSON objectとし、自由文だけで制御しない。
- research_statusはdraft、verified、release_approvedとする。
- 実装用slugを生成してよいが主キーにしない。accepted name変更時はUltra承認の移行表を作り、旧名をsynonymsに残す。

### 9.3 重複防止QA

- accepted scientific nameをUnicode NFC、前後空白除去、連続空白統合、大文字小文字を無視した比較キーで照合する。
- 分類機関側のaccepted nameへ解決し、synonym経由で同一taxonとなる複数行をエラーにする。
- taxon_authorityとtaxon_authority_idの組み合わせ重複もエラーにする。
- 和名・英名をUnicode NFC、空白、句読点、大文字小文字を正規化した索引で照合する。
- 一般名が正当に複数種へ使われる場合は機械的に統合せず、Ultra承認allowlistと根拠を必須にし、UIで学名を併記する。
- category下限、外部キー、深度、enum、URL、検証日、asset審査状態をCIで検証する。

## 10. 画像・出典・ライセンス

### 10.1 禁止と科学的信頼性

- 生成AIによる画像作成、image-to-image、生成補完、生成塗り足し、AIアップスケールを、開発用・公開用を問わず禁止する。
- 開発中はPhaser／CSSで描く円、矩形、線、文字等の仮図形だけ使用できる。仮図形はリリース素材として使用できない。
- 生物の公開表現は、対象taxonとの対応を確認できる実写写真または科学的に信頼できる科学イラストに限定する。別種・属レベルの画像をspecies画像として流用しない。
- 参考限定写真1枚をトレースしたり、そのポーズ・構図をコピーして派生物化したりしない。
- 独自のゲーム用原画を制作する場合、形態確認には原則として出所の異なる複数の科学資料を使い、独自のポーズ・構図とする。参照資料、確認した形態特徴、制作者を制作記録へ残す。
- 公開素材を直接加工する場合は、その素材個別のライセンスが加工と再配布を許すことを確認し、表示義務、継承条件、改変表示を満たす。
- 通常の切り抜き、縮小、圧縮もライセンス範囲内で行い、形態を誤認させる加工はしない。

優先情報源はNOAA、JAMSTEC、MBARI、博物館、大学、研究機関、査読論文、出典を追跡できるWikimedia Commons等とする。ただし掲載元の信頼性と画像ライセンスは別々に確認する。

リリース素材はPublic Domain、CC0、CC BY、CC BY-SA、またはゲーム内再配布と必要な加工を明示許諾されたものに限る。ライセンス不明、All Rights Reserved、転載禁止、出典不明、原則としてCC BY-NC／CC BY-NDは同梱しない。例外は権利者の個別許諾記録がある場合だけとする。

- reference-only素材はリポジトリ、ビルド、配信物へ同梱しない。
- 外部画像のhotlinkを禁止し、release承認済み素材をローカル配信する。
- 必要な帰属をゲーム内クレジット／図鑑とTHIRD_PARTY_ASSETS.mdの双方で確認可能にする。

### 10.2 assets/manifest.csv

asset manifestはUTF-8 CSVとし、最低限次の列を持つ。

- asset_id、accepted_scientific_name、asset_role、local_path
- source_page_url、original_file_url、title、creator
- license_id、license_url、attribution_text、modifications
- commercial_use_allowed、derivatives_allowed、redistribution_allowed
- usage_status、downloaded_at、sha256、reviewed_by、reviewed_at、notes

usage_statusはreference_only、license_review、release_approvedとする。reference_onlyはlocal_pathを空欄にし、release_approvedは出典、作者、ライセンス、帰属、ローカルパス、SHA-256、利用可否を必須とする。CIは未承認assetの参照、参考素材の同梱、外部画像URL、欠落項目、公開生物に残った仮図形をエラーにする。

## 11. モバイル性能・ロード・オーディオ

- 発売時点のミドルレンジiOS／Android端末で60fpsを目標とし、通常プレイ中30fps未満が継続しないことを最低条件とする。
- 同時アクティブエンティティ80、物理body100、デコード済みテクスチャ64MB、JS heap 128MBを初期予算とする。
- 3回連続プレイ後のheap増加が初回終了時比10%を超えて増え続けないことを確認する。
- 初回転送量は圧縮後3MB以下、Fast 4G相当で操作可能になるまで3秒以内を目標とする。
- 100種を初回一括ロードせず、深度帯ごとに遅延ロード・解放する。1深度帯パックは圧縮後5MB以下を目安とする。
- 図鑑サムネイルは1点80KB以下、ゲーム表示画像は原則1点200KB以下を目安とする。
- ブラウザの音声自動再生制限を前提に、最初の潜航開始タップ後にAudioContextを開始する。失敗してもゲームは開始できる。
- visibilitychangeでゲームと音声を停止し、復帰はユーザー操作後とする。ミュート設定はlocalStorageへ保存する。
- 音声なしでも警告、獲得、衝突、クリア条件を認識できる。

## 12. MVPスコープ

含めるもの:

- スマートフォン縦画面向けタイトル、プレイ、ポーズ、結果、設定、図鑑
- タッチ操作、safe-area、向き変更、PCキーボードフォールバック
- 自動潜航、深度、燃料、回復、衝突、無敵時間
- 岩、クジラ、ダイオウイカ等の危険・大型生物
- 実在深海生物100種以上とカテゴリ別下限
- データ駆動の出現、図鑑、ローカル発見記録
- 科学的出典、分類QA、asset manifest、ゲーム内帰属
- 深度別難易度、スコア、クリア／ゲームオーバー
- アクセシビリティ設定と性能予算を満たすレスポンシブ表示

対象外:

- オンラインランキング、クラウドセーブ、アカウント、サーバー、課金
- ストーリー会話、複数機体、強化ツリー、ボス戦、複数ステージ
- ネイティブアプリ、画面向きの強制ロック、生成画像
- accepted name未確認、権利未確認、reference-onlyの生物素材

## 13. 開発ロードマップ

1. 設計・基盤準備: 本設計、恒久開発ルール、モバイルviewport、safe-area、CI方針を確定する。
2. モバイル縦切り版: タッチ移動、自動潜航、燃料、岩、回復、クリア／失敗、PCフォールバックを仮図形で完成させる。
3. 端末品質: 向き変更、フォーカス喪失、音声解錠、アクセシビリティ、性能計測を通す。
4. カタログ基盤: SPECIES_CATALOG.csv、asset manifest、CSV→JSON生成、分類・重複・ライセンスCIを実装する。
5. 20種パイロット: 全6カテゴリを含む20種で調査、素材、帰属、出現、図鑑の工程を検証する。
6. 50種ゲート: 深度帯、レア度、遅延ロード、メモリ解放を実端末で調整する。
7. 100種リリースゲート: 最低100種とカテゴリ下限を満たし、全データ・素材をQAする。
8. 公開前品質調整: バランス、音、端末マトリクス、ロード、連続プレイ、クレジットを検証して公開する。

Terraの調査はステップ4以降へ段階統合する。調査件数が100件あっても、accepted name、深度根拠、カテゴリ、release承認assetの全条件を満たさない行は種数へ数えない。

## 14. MVP受け入れ基準

### ゲーム・端末

- iOS SafariとAndroid Chromeの発売時点の現行版・1世代前、および幅320pxの縦画面で開始から結果までプレイできる。
- safe-area内にHUDと操作が収まり、ブラウザUI伸縮後も入力座標がずれない。
- タッチだけで開始、移動、ポーズ、再開、図鑑閲覧ができ、pointer cancelや向き変更で艇が動き続けない。
- 横画面案内と継続操作、PCキーボード操作が機能する。
- 6,000mでクリア、燃料0でゲームオーバーとなり、衝突、無敵時間、回復、スコアが仕様どおり動作する。
- タッチ対象44 × 44 CSS px以上、色以外の状態表示、reduced-motion、音声ミュートが機能する。

### 100種・科学・権利

- release_approvedの一意なaccepted scientific nameが100件以上ある。
- fishが20種以上、その他5カテゴリがそれぞれ16種以上である。
- synonym解決後の重複、authority ID重複、未解決の一般名衝突が0件である。
- 100種すべてに分類、200m以深の根拠、出現深度・条件、図鑑説明、情報出典がある。
- 100種すべてにrelease_approvedのローカル写真／科学イラストがあり、作者、出典、ライセンス、帰属、利用可否、SHA-256が揃う。
- hotlink、生成画像、reference-only素材、仮図形、別taxon代替画像が公開生物素材に0件である。
- 100種すべてが公開ゲーム内のいずれかの条件で発見可能で、必要な帰属をゲーム内から確認できる。

### 技術品質

- 型、ユニットテスト、カタログQA、asset QA、プロダクションビルドが成功する。
- 初回転送、遅延ロード、fps、heap、テクスチャ予算の測定結果を記録する。
- 3連続プレイで操作不能、音声多重化、イベント増殖、継続的メモリ増加がない。
- ゲーム進行を妨げるブラウザコンソールエラーがない。

## 15. 未確定事項とMVP既定値

準備を止めないため、次を既定とする。

- 対応端末: スマートフォンブラウザ優先、縦画面9:16
- 最小viewport: 320 × 568 CSS px
- 1プレイ: 約4分、目標6,000m
- 獲得の意味: 非致死的な調査サンプル／観測データの回収
- 図鑑保存: localStorage
- 公開先: GitHub Pagesを第一候補
- 生物画像: 再利用可能な実写写真または科学イラストのみ
- 開発プレースホルダー: コード描画の単純図形のみ。公開前に全撤去

今後確認する事項は、正式名称、世界観、調査艇デザイン、振動の既定、図鑑文体、個別許諾素材を採用するかである。

## 16. 必須の開発体制

> 本プロジェクトにおけるゲーム仕様、技術設計、データ設計、受け入れ基準、および仕様変更の決定は、Ultra担当のCodexスレッドが行う。Ultraは設計書と設計レビューのみを担当し、ソースコード、テストコード、ビルド設定などの実装コードを作成・変更しない。
>
> コーディング実装は、Ultraとは別に起動した `gpt-5.6-luna`、thinking=`max` のCodexスレッドまたはサブエージェント（以下「Luna Max」）が担当する。Luna Maxは作業開始時に最新の設計書を読み、その仕様と受け入れ基準を遵守する。
>
> Luna Maxは、設計書に記載のないゲーム仕様を独断で追加・変更しない。実装中に設計判断が必要になった場合は作業を該当箇所で止め、Ultraへ設計確認または設計書の更新を依頼する。既存仕様を変えない内部的なバグ修正、リファクタリング、テスト追加は実装担当の裁量で行える。
>
> Terraは生物、分類、出典、素材候補の調査を担当できるが、未検証結果を仕様またはリリースデータとして確定しない。Ultraが採用判断を承認し、Luna Maxが検証・変換・ランタイム統合を実装する。
>
> この役割分担は新しいセッション、スレッド、サブエージェントにも継承される恒久ルールとする。実装担当は毎回、作業開始前にこの節を確認する。

設計書と `AGENTS.md` が食い違う場合は、最新のUltra承認済み設計書を正とする。
