import type { SpeciesCatalogCategory } from './speciesPixelIcons';

/** Fixed logical bounds shared by every category behaviour. */
export const SPECIES_BEHAVIOR_BOUNDS = Object.freeze({
  left: 0,
  right: 450,
  top: 96,
  bottom: 680,
});

export const SPECIES_CATEGORY_BEHAVIOR_KINDS = [
  'fish_snake',
  'gelatinous_float',
  'squid_burst',
  'octopus_crawl',
  'crab_stop_go',
  'shrimp_zigzag',
  'other_drift',
] as const;

export type SpeciesCategoryBehaviorKind =
  (typeof SPECIES_CATEGORY_BEHAVIOR_KINDS)[number];

export type SpeciesBehaviorAxis = 'horizontal' | 'vertical';

export interface SpeciesBehaviorSpecies {
  readonly sourceCatalogId: string;
  readonly category: SpeciesCatalogCategory;
}

export interface SpeciesCategoryBehaviorDefinition {
  readonly category: SpeciesCatalogCategory;
  readonly kind: SpeciesCategoryBehaviorKind;
  readonly axis: SpeciesBehaviorAxis;
  readonly description: string;
}

export interface SpeciesBehaviorProfile extends SpeciesCategoryBehaviorDefinition {
  readonly direction: -1 | 1;
  readonly baseSpeedPxPerSecond: number;
  readonly amplitudePx: number;
  readonly frequencyHz: number;
  readonly phaseRadians: number;
  readonly laneCoordinate: number;
  readonly cycleSeconds: number;
}

export interface SpeciesBehaviorPoint {
  readonly x: number;
  readonly y: number;
}

export interface SpeciesBehaviorPlan extends SpeciesBehaviorProfile {
  readonly start: SpeciesBehaviorPoint;
  readonly end: SpeciesBehaviorPoint;
  readonly radius: number;
}

export interface SpeciesBehaviorVisualState {
  readonly alpha: number;
  readonly scale: number;
}

const CATEGORY_DEFINITIONS: Readonly<
  Record<SpeciesCatalogCategory, SpeciesCategoryBehaviorDefinition>
> = Object.freeze({
  fish: Object.freeze({
    category: 'fish',
    kind: 'fish_snake',
    axis: 'horizontal',
    description: '一定速の左右横断と小さな上下蛇行',
  }),
  gelatinous_plankton: Object.freeze({
    category: 'gelatinous_plankton',
    kind: 'gelatinous_float',
    axis: 'vertical',
    description: 'ゆっくり浮上しながら左右へ漂流',
  }),
  squid: Object.freeze({
    category: 'squid',
    kind: 'squid_burst',
    axis: 'horizontal',
    description: '加速と滑走を繰り返す横断',
  }),
  octopus: Object.freeze({
    category: 'octopus',
    kind: 'octopus_crawl',
    axis: 'horizontal',
    description: '下層を這い、短く停止する',
  }),
  crab: Object.freeze({
    category: 'crab',
    kind: 'crab_stop_go',
    axis: 'horizontal',
    description: '底部を低速でストップ＆ゴー移動',
  }),
  shrimp: Object.freeze({
    category: 'shrimp',
    kind: 'shrimp_zigzag',
    axis: 'horizontal',
    description: '高速で細かくジグザグする',
  }),
  other_invertebrate: Object.freeze({
    category: 'other_invertebrate',
    kind: 'other_drift',
    axis: 'vertical',
    description: 'ごく遅い上下漂流と小さな揺れ',
  }),
});

const TWO_PI = Math.PI * 2;
const MAX_BEHAVIOR_TIME_SECONDS = 1_000_000;

/** Returns the immutable category behaviour definition. */
export function getSpeciesCategoryBehaviorDefinition(
  category: SpeciesCatalogCategory,
): SpeciesCategoryBehaviorDefinition {
  return CATEGORY_DEFINITIONS[category] ?? CATEGORY_DEFINITIONS.other_invertebrate;
}

export const getCategoryBehaviorDefinition =
  getSpeciesCategoryBehaviorDefinition;

/**
 * Creates a deterministic behaviour profile from species identity and spawn
 * ordinal. No runtime random state is consumed.
 */
