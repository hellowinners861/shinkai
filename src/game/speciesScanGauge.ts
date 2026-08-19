import type Phaser from 'phaser';

/** The two fixed-size world gauges used by ordinary and set-piece species. */
export type SpeciesScanGaugeKind = 'normal' | 'large';

export type SpeciesScanGaugeDisplayState =
  | 'hidden'
  | 'active'
  | 'residual'
  | 'completed';

export const SPECIES_SCAN_GAUGE_COLORS = Object.freeze({
  track: 0x02090d,
  normalFrame: 0x6bd9e8,
  activeFill: 0xf1d58a,
  residualFill: 0x2a6a73,
  completed: 0x74f2d0,
});

export interface SpeciesScanGaugeGeometry {
  readonly width: number;
  readonly height: number;
  readonly fillWidth: number;
  readonly fillHeight: number;
  readonly offsetY: number;
  readonly cornerRadius: number;
}

export const SPECIES_SCAN_GAUGE_GEOMETRY: Readonly<
  Record<SpeciesScanGaugeKind, SpeciesScanGaugeGeometry>
> = Object.freeze({
  normal: Object.freeze({
    width: 40,
    height: 7,
    fillWidth: 36,
    fillHeight: 3,
    offsetY: 38,
    cornerRadius: 2,
  }),
  large: Object.freeze({
    width: 54,
    height: 8,
    fillWidth: 50,
    fillHeight: 4,
    offsetY: 82,
    cornerRadius: 2,
  }),
});

/** The fixed safe world bounds for the gauge anchor, independent of species position. */
export interface SpeciesScanGaugeBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const SPECIES_SCAN_GAUGE_BOUNDS: Readonly<
  Record<SpeciesScanGaugeKind, SpeciesScanGaugeBounds>
> = Object.freeze({
  normal: Object.freeze({
    minX: 22,
    maxX: 428,
    minY: 116,
    maxY: 614,
  }),
  large: Object.freeze({
    minX: 29,
    maxX: 421,
    minY: 116,
    maxY: 614,
  }),
});

export const SPECIES_SCAN_GAUGE_COMPLETION_HOLD_SECONDS = 0.30;
export const SPECIES_SCAN_GAUGE_DEPTH = 31;

export interface SpeciesScanGaugePosition {
  readonly x: number;
  readonly y: number;
}

export interface SpeciesScanGaugeStateInput {
  readonly kind: SpeciesScanGaugeKind;
  readonly progressSeconds: number;
  readonly requiredSeconds: number;
  readonly illuminated: boolean;
  readonly completed: boolean;
}

export interface SpeciesScanGaugeState {
  readonly kind: SpeciesScanGaugeKind;
  readonly displayState: SpeciesScanGaugeDisplayState;
  readonly progressRatio: number;
  readonly visible: boolean;
  readonly frameColor: number;
  readonly fillColor: number;
  readonly alpha: number;
}

export interface SpeciesScanGaugeView {
  readonly root: Phaser.GameObjects.Container;
  readonly track: Phaser.GameObjects.Graphics;
  readonly fill: Phaser.GameObjects.Rectangle;
  readonly kind: SpeciesScanGaugeKind;
  displayState: SpeciesScanGaugeDisplayState;
}

/** Converts seconds to a finite 0..1 fill ratio. */
export function normalizeSpeciesScanGaugeProgress(
  progressSeconds: number,
  requiredSeconds: number,
): number {
  if (!Number.isFinite(progressSeconds) ||
    !Number.isFinite(requiredSeconds) ||
    requiredSeconds <= 0) {
    return 0;
  }

  return clamp(progressSeconds / requiredSeconds, 0, 1);
}

/** Returns the presentation state without performing scan or target logic. */
export function getSpeciesScanGaugeState(
  input: SpeciesScanGaugeStateInput,
): SpeciesScanGaugeState {
  const progressRatio = input.completed
    ? 1
    : normalizeSpeciesScanGaugeProgress(
      input.progressSeconds,
      input.requiredSeconds,
    );
  const displayState: SpeciesScanGaugeDisplayState = input.completed
    ? 'completed'
    : input.illuminated
      ? 'active'
      : progressRatio > 0
        ? 'residual'
        : 'hidden';

  const visible = displayState !== 'hidden';
  const frameColor = displayState === 'completed'
    ? SPECIES_SCAN_GAUGE_COLORS.completed
    : SPECIES_SCAN_GAUGE_COLORS.normalFrame;
  const fillColor = displayState === 'completed'
    ? SPECIES_SCAN_GAUGE_COLORS.completed
    : displayState === 'active'
      ? SPECIES_SCAN_GAUGE_COLORS.activeFill
      : SPECIES_SCAN_GAUGE_COLORS.residualFill;
  const alpha = displayState === 'residual' ? 0.62 : 1;

  return {
    kind: input.kind,
    displayState,
    progressRatio,
    visible,
    frameColor,
    fillColor,
    alpha,
  };
}

