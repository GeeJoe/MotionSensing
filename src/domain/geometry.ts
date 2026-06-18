import type { Point } from "./types";
import { clamp, distance } from "./vector";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export function pointFromNormalized(point: Point, bounds: Size): Point {
  return {
    x: clamp(point.x, 0, 1) * bounds.width,
    y: clamp(point.y, 0, 1) * bounds.height,
  };
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function distancePointToSegment(point: Point, segmentStart: Point, segmentEnd: Point): number {
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return distance(point, segmentStart);
  }

  const projection = clamp(
    ((point.x - segmentStart.x) * segmentX + (point.y - segmentStart.y) * segmentY) / segmentLengthSquared,
    0,
    1,
  );

  return distance(point, {
    x: segmentStart.x + segmentX * projection,
    y: segmentStart.y + segmentY * projection,
  });
}

export function circleIntersectsSegment(center: Point, radius: number, segmentStart: Point, segmentEnd: Point): boolean {
  return distancePointToSegment(center, segmentStart, segmentEnd) <= radius;
}