export function getSpeciesBehaviorProfile(
  species: SpeciesBehaviorSpecies,
  spawnOrdinal: number,
): SpeciesBehaviorProfile {
  const definition = getSpeciesCategoryBehaviorDefinition(species.category);
  const ordinal = normalizeOrdinal(spawnOrdinal);
  const id = typeof species.sourceCatalogId === 'string'
    ? species.sourceCatalogId
    : '';
  const unit = (salt: string): number => deterministicUnit(id, ordinal, salt);
  // Gelatinous plankton always rises in the V3 presentation. Other vertical
  // categories may still use their deterministic phase/direction, but a
  // jelly drifting downward would contradict the category's readable cue.
  const direction: -1 | 1 = definition.kind === 'gelatinous_float'
    ? -1
    : unit('direction') < 0.5 ? -1 : 1;

  let baseSpeedPxPerSecond: number;
  let amplitudePx: number;
  let frequencyHz: number;
  let laneCoordinate: number;
  let cycleSeconds = 0;

  switch (definition.kind) {
    case 'fish_snake':
      baseSpeedPxPerSecond = 68 + unit('speed') * 20;
      amplitudePx = 10 + unit('amplitude') * 14;
      frequencyHz = 0.45 + unit('frequency') * 0.25;
      laneCoordinate = 160 + unit('lane') * 380;
      break;
    case 'gelatinous_float':
      baseSpeedPxPerSecond = 24 + unit('speed') * 12;
      amplitudePx = 25 + unit('amplitude') * 24;
      frequencyHz = 0.16 + unit('frequency') * 0.16;
      laneCoordinate = 55 + unit('lane') * 340;
      break;
    case 'squid_burst':
      baseSpeedPxPerSecond = 54 + unit('speed') * 28;
      amplitudePx = 8 + unit('amplitude') * 18;
      frequencyHz = 0.45 + unit('frequency') * 0.2;
      laneCoordinate = 150 + unit('lane') * 390;
      break;
    case 'octopus_crawl':
      baseSpeedPxPerSecond = 30 + unit('speed') * 12;
      amplitudePx = 2 + unit('amplitude') * 4;
      frequencyHz = 0.18 + unit('frequency') * 0.12;
      laneCoordinate = 548 + unit('lane') * 78;
      cycleSeconds = 2 + unit('cycle') * 1.2;
      break;
    case 'crab_stop_go':
      baseSpeedPxPerSecond = 22 + unit('speed') * 10;
      amplitudePx = 1 + unit('amplitude') * 2;
      frequencyHz = 0.12 + unit('frequency') * 0.1;
      laneCoordinate = 625 + unit('lane') * 30;
      cycleSeconds = 2.4 + unit('cycle') * 1.6;
      break;
    case 'shrimp_zigzag':
      baseSpeedPxPerSecond = 98 + unit('speed') * 35;
      amplitudePx = 20 + unit('amplitude') * 22;
      frequencyHz = 1.2 + unit('frequency') * 0.8;
      laneCoordinate = 170 + unit('lane') * 390;
      break;
    case 'other_drift':
      baseSpeedPxPerSecond = 12 + unit('speed') * 12;
      amplitudePx = 8 + unit('amplitude') * 14;
      frequencyHz = 0.12 + unit('frequency') * 0.12;
      laneCoordinate = 60 + unit('lane') * 330;
      break;
  }

  return Object.freeze({
    ...definition,
    direction,
    baseSpeedPxPerSecond,
    amplitudePx,
    frequencyHz,
    phaseRadians: unit('phase') * TWO_PI,
    laneCoordinate,
    cycleSeconds,
  });
}

export const getCategoryBehaviorProfile = getSpeciesBehaviorProfile;

