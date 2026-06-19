import { circleIntersectsSegment } from "./geometry";
import type { Point, SwipeSample } from "./types";
import { distance } from "./vector";

export type FruitType = "apple" | "orange" | "watermelon" | "banana" | "strawberry" | "kiwi" | "pineapple" | "dragon-fruit";
export type FruitSliceStatus = "running" | "game-over";

export interface FruitObject {
  id: string;
  kind: "fruit";
  fruitType: FruitType;
  position: Point;
  velocity: Point;
  radius: number;
  sliced: boolean;
}

export interface BombObject {
  id: string;
  kind: "bomb";
  position: Point;
  velocity: Point;
  radius: number;
  sliced: boolean;
}

export type SliceObject = FruitObject | BombObject;

export interface FruitSliceState {
  bounds: { width: number; height: number };
  objects: SliceObject[];
  score: number;
  combo: number;
  lives: number;
  status: FruitSliceStatus;
  elapsedSeconds: number;
}

interface FruitSliceOptions {
  width: number;
  height: number;
  lives?: number;
  random?: () => number;
  initialObjects?: SliceObject[];
  initialSpawnDelay?: number;
}

const FRUIT_TYPES: FruitType[] = ["apple", "orange", "watermelon", "banana", "strawberry", "kiwi", "pineapple", "dragon-fruit"];
const GRAVITY = 780;
const MIN_SLICE_SPEED = 220;

export class FruitSliceGame {
  private readonly width: number;
  private readonly height: number;
  private readonly random: () => number;
  private spawnTimer = 0;
  private nextId = 1;
  private state: FruitSliceState;

  constructor(options: FruitSliceOptions) {
    this.width = options.width;
    this.height = options.height;
    this.random = options.random ?? Math.random;
    this.spawnTimer = options.initialSpawnDelay ?? 0;
    const objects = (options.initialObjects ?? []).map((object) => this.cloneObject(object));
    this.nextId = this.nextObjectId(objects);
    this.state = {
      bounds: { width: this.width, height: this.height },
      objects,
      score: 0,
      combo: 0,
      lives: options.lives ?? 3,
      status: "running",
      elapsedSeconds: 0,
    };
  }

  getState(): FruitSliceState {
    return {
      ...this.state,
      bounds: { ...this.state.bounds },
      objects: this.state.objects.map((object) => this.cloneObject(object)),
    };
  }

  update(deltaSeconds: number, trail: SwipeSample[]): void {
    if (this.isGameOver()) {
      return;
    }

    this.state = {
      ...this.state,
      elapsedSeconds: this.state.elapsedSeconds + deltaSeconds,
    };

    this.applySlices(trail);
    if (this.isGameOver()) {
      return;
    }

    this.state = {
      ...this.state,
      objects: this.state.objects.map((object) => this.moveObject(object, deltaSeconds)),
    };

    this.removeMissedObjects();
    if (this.isGameOver()) {
      return;
    }

    this.spawnTimer -= deltaSeconds;
    if (this.spawnTimer <= 0) {
      this.spawnObject();
      this.spawnTimer = this.spawnInterval();
    }
  }

  private applySlices(trail: SwipeSample[]): void {
    if (trail.length < 2) {
      return;
    }

    for (const object of this.state.objects) {
      if (this.isGameOver()) {
        return;
      }

      if (object.sliced || !this.trailSlicesObject(trail, object)) {
        continue;
      }

      object.sliced = true;
      if (object.kind === "fruit") {
        const combo = this.state.combo + 1;
        this.state = {
          ...this.state,
          combo,
          score: this.state.score + 10 + Math.max(0, combo - 1) * 2,
        };
      } else {
        this.loseLife();
        this.state = { ...this.state, combo: 0 };
        if (this.isGameOver()) {
          return;
        }
      }
    }
  }

  private trailSlicesObject(trail: SwipeSample[], object: SliceObject): boolean {
    for (let index = 1; index < trail.length; index += 1) {
      const previous = trail[index - 1];
      const current = trail[index];
      const elapsedSeconds = Math.max((current.timestampMs - previous.timestampMs) / 1000, Number.EPSILON);
      const speed = distance(previous.point, current.point) / elapsedSeconds;

      if (speed >= MIN_SLICE_SPEED && circleIntersectsSegment(object.position, object.radius, previous.point, current.point)) {
        return true;
      }
    }

    return false;
  }

  private moveObject(object: SliceObject, deltaSeconds: number): SliceObject {
    return {
      ...object,
      position: {
        x: object.position.x + object.velocity.x * deltaSeconds,
        y: object.position.y + object.velocity.y * deltaSeconds,
      },
      velocity: {
        x: object.velocity.x,
        y: object.velocity.y + GRAVITY * deltaSeconds,
      },
    };
  }

  private removeMissedObjects(): void {
    const remaining: SliceObject[] = [];

    for (const object of this.state.objects) {
      if (object.position.y - object.radius <= this.height) {
        remaining.push(object);
        continue;
      }

      if (object.kind === "fruit" && !object.sliced) {
        this.loseLife();
      }
    }

    this.state = {
      ...this.state,
      objects: remaining,
    };
  }

  private loseLife(): void {
    const lives = Math.max(0, this.state.lives - 1);
    this.state = {
      ...this.state,
      lives,
      status: lives === 0 ? "game-over" : this.state.status,
    };
  }

  private spawnObject(): void {
    const bombChance = Math.min(0.25, 0.1 + this.state.elapsedSeconds / 240);
    const isBomb = this.random() < bombChance;
    const x = 80 + this.random() * (this.width - 160);
    const y = this.height + 50;
    const velocity = {
      x: -180 + this.random() * 360,
      y: -760 - this.random() * 220,
    };

    this.state = {
      ...this.state,
      objects: [
        ...this.state.objects,
        isBomb
          ? { id: `bomb-${this.nextId++}`, kind: "bomb", position: { x, y }, velocity, radius: 36, sliced: false }
          : {
              id: `fruit-${this.nextId++}`,
              kind: "fruit",
              fruitType: FRUIT_TYPES[Math.floor(this.random() * FRUIT_TYPES.length)] ?? "apple",
              position: { x, y },
              velocity,
              radius: 38,
              sliced: false,
            },
      ],
    };
  }

  private spawnInterval(): number {
    return Math.max(0.45, 1.2 - this.state.elapsedSeconds / 120);
  }

  private isGameOver(): boolean {
    return this.state.status === "game-over";
  }

  private nextObjectId(objects: SliceObject[]): number {
    return objects.reduce((nextId, object) => {
      const suffix = /(\d+)$/.exec(object.id);
      return suffix ? Math.max(nextId, Number(suffix[1]) + 1) : nextId;
    }, 1);
  }

  private cloneObject<T extends SliceObject>(object: T): T {
    return {
      ...object,
      position: { ...object.position },
      velocity: { ...object.velocity },
    };
  }
}
