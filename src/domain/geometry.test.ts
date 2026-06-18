import { describe, expect, it } from "vitest";
import {
  circleIntersectsSegment,
  containsPoint,
  distancePointToSegment,
  pointFromNormalized,
} from "./geometry";

describe("geometry", () => {
  it("maps normalized points into bounds", () => {
    expect(pointFromNormalized({ x: 0.25, y: 0.75 }, { width: 800, height: 600 })).toEqual({
      x: 200,
      y: 450,
    });
  });

  it("clamps normalized points before mapping them into bounds", () => {
    expect(pointFromNormalized({ x: -1, y: 2 }, { width: 800, height: 600 })).toEqual({
      x: 0,
      y: 600,
    });
  });

  it("detects whether a point is inside a rect", () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };

    expect(containsPoint(rect, { x: 30, y: 40 })).toBe(true);
    expect(containsPoint(rect, { x: 9, y: 40 })).toBe(false);
    expect(containsPoint(rect, { x: 30, y: 71 })).toBe(false);
  });

  it("includes points on rect corners", () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };

    expect(containsPoint(rect, { x: 10, y: 20 })).toBe(true);
    expect(containsPoint(rect, { x: 110, y: 70 })).toBe(true);
  });

  it("measures distance from a point to a segment", () => {
    expect(distancePointToSegment({ x: 5, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(4);
  });

  it("measures distance to the point when the segment has zero length", () => {
    expect(distancePointToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(5);
  });

  it("clamps segment projections to the nearest endpoint", () => {
    expect(distancePointToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
    expect(distancePointToSegment({ x: 14, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });

  it("detects circle and segment intersection", () => {
    expect(circleIntersectsSegment({ x: 5, y: 2 }, 3, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
    expect(circleIntersectsSegment({ x: 5, y: 6 }, 3, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(false);
  });
});