/** Creates an off-screen plan whose path is specific to the category. */
export function createSpeciesBehaviorPlan(
  species: SpeciesBehaviorSpecies,
  spawnOrdinal: number,
  radius = 20,
): SpeciesBehaviorPlan {
  const profile = getSpeciesBehaviorProfile(species, spawnOrdinal);
  const safeRadius = Number.isFinite(radius)
    ? Math.min(Math.max(radius, 0), 1_000)
    : 20;

  if (profile.axis === 'horizontal') {
    const startX = profile.direction > 0
      ? SPECIES_BEHAVIOR_BOUNDS.left - safeRadius
      : SPECIES_BEHAVIOR_BOUNDS.right + safeRadius;
    const endX = profile.direction > 0
      ? SPECIES_BEHAVIOR_BOUNDS.right + safeRadius
      : SPECIES_BEHAVIOR_BOUNDS.left - safeRadius;
    const startY = getHorizontalY(profile, 0);
    return Object.freeze({
      ...profile,
      start: Object.freeze({ x: startX, y: startY }),
      end: Object.freeze({ x: endX, y: startY }),
      radius: safeRadius,
    });
  }

  const startY = profile.direction < 0
    ? SPECIES_BEHAVIOR_BOUNDS.bottom + safeRadius
    : SPECIES_BEHAVIOR_BOUNDS.top - safeRadius;
  const endY = profile.direction < 0
    ? SPECIES_BEHAVIOR_BOUNDS.top - safeRadius
    : SPECIES_BEHAVIOR_BOUNDS.bottom + safeRadius;
  const startX = getVerticalX(profile, 0);
  return Object.freeze({
    ...profile,
    start: Object.freeze({ x: startX, y: startY }),
    end: Object.freeze({ x: startX, y: endY }),
    radius: safeRadius,
  });
}

export const getSpeciesBehaviorPlan = createSpeciesBehaviorPlan;

/** Returns a finite position after a non-negative amount of plan time. */
export function getSpeciesBehaviorPosition(
  plan: SpeciesBehaviorPlan,
  timeSeconds: number,
): SpeciesBehaviorPoint {
  const time = normalizeTime(timeSeconds);
  if (plan.axis === 'horizontal') {
    const distance = getHorizontalDistance(plan, time);
    return {
      x: plan.start.x + plan.direction * distance,
      y: getHorizontalY(plan, time),
    };
  }

  const distance = plan.baseSpeedPxPerSecond * time;
  return {
    x: getVerticalX(plan, time),
    y: plan.start.y + plan.direction * distance,
  };
}

/** Returns a finite instantaneous velocity useful to a Scene renderer. */
export function getSpeciesBehaviorVelocity(
  plan: SpeciesBehaviorPlan,
  timeSeconds: number,
): SpeciesBehaviorPoint {
  const time = normalizeTime(timeSeconds);
  const omega = TWO_PI * plan.frequencyHz;
  let x = 0;
  let y = 0;

  if (plan.axis === 'horizontal') {
    x = plan.direction * getHorizontalSpeed(plan, time);
    if (plan.kind !== 'octopus_crawl' && plan.kind !== 'crab_stop_go') {
      y = plan.amplitudePx * omega *
        Math.cos(plan.phaseRadians + omega * time);
    }
  } else {
    x = plan.amplitudePx * omega *
      Math.cos(plan.phaseRadians + omega * time);
    y = plan.direction * plan.baseSpeedPxPerSecond;
  }

  return {
    x: finiteOrZero(x),
    y: finiteOrZero(y),
  };
}

/** Returns the gentle alpha/scale modulation specified for category motion. */
export function getSpeciesBehaviorVisualState(
  plan: SpeciesBehaviorPlan,
  timeSeconds: number,
): SpeciesBehaviorVisualState {
  const time = normalizeTime(timeSeconds);
  const pulse = 0.5 + 0.5 * Math.sin(
    plan.phaseRadians + TWO_PI * plan.frequencyHz * time,
  );

  if (plan.kind === 'gelatinous_float') {
    return {
      alpha: 0.88 + pulse * 0.12,
      scale: 0.98 + pulse * 0.04,
    };
  }

  if (plan.kind === 'other_drift') {
    return {
      alpha: 0.9 + pulse * 0.1,
      scale: 0.99 + pulse * 0.02,
    };
  }

  return { alpha: 1, scale: 1 };
}

