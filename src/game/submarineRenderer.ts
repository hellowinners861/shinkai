import type Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from './config';
import {
  SEARCHLIGHT_HALF_ANGLE_RADIANS,
  SEARCHLIGHT_RANGE_PX,
} from './searchlightRules';

/**
 * The visual footprint is deliberately separate from the gameplay collision
 * circle.  The scene owns the 24px collision radius; this module only keeps
 * the code-drawn vehicle inside the documented mobile playfield bounds.
 */
export const SUBMARINE_VISUAL_BOUNDS = Object.freeze({
  minX: -34,
  maxX: 34,
  minY: -26,
  maxY: 26,
});

const GIMBAL_BASE_RADIUS = 6;

export const SUBMARINE_COLORS = Object.freeze({
  shadow: 0x02090d,
  hull: 0x0a2d3a,
  secondary: 0x164957,
  highlight: 0x2a6a73,
  glow: 0x74f2d0,
  window: 0x03131b,
  windowReflection: 0x8feaf2,
  impact: 0xff6b5e,
  lamp: 0xf1d58a,
  lampHighlight: 0xfff2c7,
});

export type SubmarinePoint = Readonly<{ x: number; y: number }>;

export type SubmarineVisualPrimitive =
  | Readonly<{
    kind: 'ellipse';
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>
  | Readonly<{
    kind: 'circle';
    id: string;
    x: number;
    y: number;
    radius: number;
  }>
  | Readonly<{
    kind: 'polygon';
    id: string;
    points: readonly SubmarinePoint[];
  }>
  | Readonly<{
    kind: 'line';
    id: string;
    points: readonly SubmarinePoint[];
  }>;

/**
 * Every static silhouette primitive is listed here so its bounds can be
 * tested without starting Phaser.  The gimbal primitives are local to the
 * player-centred rotating container and stay within the same footprint.
 */
export const SUBMARINE_VISUAL_GEOMETRY: readonly SubmarineVisualPrimitive[] =
  Object.freeze([
    { kind: 'ellipse', id: 'shadow', x: 0, y: 3, width: 64, height: 32 },
    {
      kind: 'polygon',
      id: 'tail-fin-top',
      points: [
        { x: -33.5, y: -6 },
        { x: -27, y: -15 },
        { x: -18, y: -12 },
        { x: -21, y: -5 },
      ],
    },
    {
      kind: 'polygon',
      id: 'tail-fin-bottom',
      points: [
        { x: -33.5, y: 6 },
        { x: -27, y: 15 },
        { x: -18, y: 12 },
        { x: -21, y: 5 },
      ],
    },
    {
      kind: 'circle',
      id: 'thruster-ring',
      x: -30,
      y: 0,
      radius: 3.5,
    },
    { kind: 'ellipse', id: 'pressure-hull', x: 0, y: 0, width: 64, height: 32 },
    { kind: 'circle', id: 'observation-dome', x: 28, y: 0, radius: 5.5 },
    {
      kind: 'circle',
      id: 'gimbal-base',
      x: 0,
      y: 0,
      radius: GIMBAL_BASE_RADIUS,
    },
    {
      kind: 'polygon',
      id: 'observation-tower',
      points: [
        { x: -9, y: -14 },
        { x: -6, y: -23 },
        { x: 2, y: -23 },
        { x: 6, y: -14 },
      ],
    },
    {
      kind: 'line',
      id: 'antenna',
      points: [
        { x: -2, y: -23 },
        { x: -2, y: -26 },
      ],
    },
    { kind: 'circle', id: 'window-aft', x: -8, y: 0, radius: 4 },
    { kind: 'circle', id: 'window-mid', x: 4, y: 0, radius: 5 },
    { kind: 'circle', id: 'window-forward', x: 17, y: 0, radius: 7 },
    {
      kind: 'polygon',
      id: 'lower-skid',
      points: [
        { x: -19, y: 15 },
        { x: -15, y: 24 },
        { x: 13, y: 24 },
        { x: 17, y: 15 },
      ],
    },
    {
      kind: 'line',
      id: 'gimbal-yoke-top',
      points: [
        { x: 0, y: -5 },
        { x: 12, y: -5 },
      ],
    },
    {
      kind: 'line',
      id: 'gimbal-yoke-bottom',
      points: [
        { x: 0, y: 5 },
        { x: 12, y: 5 },
      ],
    },
    {
      kind: 'circle',
      id: 'lamp-lens',
      x: 20,
      y: 0,
      radius: 3,
    },
  ] as const);

export interface SearchlightBeamLayer {
  readonly id: 'outer' | 'middle' | 'inner' | 'core';
  readonly range: number;
  readonly halfAngleRadians: number;
  readonly alpha: number;
  readonly color: number;
}

/** The exact visual beam layers; the outer layer is the gameplay boundary. */
export const SEARCHLIGHT_BEAM_LAYERS: readonly SearchlightBeamLayer[] =
  Object.freeze([
    Object.freeze({
      id: 'outer' as const,
      range: SEARCHLIGHT_RANGE_PX,
      halfAngleRadians: SEARCHLIGHT_HALF_ANGLE_RADIANS,
      alpha: 0.028,
      color: SUBMARINE_COLORS.lamp,
    }),
    Object.freeze({
      id: 'middle' as const,
      range: 250,
      halfAngleRadians: degreesToRadians(12.5),
      alpha: 0.04,
      color: SUBMARINE_COLORS.lamp,
    }),
    Object.freeze({
      id: 'inner' as const,
      range: 238,
      halfAngleRadians: degreesToRadians(7),
      alpha: 0.06,
      color: SUBMARINE_COLORS.lamp,
    }),
    Object.freeze({
      id: 'core' as const,
      range: 208,
      halfAngleRadians: degreesToRadians(2.8),
      alpha: 0.05,
      color: SUBMARINE_COLORS.lamp,
    }),
  ]);

export interface SearchlightBeamVertices {
  readonly origin: SubmarinePoint;
  readonly left: SubmarinePoint;
  readonly right: SubmarinePoint;
}

export interface SubmarineView {
  readonly root: Phaser.GameObjects.Container;
  readonly shadow: Phaser.GameObjects.Graphics;
  readonly structure: Phaser.GameObjects.Graphics;
  readonly windows: Phaser.GameObjects.Graphics;
  readonly thruster: Phaser.GameObjects.Graphics;
  readonly gimbalBase: Phaser.GameObjects.Graphics;
  readonly gimbal: Phaser.GameObjects.Container;
  readonly gimbalGraphics: Phaser.GameObjects.Graphics;
  impact: boolean;
}

export interface SubmarineViewState {
  readonly angleRadians: number;
  readonly elapsedSeconds: number;
  readonly impact: boolean;
  readonly reducedMotion: boolean;
}

/** Returns the hull outline color for the current impact state. */
export function getSubmarineOutlineColor(impact: boolean): number {
  return impact ? SUBMARINE_COLORS.impact : SUBMARINE_COLORS.glow;
}

/** Returns the slow, low-amplitude thruster pulse required by V4. */
export function getThrusterAlpha(
  elapsedSeconds: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || !Number.isFinite(elapsedSeconds)) {
    return 0.52;
  }

  const phase = (elapsedSeconds % 1.2) / 1.2 * Math.PI * 2;
  return 0.52 + Math.sin(phase) * 0.1;
}

