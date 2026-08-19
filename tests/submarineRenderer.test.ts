import { describe, expect, it } from 'vitest';

import {
  SEARCHLIGHT_HALF_ANGLE_RADIANS,
  SEARCHLIGHT_RANGE_PX,
} from '../src/game/searchlightRules';
import {
  SEARCHLIGHT_BEAM_LAYERS,
  SUBMARINE_COLORS,
  SUBMARINE_VISUAL_BOUNDS,
  SUBMARINE_VISUAL_GEOMETRY,
  drawSearchlightBeam,
  getSearchlightBeamVertices,
  getSubmarineLightRotationRadians,
  getSubmarineOutlineColor,
  getThrusterAlpha,
  type SearchlightBeamLayer,
} from '../src/game/submarineRenderer';

describe('V4 submarine visual definitions', () => {
  it('uses the strict ±34px horizontal footprint', () => {
    expect(SUBMARINE_VISUAL_BOUNDS.minX).toBe(-34);
    expect(SUBMARINE_VISUAL_BOUNDS.maxX).toBe(34);
  });

  it('keeps every primitive finite and inside the documented footprint', () => {
    for (const primitive of SUBMARINE_VISUAL_GEOMETRY) {
      expect(primitive.id.length).toBeGreaterThan(0);
      if (primitive.kind === 'ellipse') {
        expectFiniteAndInside(
          primitive.x - primitive.width / 2,
          primitive.y - primitive.height / 2,
        );
        expectFiniteAndInside(
          primitive.x + primitive.width / 2,
          primitive.y + primitive.height / 2,
        );
      } else if (primitive.kind === 'circle') {
        expectFiniteAndInside(
          primitive.x - primitive.radius,
          primitive.y - primitive.radius,
        );
        expectFiniteAndInside(
          primitive.x + primitive.radius,
          primitive.y + primitive.radius,
        );
      } else {
        for (const point of primitive.points) {
          expectFiniteAndInside(point.x, point.y);
        }
      }
    }
  });

  it('makes the nose face +x and the thruster face -x', () => {
    const nose = SUBMARINE_VISUAL_GEOMETRY.find(
      (primitive) => primitive.id === 'observation-dome',
    );
    const thruster = SUBMARINE_VISUAL_GEOMETRY.find(
      (primitive) => primitive.id === 'thruster-ring',
    );
    expect(nose && 'x' in nose ? nose.x : 0).toBeGreaterThan(0);
    expect(thruster && 'x' in thruster ? thruster.x : 0).toBeLessThan(0);
  });

  it('declares the player-centred gimbal base used by the renderer', () => {
    const gimbalBase = SUBMARINE_VISUAL_GEOMETRY.find(
      (primitive) => primitive.id === 'gimbal-base',
    );
    expect(gimbalBase).toMatchObject({
      kind: 'circle',
      x: 0,
      y: 0,
      radius: 6,
    });
  });

  it('keeps the approved normal and impact outline colors', () => {
    expect(getSubmarineOutlineColor(false)).toBe(SUBMARINE_COLORS.glow);
    expect(getSubmarineOutlineColor(true)).toBe(SUBMARINE_COLORS.impact);
  });

  it('uses a fixed reduced-motion thruster and bounded normal pulse', () => {
    expect(getThrusterAlpha(0, true)).toBe(0.52);
    expect(getThrusterAlpha(0.6, true)).toBe(0.52);
    for (const seconds of [0, 0.2, 0.6, 1.2, 2.4]) {
      expect(getThrusterAlpha(seconds, false)).toBeGreaterThanOrEqual(0.42);
      expect(getThrusterAlpha(seconds, false)).toBeLessThanOrEqual(0.62);
    }
  });
});

