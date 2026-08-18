import type { SpeciesCatalogCategory } from './speciesPixelIcons';

/** The four named depth chapters used by the V3 dive design. */
export const DEPTH_CHAPTER_NUMBERS = [1, 2, 3, 4] as const;
export type DepthChapterNumber = (typeof DEPTH_CHAPTER_NUMBERS)[number];

export const SPECIES_CATEGORIES = [
  'fish',
  'gelatinous_plankton',
  'squid',
  'octopus',
  'crab',
  'shrimp',
  'other_invertebrate',
] as const satisfies readonly SpeciesCatalogCategory[];

export interface ChapterParticleProfile {
  /** Relative density multiplier for the existing marine-snow pool. */
  readonly density: number;
  readonly speedPxPerSecond: number;
  readonly alpha: number;
  readonly color: number;
}

export interface DepthChapter {
  readonly number: DepthChapterNumber;
  readonly roman: 'I' | 'II' | 'III' | 'IV';
  readonly minDepthM: number;
  readonly maxDepthM: number;
  readonly displayNameJa: string;
  readonly displayNameEn: string;
  readonly backgroundColor: number;
  readonly backgroundHex: string;
  readonly accentColor: number;
  readonly accentHex: string;
  readonly particleProfile: ChapterParticleProfile;
  readonly categoryWeights: Readonly<Record<SpeciesCatalogCategory, number>>;
}

export interface ChapterTransition {
  readonly from: DepthChapterNumber;
  readonly to: DepthChapterNumber;
  /** The inclusive depth boundary crossed by the transition. */
  readonly atDepthM: number;
}

const ALL_CATEGORY_WEIGHTS: Readonly<Record<SpeciesCatalogCategory, number>> =
  Object.freeze({
    fish: 1,
    gelatinous_plankton: 1,
    squid: 1,
    octopus: 1,
    crab: 1,
    shrimp: 1,
    other_invertebrate: 1,
  });

function createCategoryWeights(
  overrides: Partial<Record<SpeciesCatalogCategory, number>>,
): Readonly<Record<SpeciesCatalogCategory, number>> {
  return Object.freeze({
    ...ALL_CATEGORY_WEIGHTS,
    ...overrides,
  });
}

function createParticleProfile(
  profile: ChapterParticleProfile,
): ChapterParticleProfile {
  return Object.freeze({ ...profile });
}

/**
 * Immutable chapter data. The depth boundaries intentionally match
 * `HAZARD_DEPTH_BANDS` so chapter presentation and hazard difficulty never
 * disagree about the current part of the dive.
 */
export const DEPTH_CHAPTERS: readonly DepthChapter[] = Object.freeze([
  Object.freeze({
    number: 1 as const,
    roman: 'I' as const,
    minDepthM: 0,
    maxDepthM: 999,
    displayNameJa: '薄明境界',
    displayNameEn: 'TWILIGHT EDGE',
    backgroundColor: 0x0d3440,
    backgroundHex: '#0D3440',
    accentColor: 0x74f2d0,
    accentHex: '#74F2D0',
    particleProfile: createParticleProfile({
      density: 0.75,
      speedPxPerSecond: 18,
      alpha: 0.16,
      color: 0x9eeaf0,
    }),
    categoryWeights: createCategoryWeights({
      fish: 1.25,
      gelatinous_plankton: 1.15,
    }),
  }),
  Object.freeze({
    number: 2 as const,
    roman: 'II' as const,
    minDepthM: 1_000,
    maxDepthM: 2_499,
    displayNameJa: '無光層',
    displayNameEn: 'MIDNIGHT COLUMN',
    backgroundColor: 0x092632,
    backgroundHex: '#092632',
    accentColor: 0x6bd9e8,
    accentHex: '#6BD9E8',
    particleProfile: createParticleProfile({
      density: 0.9,
      speedPxPerSecond: 22,
      alpha: 0.18,
      color: 0x8af7ff,
    }),
    categoryWeights: createCategoryWeights({
      squid: 1.35,
      gelatinous_plankton: 1.2,
      octopus: 1.1,
    }),
  }),
  Object.freeze({
    number: 3 as const,
    roman: 'III' as const,
    minDepthM: 2_500,
    maxDepthM: 3_999,
    displayNameJa: '深淵平原',
    displayNameEn: 'ABYSSAL PLAIN',
    backgroundColor: 0x061923,
    backgroundHex: '#061923',
    accentColor: 0xf1d58a,
    accentHex: '#F1D58A',
    particleProfile: createParticleProfile({
      density: 0.6,
      speedPxPerSecond: 12,
      alpha: 0.14,
      color: 0xb2d1c0,
    }),
    categoryWeights: createCategoryWeights({
      crab: 1.35,
      shrimp: 1.25,
      octopus: 1.2,
    }),
  }),
  Object.freeze({
    number: 4 as const,
    roman: 'IV' as const,
    minDepthM: 4_000,
    maxDepthM: 6_000,
    displayNameJa: '超深海裂溝',
    displayNameEn: 'HADAL TRENCH',
    backgroundColor: 0x030b12,
    backgroundHex: '#030B12',
    accentColor: 0x9cc7ff,
    accentHex: '#9CC7FF',
    particleProfile: createParticleProfile({
      density: 0.3,
      speedPxPerSecond: 8,
      alpha: 0.1,
      color: 0x7096b8,
    }),
    categoryWeights: createCategoryWeights({
      other_invertebrate: 1.45,
      octopus: 1.3,
      shrimp: 1.2,
    }),
  }),
]);