/** Keeps a renderer angle finite without changing the gameplay heading. */
export function getSubmarineLightRotationRadians(angleRadians: number): number {
  return Number.isFinite(angleRadians) ? angleRadians : 0;
}

/** Returns one triangular layer without mutating Phaser state. */
export function getSearchlightBeamVertices(
  origin: SubmarinePoint,
  angleRadians: number,
  layer: SearchlightBeamLayer,
): SearchlightBeamVertices {
  const safeOrigin = {
    x: finiteOrZero(origin.x),
    y: finiteOrZero(origin.y),
  };
  const safeAngle = getSubmarineLightRotationRadians(angleRadians);
  const leftAngle = safeAngle - layer.halfAngleRadians;
  const rightAngle = safeAngle + layer.halfAngleRadians;

  return {
    origin: safeOrigin,
    left: {
      x: safeOrigin.x + Math.cos(leftAngle) * layer.range,
      y: safeOrigin.y + Math.sin(leftAngle) * layer.range,
    },
    right: {
      x: safeOrigin.x + Math.cos(rightAngle) * layer.range,
      y: safeOrigin.y + Math.sin(rightAngle) * layer.range,
    },
  };
}

/** Draws the four static-opacity beam layers. No center line or scan stripe. */
export function drawSearchlightBeam(
  graphics: Phaser.GameObjects.Graphics,
  origin: SubmarinePoint,
  angleRadians: number,
): void {
  graphics.clear();
  for (const layer of SEARCHLIGHT_BEAM_LAYERS) {
    const vertices = getSearchlightBeamVertices(origin, angleRadians, layer);
    graphics.fillStyle(layer.color, layer.alpha);
    graphics.beginPath();
    graphics.moveTo(vertices.origin.x, vertices.origin.y);
    graphics.lineTo(vertices.left.x, vertices.left.y);
    graphics.lineTo(vertices.right.x, vertices.right.y);
    graphics.closePath();
    graphics.fillPath();
  }
}

