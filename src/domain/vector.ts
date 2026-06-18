import type { Point } from "./types";

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(point: Point, amount: number): Point {
  return { x: point.x * amount, y: point.y * amount };
}

export function magnitude(point: Point): number {
  return Math.hypot(point.x, point.y);
}

export function distance(a: Point, b: Point): number {
  return magnitude(subtract(a, b));
}

export function normalize(point: Point): Point {
  const length = magnitude(point);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: point.x / length, y: point.y / length };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
