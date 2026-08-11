# Luna Max tasks

共通: `C:\Users\hello\shinkai` で作業。最初に `AGENTS.md` と `docs/DESIGN.md` を読む。`gpt-5.6-luna`、thinking=`max`。画像・研究CSV・設計書は変更しない。commit/pushしない。

## 1. Mobile layout

編集可能: `index.html`, `src/game/config.ts`, `src/main.ts`, `src/style.css`, `tests/config.test.ts`。

450×800、Phaser FIT/CENTER_BOTH、DPR上限2、viewport-fit=cover、safe-area、最小320×568、Canvas内touch-actionを実装・検証する。

## 2. Touch input

新規ファイルだけ使用: `src/input/VirtualJoystick.ts`, `tests/virtualJoystick.test.ts`。

浮動ジョイスティックの純粋な入力計算と、pointer up/cancel時に中立へ戻す処理を実装・テストする。Sceneへはまだ接続しない。

## 3. Lifecycle and orientation

新規ファイルだけ使用: `src/platform/mobileLifecycle.ts`, `tests/mobileLifecycle.test.ts`。

visibilitychange、blur、向き変更、横向き案内に必要な状態処理を実装・テストする。既存Sceneへはまだ接続しない。

## 4. Integration

タスク1〜3完了後だけ開始。全変更をレビューし、`BootScene`、`TitleScene`、必要なCSS、READMEへ接続する。競合や設計逸脱を直し、typecheck、test、buildを実行する。生物本編と画像は実装しない。

## 5. Ultra UI redesign implementation

タスク1〜4の挙動を維持し、`docs/UI_DESIGN.md`「Abyssal Field Console」を実装する。

編集可能: `index.html`, `src/style.css`, `src/main.ts`, `src/scenes/TitleScene.ts`, `src/scenes/GameScene.ts`、UI文言に直接関係するテスト。必要ならREADMEの画面説明のみ。

ゲーム定数、入力計算、ライフサイクル状態遷移、生物データ、研究CSV、画像、ビルド／配信設定は変更しない。画像生成、外部画像、外部フォント、hotlinkを使わない。指定viewportで重なりを確認し、typecheck、test、buildを通す。commit/pushしない。