describe('V4 searchlight rendering definition', () => {
  it('keeps the four layers tied to the gameplay boundary', () => {
    expect(SEARCHLIGHT_BEAM_LAYERS.map((layer) => layer.id)).toEqual([
      'outer',
      'middle',
      'inner',
      'core',
    ]);
    expect(SEARCHLIGHT_BEAM_LAYERS[0]?.range).toBe(SEARCHLIGHT_RANGE_PX);
    expect(SEARCHLIGHT_BEAM_LAYERS[0]?.halfAngleRadians).toBe(
      SEARCHLIGHT_HALF_ANGLE_RADIANS,
    );
    expect(SEARCHLIGHT_BEAM_LAYERS.map((layer) => layer.range)).toEqual([
      260,
      250,
      238,
      208,
    ]);
    expect(SEARCHLIGHT_BEAM_LAYERS.map((layer) => layer.alpha)).toEqual([
      0.028,
      0.04,
      0.06,
      0.05,
    ]);
    for (const layer of SEARCHLIGHT_BEAM_LAYERS) {
      expect(layer.color).toBe(SUBMARINE_COLORS.lamp);
      expect(layer.alpha).toBeGreaterThan(0);
      expect(layer.alpha).toBeLessThanOrEqual(0.08);
    }
  });

  it('places the outer vertices around the player centre at cardinal angles', () => {
    const layer = SEARCHLIGHT_BEAM_LAYERS[0] as SearchlightBeamLayer;
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const vertices = getSearchlightBeamVertices(
        { x: 225, y: 400 },
        angle,
        layer,
      );
      expect(vertices.origin).toEqual({ x: 225, y: 400 });
      expect(vertices.left.x - 225).toBeCloseTo(
        Math.cos(angle - layer.halfAngleRadians) * layer.range,
        10,
      );
      expect(vertices.left.y - 400).toBeCloseTo(
        Math.sin(angle - layer.halfAngleRadians) * layer.range,
        10,
      );
      expect(vertices.right.x - 225).toBeCloseTo(
        Math.cos(angle + layer.halfAngleRadians) * layer.range,
        10,
      );
      expect(vertices.right.y - 400).toBeCloseTo(
        Math.sin(angle + layer.halfAngleRadians) * layer.range,
        10,
      );
    }
  });

  it('rejects no geometry and draws four filled layers without a hard centre line', () => {
    const fake = new RecordingGraphics();
    drawSearchlightBeam(
      fake as never,
      { x: 225, y: 400 },
      0,
    );
    expect(fake.clearCount).toBe(1);
    expect(fake.fillPathCount).toBe(4);
    expect(fake.lineStyleCount).toBe(0);
    expect(fake.fillStyleCount).toBe(4);
  });

  it('keeps the light gimbal angle finite without altering valid angles', () => {
    expect(getSubmarineLightRotationRadians(-Math.PI / 2)).toBe(-Math.PI / 2);
    expect(getSubmarineLightRotationRadians(Math.PI)).toBe(Math.PI);
    expect(getSubmarineLightRotationRadians(Number.NaN)).toBe(0);
    expect(getSubmarineLightRotationRadians(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

class RecordingGraphics {
  public clearCount = 0;
  public fillPathCount = 0;
  public fillStyleCount = 0;
  public lineStyleCount = 0;

  public clear(): this {
    this.clearCount += 1;
    return this;
  }

  public fillStyle(): this {
    this.fillStyleCount += 1;
    return this;
  }

  public beginPath(): this {
    return this;
  }

  public moveTo(): this {
    return this;
  }

  public lineTo(): this {
    return this;
  }

  public closePath(): this {
    return this;
  }

  public fillPath(): this {
    this.fillPathCount += 1;
    return this;
  }

  public lineStyle(): this {
    this.lineStyleCount += 1;
    return this;
  }
}

function expectFiniteAndInside(x: number, y: number): void {
  expect(Number.isFinite(x)).toBe(true);
  expect(Number.isFinite(y)).toBe(true);
  expect(x).toBeGreaterThanOrEqual(SUBMARINE_VISUAL_BOUNDS.minX);
  expect(x).toBeLessThanOrEqual(SUBMARINE_VISUAL_BOUNDS.maxX);
  expect(y).toBeGreaterThanOrEqual(SUBMARINE_VISUAL_BOUNDS.minY);
  expect(y).toBeLessThanOrEqual(SUBMARINE_VISUAL_BOUNDS.maxY);
}