export const CHAPTER_RULES = DEPTH_CHAPTERS;
export const DEPTH_CHAPTER_RULES = DEPTH_CHAPTERS;

/** Returns the immutable chapter profile for a chapter number. */
export function getDepthChapterByNumber(
  chapter: DepthChapterNumber,
): DepthChapter {
  return DEPTH_CHAPTERS[chapter - 1] ?? DEPTH_CHAPTERS[0]!;
}

/** Returns the chapter containing a finite depth, clamped to the dive range. */
export function getDepthChapter(depthM: number): DepthChapter {
  const depth = normalizeDepth(depthM);
  for (const chapter of DEPTH_CHAPTERS) {
    if (depth >= chapter.minDepthM && depth <= chapter.maxDepthM) {
      return chapter;
    }
  }

  return depth < DEPTH_CHAPTERS[0]!.minDepthM
    ? DEPTH_CHAPTERS[0]!
    : DEPTH_CHAPTERS[DEPTH_CHAPTERS.length - 1]!;
}

export const getChapterForDepth = getDepthChapter;

export function getDepthChapterNumber(depthM: number): DepthChapterNumber {
  return getDepthChapter(depthM).number;
}

/** Resolves a category's chapter multiplier without returning invalid values. */
export function getChapterCategoryWeight(
  chapter: DepthChapter | DepthChapterNumber,
  category: SpeciesCatalogCategory,
): number {
  const profile = typeof chapter === 'number'
    ? getDepthChapterByNumber(chapter)
    : chapter;
  const weight = profile.categoryWeights[category];
  return Number.isFinite(weight) && weight >= 0 ? weight : 1;
}

export function getChapterCategoryWeights(
  chapter: DepthChapter | DepthChapterNumber,
): Readonly<Record<SpeciesCatalogCategory, number>> {
  const profile = typeof chapter === 'number'
    ? getDepthChapterByNumber(chapter)
    : chapter;
  return profile.categoryWeights;
}

/**
 * Returns every chapter boundary crossed while moving forward through depth.
 * The result is stable for the same pair of finite depths and is empty for a
 * backwards or zero-length interval.
 */
export function getChapterTransitions(
  previousDepthM: number,
  currentDepthM: number,
): readonly ChapterTransition[] {
  if (
    !Number.isFinite(previousDepthM) ||
    !Number.isFinite(currentDepthM) ||
    currentDepthM <= previousDepthM
  ) {
    return [];
  }

  const previousDepth = normalizeDepth(previousDepthM);
  const currentDepth = normalizeDepth(currentDepthM);
  if (currentDepth <= previousDepth) {
    return [];
  }

  const transitions: ChapterTransition[] = [];
  let from = getDepthChapterNumber(previousDepth);
  for (const chapter of DEPTH_CHAPTERS) {
    if (
      chapter.number <= from ||
      chapter.minDepthM <= previousDepth ||
      chapter.minDepthM > currentDepth
    ) {
      continue;
    }

    transitions.push(Object.freeze({
      from,
      to: chapter.number,
      atDepthM: chapter.minDepthM,
    }));
    from = chapter.number;
  }

  return Object.freeze(transitions);
}

/** Returns the first chapter transition in a forward depth interval. */
export function getChapterTransition(
  previousDepthM: number,
  currentDepthM: number,
): ChapterTransition | undefined {
  return getChapterTransitions(previousDepthM, currentDepthM)[0];
}

function normalizeDepth(depthM: number): number {
  if (!Number.isFinite(depthM)) {
    return 0;
  }

  return Math.min(Math.max(depthM, 0), 6_000);
}
