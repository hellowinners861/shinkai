import { describe, expect, it } from 'vitest';

import {
  DEPTH_CHAPTERS,
  getChapterCategoryWeight,
  getChapterTransition,
  getChapterTransitions,
  getDepthChapter,
  getDepthChapterNumber,
  SPECIES_CATEGORIES,
} from '../src/game/chapterRules';

describe('depth chapter rules', () => {
  it('keeps the four V3 chapter boundaries and names', () => {
    expect(DEPTH_CHAPTERS.map((chapter) => [
      chapter.number,
      chapter.minDepthM,
      chapter.maxDepthM,
      chapter.displayNameJa,
      chapter.displayNameEn,
    ])).toEqual([
      [1, 0, 999, '薄明境界', 'TWILIGHT EDGE'],
      [2, 1_000, 2_499, '無光層', 'MIDNIGHT COLUMN'],
      [3, 2_500, 3_999, '深淵平原', 'ABYSSAL PLAIN'],
      [4, 4_000, 6_000, '超深海裂溝', 'HADAL TRENCH'],
    ]);
    expect(getDepthChapterNumber(0)).toBe(1);
    expect(getDepthChapterNumber(999)).toBe(1);
    expect(getDepthChapterNumber(1_000)).toBe(2);
    expect(getDepthChapterNumber(2_500)).toBe(3);
    expect(getDepthChapterNumber(4_000)).toBe(4);
    expect(getDepthChapter(99_999).number).toBe(4);
    expect(getDepthChapter(-10).number).toBe(1);
  });

  it('exposes finite, immutable background, accent and particle profiles', () => {
    for (const chapter of DEPTH_CHAPTERS) {
      expect(Object.isFrozen(chapter)).toBe(true);
      expect(Object.isFrozen(chapter.particleProfile)).toBe(true);
      expect(Object.isFrozen(chapter.categoryWeights)).toBe(true);
      expect(Number.isFinite(chapter.backgroundColor)).toBe(true);
      expect(Number.isFinite(chapter.accentColor)).toBe(true);
      expect(Number.isFinite(chapter.particleProfile.density)).toBe(true);
      expect(Number.isFinite(chapter.particleProfile.speedPxPerSecond)).toBe(true);
      expect(Number.isFinite(chapter.particleProfile.alpha)).toBe(true);
      expect(chapter.backgroundHex).toMatch(/^#[0-9A-F]{6}$/u);
      expect(chapter.accentHex).toMatch(/^#[0-9A-F]{6}$/u);
      for (const category of SPECIES_CATEGORIES) {
        expect(getChapterCategoryWeight(chapter, category)).toBeGreaterThan(0);
      }
    }
  });

  it('returns the designed chapter category emphasis and neutral defaults', () => {
    expect(getChapterCategoryWeight(1, 'fish')).toBe(1.25);
    expect(getChapterCategoryWeight(2, 'squid')).toBe(1.35);
    expect(getChapterCategoryWeight(3, 'crab')).toBe(1.35);
    expect(getChapterCategoryWeight(4, 'other_invertebrate')).toBe(1.45);
    expect(getChapterCategoryWeight(4, 'fish')).toBe(1);
  });

  it('reports each forward boundary once and ignores reverse movement', () => {
    expect(getChapterTransitions(0, 6_000)).toEqual([
      { from: 1, to: 2, atDepthM: 1_000 },
      { from: 2, to: 3, atDepthM: 2_500 },
      { from: 3, to: 4, atDepthM: 4_000 },
    ]);
    expect(getChapterTransition(999, 1_000)).toEqual({
      from: 1,
      to: 2,
      atDepthM: 1_000,
    });
    expect(getChapterTransitions(1_000, 1_000)).toEqual([]);
    expect(getChapterTransitions(2_500, 2_000)).toEqual([]);
  });
});