/** Creates the code-drawn research vessel and its centre-pivot gimbal. */
export function createSubmarineView(scene: Phaser.Scene): SubmarineView {
  const shadow = scene.add.graphics();
  const structure = scene.add.graphics();
  const windows = scene.add.graphics();
  const thruster = scene.add.graphics();
  const gimbalBase = scene.add.graphics();
  const gimbalGraphics = scene.add.graphics();
  const gimbal = scene.add.container(0, 0);
  const root = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

  root.add([shadow, structure, windows, thruster, gimbalBase, gimbal]);
  gimbal.add(gimbalGraphics);
  root.setDepth(40);

  const view: SubmarineView = {
    root,
    shadow,
    structure,
    windows,
    thruster,
    gimbalBase,
    gimbal,
    gimbalGraphics,
    impact: false,
  };
  redrawSubmarineView(view, false);
  updateSubmarineView(view, {
    angleRadians: 0,
    elapsedSeconds: 0,
    impact: false,
    reducedMotion: false,
  });
  return view;
}

/** Applies angle, impact outline, and reduced-motion thruster state. */
export function updateSubmarineView(
  view: SubmarineView,
  state: SubmarineViewState,
): void {
  const safeAngle = getSubmarineLightRotationRadians(state.angleRadians);
  view.gimbal.setRotation(safeAngle);
  view.thruster.setAlpha(
    getThrusterAlpha(state.elapsedSeconds, state.reducedMotion),
  );

  if (view.impact !== state.impact) {
    redrawSubmarineView(view, state.impact);
  }
}

/** Explicitly destroys every child owned by the renderer. */
export function destroySubmarineView(view: SubmarineView | undefined): void {
  view?.root.destroy(true);
}

function redrawSubmarineView(view: SubmarineView, impact: boolean): void {
  const outline = getSubmarineOutlineColor(impact);
  view.impact = impact;

  view.shadow.clear();
  view.shadow.fillStyle(SUBMARINE_COLORS.shadow, 0.7);
  view.shadow.fillEllipse(0, 3, 64, 32);

  drawStructure(view.structure, outline);
  drawWindows(view.windows);
  drawThruster(view.thruster, outline);
  drawGimbalBase(view.gimbalBase);
  drawGimbal(view.gimbalGraphics, outline);
}

function drawStructure(
  graphics: Phaser.GameObjects.Graphics,
  outline: number,
): void {
  graphics.clear();

  graphics.fillStyle(SUBMARINE_COLORS.secondary, 0.92);
  drawPolygon(graphics, [
    { x: -33.5, y: -6 },
    { x: -27, y: -15 },
    { x: -18, y: -12 },
    { x: -21, y: -5 },
  ]);
  drawPolygon(graphics, [
    { x: -33.5, y: 6 },
    { x: -27, y: 15 },
    { x: -18, y: 12 },
    { x: -21, y: 5 },
  ]);
  graphics.lineStyle(1, outline, 0.58);
  drawClosedPolyline(graphics, [
    { x: -33.5, y: -6 },
    { x: -27, y: -15 },
    { x: -18, y: -12 },
    { x: -21, y: -5 },
  ]);
  drawClosedPolyline(graphics, [
    { x: -33.5, y: 6 },
    { x: -27, y: 15 },
    { x: -18, y: 12 },
    { x: -21, y: 5 },
  ]);

  graphics.fillStyle(SUBMARINE_COLORS.hull, 1);
  graphics.fillEllipse(0, 0, 64, 32);
  graphics.fillStyle(SUBMARINE_COLORS.secondary, 0.48);
  graphics.fillEllipse(0, 7, 60, 14);
  graphics.lineStyle(2, outline, 0.9);
  graphics.strokeEllipse(0, 0, 64, 32);

  graphics.fillStyle(SUBMARINE_COLORS.secondary, 0.96);
  graphics.fillCircle(28, 0, 5.5);
  graphics.lineStyle(1, SUBMARINE_COLORS.highlight, 0.9);
  graphics.strokeCircle(28, 0, 5.5);

  graphics.fillStyle(SUBMARINE_COLORS.secondary, 0.96);
  drawPolygon(graphics, [
    { x: -9, y: -14 },
    { x: -6, y: -23 },
    { x: 2, y: -23 },
    { x: 6, y: -14 },
  ]);
  graphics.lineStyle(1, outline, 0.88);
  drawPolyline(graphics, [
    { x: -9, y: -14 },
    { x: -6, y: -23 },
    { x: 2, y: -23 },
    { x: 6, y: -14 },
  ]);
  graphics.lineStyle(1, SUBMARINE_COLORS.highlight, 0.9);
  drawPolyline(graphics, [
    { x: -2, y: -23 },
    { x: -2, y: -26 },
  ]);

  graphics.fillStyle(SUBMARINE_COLORS.secondary, 0.9);
  drawPolygon(graphics, [
    { x: -19, y: 15 },
    { x: -15, y: 24 },
    { x: 13, y: 24 },
    { x: 17, y: 15 },
  ]);
  graphics.lineStyle(1, outline, 0.88);
  drawPolyline(graphics, [
    { x: -19, y: 15 },
    { x: -15, y: 24 },
    { x: 13, y: 24 },
    { x: 17, y: 15 },
  ]);
}

