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

  it("detects whether a point is inside a rect", () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };

    expect(containsPoint(rect, { x: 30, y: 40 })).toBe(true);
    expect(containsPoint(rect, { x: 9, y: 40 })).toBe(false);
    expect(containsPoint(rect, { x: 30, y: 71 })).toBe(false);
  });

  it("measures distance from a point to a segment", () => {
    expect(distancePointToSegment({ x: 5, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(4);
  });

  it("detects circle and segment intersection", () => {
    expect(circleIntersectsSegment({ x: 5, y: 2 }, 3, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(true);
    expect(circleIntersectsSegment({ x: 5, y: 6 }, 3, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(false);
  });
});
