import type { Food, MovementVector, Point, SnakeGameState } from "./types";
import { add, clamp, distance, normalize, scale } from "./vector";

interface SnakeGameOptions {
  width: number;
  height: number;
  initialHead?: Point;
  initialFood?: Food;
  initialLength?: number;
  growAmount?: number;
  headRadius?: number;
  foodRadius?: number;
  baseSpeed?: number;
  maxSpeed?: number;
  random?: () => number;
}

export class SnakeGame {
  private readonly width: number;
  private readonly height: number;
  private readonly growAmount: number;
  private readonly headRadius: number;
  private readonly foodRadius: number;
  private readonly baseSpeed: number;
  private readonly maxSpeed: number;
  private readonly random: () => number;
  private state: SnakeGameState;

  constructor(options: SnakeGameOptions) {
    this.width = options.width;
    this.height = options.height;
    this.growAmount = options.growAmount ?? 36;
    this.headRadius = options.headRadius ?? 9;
    this.foodRadius = options.foodRadius ?? 8;
    this.baseSpeed = options.baseSpeed ?? 80;
    this.maxSpeed = options.maxSpeed ?? 240;
    this.random = options.random ?? Math.random;

    const head = options.initialHead
      ? { ...options.initialHead }
      : { x: this.width / 2, y: this.height / 2 };
    const initialLength = options.initialLength ?? 80;
    const food = options.initialFood
      ? {
          radius: options.initialFood.radius,
          position: { ...options.initialFood.position },
        }
      : this.spawnFood();

    this.state = {
      bounds: {
        width: this.width,
        height: this.height,
      },
      head,
      trail: [head, { x: head.x - initialLength, y: head.y }],
      targetLength: initialLength,
      food,
      score: 0,
      status: "running",
    };
  }

  getState(): SnakeGameState {
    return {
      ...this.state,
      bounds: { ...this.state.bounds },
      head: { ...this.state.head },
      trail: this.state.trail.map((point) => ({ ...point })),
      food: {
        radius: this.state.food.radius,
        position: { ...this.state.food.position },
      },
    };
  }

  update(movement: MovementVector, deltaSeconds: number): void {
    if (this.state.status === "game-over" || !movement.active) {
      return;
    }

    const previousHead = this.state.head;
    const speedScale = clamp(movement.speedScale, 0, 1);
    const speed = this.baseSpeed + (this.maxSpeed - this.baseSpeed) * speedScale;
    const nextHead = add(previousHead, scale(normalize(movement.direction), speed * deltaSeconds));
    const nextTrail = this.trimTrail([nextHead, ...this.state.trail], this.state.targetLength);

    this.state = {
      ...this.state,
      head: nextHead,
      trail: nextTrail,
    };

    if (this.isWallHit(nextHead)) {
      this.state = { ...this.state, status: "game-over" };
      return;
    }

    if (this.isFoodHit(previousHead, nextHead, this.state.food)) {
      const targetLength = this.state.targetLength + this.growAmount;
      this.state = {
        ...this.state,
        score: this.state.score + 1,
        targetLength,
        food: this.spawnFood(),
        trail: this.trimTrail(this.state.trail, targetLength),
      };
    }
  }

  private isWallHit(point: Point): boolean {
    return (
      point.x - this.headRadius < 0 ||
      point.x + this.headRadius > this.width ||
      point.y - this.headRadius < 0 ||
      point.y + this.headRadius > this.height
    );
  }

  private isFoodHit(previousHead: Point, nextHead: Point, food: Food): boolean {
    return this.distancePointToSegment(food.position, previousHead, nextHead) <= this.headRadius + food.radius;
  }

  private distancePointToSegment(point: Point, segmentStart: Point, segmentEnd: Point): number {
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

  private spawnFood(): Food {
    const margin = this.foodRadius * 2;
    return {
      radius: this.foodRadius,
      position: {
        x: margin + this.random() * (this.width - margin * 2),
        y: margin + this.random() * (this.height - margin * 2),
      },
    };
  }

  private trimTrail(points: Point[], targetLength: number): Point[] {
    if (points.length <= 1) {
      return points;
    }

    const trimmed: Point[] = [points[0]];
    let remaining = targetLength;

    for (let index = 1; index < points.length; index += 1) {
      const previous = trimmed[trimmed.length - 1];
      const current = points[index];
      const segmentLength = distance(previous, current);

      if (segmentLength === 0) {
        continue;
      }

      if (segmentLength <= remaining) {
        trimmed.push(current);
        remaining -= segmentLength;
        continue;
      }

      const ratio = remaining / segmentLength;
      trimmed.push({
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      });
      break;
    }

    return trimmed;
  }
}