/** Returns true after the plan has crossed its off-screen terminal edge. */
export function hasSpeciesBehaviorExited(
  plan: SpeciesBehaviorPlan,
  position: SpeciesBehaviorPoint,
): boolean {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return false;
  }

  if (plan.axis === 'horizontal') {
    return plan.direction > 0
      ? position.x >= plan.end.x
      : position.x <= plan.end.x;
  }

  return plan.direction < 0
    ? position.y <= plan.end.y
    : position.y >= plan.end.y;
}

function getHorizontalY(
  plan: SpeciesBehaviorProfile,
  timeSeconds: number,
): number {
  if (plan.kind === 'octopus_crawl' || plan.kind === 'crab_stop_go') {
    return plan.laneCoordinate;
  }

  if (plan.kind === 'shrimp_zigzag') {
    return plan.laneCoordinate + plan.amplitudePx * triangleWave(
      plan.phaseRadians + TWO_PI * plan.frequencyHz * timeSeconds,
    );
  }

  return plan.laneCoordinate + plan.amplitudePx * Math.sin(
    plan.phaseRadians + TWO_PI * plan.frequencyHz * timeSeconds,
  );
}

function getVerticalX(
  plan: SpeciesBehaviorProfile,
  timeSeconds: number,
): number {
  return plan.laneCoordinate + plan.amplitudePx * Math.sin(
    plan.phaseRadians + TWO_PI * plan.frequencyHz * timeSeconds,
  );
}

function getHorizontalDistance(
  plan: SpeciesBehaviorPlan,
  timeSeconds: number,
): number {
  if (plan.kind === 'squid_burst') {
    const omega = Math.max(TWO_PI * plan.frequencyHz, 0.01);
    return plan.baseSpeedPxPerSecond * (
      1.1 * timeSeconds +
      0.45 * (
        Math.cos(plan.phaseRadians) -
        Math.cos(plan.phaseRadians + omega * timeSeconds)
      ) / omega
    );
  }

  if (plan.kind === 'octopus_crawl' || plan.kind === 'crab_stop_go') {
    return getStopGoDistance(plan, timeSeconds);
  }

  return plan.baseSpeedPxPerSecond * timeSeconds;
}

function getHorizontalSpeed(
  plan: SpeciesBehaviorPlan,
  timeSeconds: number,
): number {
  if (plan.kind === 'squid_burst') {
    const pulse = Math.sin(
      plan.phaseRadians + TWO_PI * plan.frequencyHz * timeSeconds,
    );
    return plan.baseSpeedPxPerSecond * (1.1 + 0.45 * pulse);
  }

  if (plan.kind === 'octopus_crawl' || plan.kind === 'crab_stop_go') {
    const cycle = Math.max(plan.cycleSeconds, 0.1);
    const activeFraction = plan.kind === 'octopus_crawl' ? 0.56 : 0.45;
    const cyclePosition = positiveModulo(timeSeconds, cycle);
    return cyclePosition < cycle * activeFraction
      ? plan.baseSpeedPxPerSecond
      : 0;
  }

  return plan.baseSpeedPxPerSecond;
}

function getStopGoDistance(
  plan: SpeciesBehaviorPlan,
  timeSeconds: number,
): number {
  const cycle = Math.max(plan.cycleSeconds, 0.1);
  const activeFraction = plan.kind === 'octopus_crawl' ? 0.56 : 0.45;
  const completeCycles = Math.floor(timeSeconds / cycle);
  const cyclePosition = positiveModulo(timeSeconds, cycle);
  const activeTime = completeCycles * cycle * activeFraction +
    Math.min(cyclePosition, cycle * activeFraction);
  return plan.baseSpeedPxPerSecond * activeTime;
}

function triangleWave(radians: number): number {
  const normalized = positiveModulo(radians / TWO_PI, 1);
  return normalized < 0.5
    ? normalized * 4 - 1
    : 3 - normalized * 4;
}

function deterministicUnit(
  sourceCatalogId: string,
  ordinal: number,
  salt: string,
): number {
  let hash = 2_166_136_261;
  const key = `${sourceCatalogId}|${String(ordinal)}|${salt}`;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

function normalizeOrdinal(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalizeTime(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(value, MAX_BEHAVIOR_TIME_SECONDS);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