function drawWindows(graphics: Phaser.GameObjects.Graphics): void {
  graphics.clear();
  for (const window of [
    { x: -8, radius: 4 },
    { x: 4, radius: 5 },
    { x: 17, radius: 7 },
  ]) {
    graphics.fillStyle(SUBMARINE_COLORS.window, 1);
    graphics.fillCircle(window.x, 0, window.radius);
    graphics.lineStyle(1, SUBMARINE_COLORS.glow, 0.82);
    graphics.strokeCircle(window.x, 0, window.radius);
    graphics.fillStyle(SUBMARINE_COLORS.windowReflection, 0.72);
    graphics.fillRect(
      window.x - window.radius * 0.35,
      -window.radius * 0.48,
      Math.max(1, window.radius * 0.34),
      Math.max(1, window.radius * 0.22),
    );
  }
}

function drawThruster(
  graphics: Phaser.GameObjects.Graphics,
  outline: number,
): void {
  graphics.clear();
  graphics.fillStyle(SUBMARINE_COLORS.window, 1);
  graphics.fillCircle(-30, 0, 3.5);
  graphics.lineStyle(1, outline, 0.86);
  graphics.strokeCircle(-30, 0, 3.5);
  graphics.fillStyle(SUBMARINE_COLORS.glow, 0.5);
  graphics.fillRect(-34, -1, 3, 2);
  graphics.lineStyle(1, SUBMARINE_COLORS.highlight, 0.8);
  graphics.beginPath();
  graphics.moveTo(-27, -2);
  graphics.lineTo(-23, -2);
  graphics.moveTo(-27, 2);
  graphics.lineTo(-23, 2);
  graphics.strokePath();
}

function drawGimbalBase(graphics: Phaser.GameObjects.Graphics): void {
  graphics.clear();
  graphics.fillStyle(SUBMARINE_COLORS.shadow, 0.95);
  graphics.fillCircle(0, 0, GIMBAL_BASE_RADIUS);
  graphics.lineStyle(1, SUBMARINE_COLORS.highlight, 0.9);
  graphics.strokeCircle(0, 0, GIMBAL_BASE_RADIUS);
}

function drawGimbal(
  graphics: Phaser.GameObjects.Graphics,
  outline: number,
): void {
  graphics.clear();
  graphics.lineStyle(2, outline, 0.92);
  graphics.beginPath();
  graphics.moveTo(0, -5);
  graphics.lineTo(12, -5);
  graphics.moveTo(0, 5);
  graphics.lineTo(12, 5);
  graphics.strokePath();

  graphics.fillStyle(SUBMARINE_COLORS.secondary, 1);
  graphics.fillRect(10, -4, 10, 8);
  graphics.lineStyle(1, outline, 0.9);
  graphics.strokeRect(10, -4, 10, 8);
  graphics.fillStyle(SUBMARINE_COLORS.lamp, 0.95);
  graphics.fillCircle(20, 0, 3);
  graphics.fillStyle(SUBMARINE_COLORS.lampHighlight, 0.82);
  graphics.fillCircle(19, -1, 1);
}

function drawPolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly SubmarinePoint[],
): void {
  const first = points[0];
  if (!first) {
    return;
  }
  graphics.beginPath();
  graphics.moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.closePath();
  graphics.fillPath();
}

function drawPolyline(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly SubmarinePoint[],
): void {
  const first = points[0];
  if (!first) {
    return;
  }
  graphics.beginPath();
  graphics.moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.strokePath();
}

function drawClosedPolyline(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly SubmarinePoint[],
): void {
  const first = points[0];
  if (!first) {
    return;
  }
  graphics.beginPath();
  graphics.moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }
  graphics.closePath();
  graphics.strokePath();
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