/** Places the gauge above its target while keeping the gauge anchor in bounds. */
export function getSpeciesScanGaugePosition(
  kind: SpeciesScanGaugeKind,
  centerX: number,
  centerY: number,
): SpeciesScanGaugePosition {
  const geometry = SPECIES_SCAN_GAUGE_GEOMETRY[kind];
  const bounds = SPECIES_SCAN_GAUGE_BOUNDS[kind];
  const safeX = finiteOrZero(centerX);
  const safeY = finiteOrZero(centerY);

  return {
    x: clamp(safeX, bounds.minX, bounds.maxX),
    y: clamp(
      safeY - geometry.offsetY,
      bounds.minY,
      bounds.maxY,
    ),
  };
}

/** Returns true once the fixed full-gauge confirmation window has elapsed. */
export function isSpeciesScanGaugeCompletionHoldElapsed(
  completedAtSeconds: number | undefined,
  elapsedSeconds: number,
): boolean {
  return completedAtSeconds !== undefined &&
    Number.isFinite(completedAtSeconds) &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds - completedAtSeconds >=
      SPECIES_SCAN_GAUGE_COMPLETION_HOLD_SECONDS - 1e-9;
}

/** Creates a fixed-size, code-drawn world gauge. */
export function createSpeciesScanGaugeView(
  scene: Phaser.Scene,
  kind: SpeciesScanGaugeKind,
): SpeciesScanGaugeView {
  const geometry = SPECIES_SCAN_GAUGE_GEOMETRY[kind];
  const track = scene.add.graphics();
  const fill = scene.add
    .rectangle(
      -geometry.fillWidth / 2,
      0,
      geometry.fillWidth,
      geometry.fillHeight,
      SPECIES_SCAN_GAUGE_COLORS.residualFill,
    )
    .setOrigin(0, 0.5);
  const root = scene.add
    .container(0, 0)
    .setDepth(SPECIES_SCAN_GAUGE_DEPTH);

  root.add([track, fill]);
  drawGaugeTrack(track, geometry, SPECIES_SCAN_GAUGE_COLORS.normalFrame);

  const view: SpeciesScanGaugeView = {
    root,
    track,
    fill,
    kind,
    displayState: 'hidden',
  };
  updateSpeciesScanGaugeView(view, {
    centerX: 0,
    centerY: 0,
    progressSeconds: 0,
    requiredSeconds: 1,
    illuminated: false,
    completed: false,
  });
  return view;
}

export interface SpeciesScanGaugeViewUpdate {
  readonly centerX: number;
  readonly centerY: number;
  readonly progressSeconds: number;
  readonly requiredSeconds: number;
  readonly illuminated: boolean;
  readonly completed: boolean;
}

/** Applies pure gauge state and position without introducing animation. */
export function updateSpeciesScanGaugeView(
  view: SpeciesScanGaugeView,
  input: SpeciesScanGaugeViewUpdate,
): SpeciesScanGaugeState {
  const state = getSpeciesScanGaugeState({
    kind: view.kind,
    progressSeconds: input.progressSeconds,
    requiredSeconds: input.requiredSeconds,
    illuminated: input.illuminated,
    completed: input.completed,
  });
  const geometry = SPECIES_SCAN_GAUGE_GEOMETRY[view.kind];
  const position = getSpeciesScanGaugePosition(
    view.kind,
    input.centerX,
    input.centerY,
  );

  view.root.setPosition(position.x, position.y);
  view.root.setVisible(state.visible);
  view.root.setAlpha(state.alpha);
  view.fill.setFillStyle(state.fillColor, 1);
  view.fill.setScale(state.progressRatio, 1);

  if (view.displayState !== state.displayState) {
    drawGaugeTrack(view.track, geometry, state.frameColor);
    view.displayState = state.displayState;
  }

  return state;
}

/** Destroys the complete gauge view, including its child track and fill. */
export function destroySpeciesScanGaugeView(
  view: SpeciesScanGaugeView | undefined,
): void {
  view?.root.destroy(true);
}

function drawGaugeTrack(
  graphics: Phaser.GameObjects.Graphics,
  geometry: SpeciesScanGaugeGeometry,
  frameColor: number,
): void {
  graphics.clear();
  graphics.fillStyle(SPECIES_SCAN_GAUGE_COLORS.track, 0.88);
  graphics.fillRoundedRect(
    -geometry.width / 2,
    -geometry.height / 2,
    geometry.width,
    geometry.height,
    geometry.cornerRadius,
  );
  graphics.lineStyle(1, frameColor, 1);
  graphics.strokeRoundedRect(
    -geometry.width / 2,
    -geometry.height / 2,
    geometry.width,
    geometry.height,
    geometry.cornerRadius,
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
