import { describe, expect, it } from 'vitest';

import {
  getSpeciesScanGaugePosition,
  getSpeciesScanGaugeState,
  isSpeciesScanGaugeCompletionHoldElapsed,
  normalizeSpeciesScanGaugeProgress,
  SPECIES_SCAN_GAUGE_BOUNDS,
  SPECIES_SCAN_GAUGE_COLORS,
  SPECIES_SCAN_GAUGE_COMPLETION_HOLD_SECONDS,
  SPECIES_SCAN_GAUGE_DEPTH,
  SPECIES_SCAN_GAUGE_GEOMETRY,
} from '../src/game/speciesScanGauge';

describe('species scan gauge definitions', () => {
  it('uses the approved fixed geometry for normal and large targets', () => {
    expect(SPECIES_SCAN_GAUGE_GEOMETRY.normal).toMatchObject({
      width: 40,
      height: 7,
      fillWidth: 36,
      fillHeight: 3,
      offsetY: 38,
    });
    expect(SPECIES_SCAN_GAUGE_GEOMETRY.large).toMatchObject({
      width: 54,
      height: 8,
      fillWidth: 50,
      fillHeight: 4,
      offsetY: 82,
    });
    expect(SPECIES_SCAN_GAUGE_BOUNDS).toEqual({
      normal: {
        minX: 22,
        maxX: 428,
        minY: 116,
        maxY: 614,
      },
      large: {
        minX: 29,
        maxX: 421,
        minY: 116,
        maxY: 614,
      },
    });
    expect(SPECIES_SCAN_GAUGE_DEPTH).toBe(31);
  });

  it('normalizes finite progress to 0..1 and rejects invalid values', () => {
    expect(normalizeSpeciesScanGaugeProgress(0, 1)).toBe(0);
    expect(normalizeSpeciesScanGaugeProgress(0.5, 1)).toBe(0.5);
    expect(normalizeSpeciesScanGaugeProgress(2, 1)).toBe(1);
    expect(normalizeSpeciesScanGaugeProgress(-1, 1)).toBe(0);
    expect(normalizeSpeciesScanGaugeProgress(Number.NaN, 1)).toBe(0);
    expect(normalizeSpeciesScanGaugeProgress(1, Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeSpeciesScanGaugeProgress(1, 0)).toBe(0);
  });

  it('maps hidden, active, residual, and completed states to the approved colors', () => {
    const base = {
      kind: 'normal' as const,
      progressSeconds: 0,
      requiredSeconds: 1,
      illuminated: false,
      completed: false,
    };

    expect(getSpeciesScanGaugeState(base)).toMatchObject({
      displayState: 'hidden',
      visible: false,
      progressRatio: 0,
    });
    expect(getSpeciesScanGaugeState({ ...base, illuminated: true })).toMatchObject({
      displayState: 'active',
      visible: true,
      fillColor: SPECIES_SCAN_GAUGE_COLORS.activeFill,
      frameColor: SPECIES_SCAN_GAUGE_COLORS.normalFrame,
      alpha: 1,
    });
    expect(getSpeciesScanGaugeState({
      ...base,
      progressSeconds: 0.4,
    })).toMatchObject({
      displayState: 'residual',
      visible: true,
      fillColor: SPECIES_SCAN_GAUGE_COLORS.residualFill,
      alpha: 0.62,
    });
    expect(getSpeciesScanGaugeState({
      ...base,
      progressSeconds: 1,
      completed: true,
    })).toMatchObject({
      displayState: 'completed',
      visible: true,
      progressRatio: 1,
      fillColor: SPECIES_SCAN_GAUGE_COLORS.completed,
      frameColor: SPECIES_SCAN_GAUGE_COLORS.completed,
    });
    expect(getSpeciesScanGaugeState({
      ...base,
      progressSeconds: Number.NaN,
      requiredSeconds: 0,
      completed: true,
    })).toMatchObject({
      displayState: 'completed',
      progressRatio: 1,
      visible: true,
    });
  });

  it('keeps both gauge kinds within the fixed world anchor bounds', () => {
    expect(getSpeciesScanGaugePosition('normal', 0, 0)).toEqual({
      x: SPECIES_SCAN_GAUGE_BOUNDS.normal.minX,
      y: SPECIES_SCAN_GAUGE_BOUNDS.normal.minY,
    });
    expect(getSpeciesScanGaugePosition('large', 450, 800)).toEqual({
      x: SPECIES_SCAN_GAUGE_BOUNDS.large.maxX,
      y: SPECIES_SCAN_GAUGE_BOUNDS.large.maxY,
    });
    expect(getSpeciesScanGaugePosition('normal', 225, 400)).toEqual({
      x: 225,
      y: 362,
    });
    expect(getSpeciesScanGaugePosition('large', 225, 400)).toEqual({
      x: 225,
      y: 318,
    });
    expect(getSpeciesScanGaugePosition('normal', Number.NaN, Number.NaN)).toEqual({
      x: SPECIES_SCAN_GAUGE_BOUNDS.normal.minX,
      y: SPECIES_SCAN_GAUGE_BOUNDS.normal.minY,
    });

    for (const kind of ['normal', 'large'] as const) {
      const position = getSpeciesScanGaugePosition(kind, -100, -100);
      const geometry = SPECIES_SCAN_GAUGE_GEOMETRY[kind];
      const bounds = SPECIES_SCAN_GAUGE_BOUNDS[kind];
      const rightEdgePosition = getSpeciesScanGaugePosition(kind, 999, 999);
      expect(position.x).toBe(bounds.minX);
      expect(rightEdgePosition.x).toBe(bounds.maxX);
      expect(position.y).toBe(bounds.minY);
      expect(rightEdgePosition.y).toBe(bounds.maxY);
      expect(bounds.minX - geometry.width / 2 - 1).toBeGreaterThanOrEqual(0);
      expect(bounds.maxX + geometry.width / 2 + 1).toBeLessThanOrEqual(450);
    }
  });

  it('keeps the full-gauge confirmation window fixed at 0.30 seconds', () => {
    expect(SPECIES_SCAN_GAUGE_COMPLETION_HOLD_SECONDS).toBe(0.30);
    expect(isSpeciesScanGaugeCompletionHoldElapsed(2, 2.29)).toBe(false);
    expect(isSpeciesScanGaugeCompletionHoldElapsed(2, 2.30)).toBe(true);
    expect(isSpeciesScanGaugeCompletionHoldElapsed(undefined, 2.30)).toBe(false);
    expect(isSpeciesScanGaugeCompletionHoldElapsed(2, Number.NaN)).toBe(false);
  });
});
