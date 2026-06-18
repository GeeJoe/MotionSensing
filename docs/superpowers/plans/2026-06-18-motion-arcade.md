# Motion Arcade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a gesture-controlled Motion Arcade hub with a hand-pointer menu, preserved Snake game, and new Fruit Slice arcade game.

**Architecture:** Refactor the current single-game controller into shared input plus scene modules. `AppController` owns camera startup, RAF, and scene switching; scenes own menu/game behavior; render helpers keep Canvas drawing consistent.

**Tech Stack:** Vite, TypeScript, Canvas 2D, MediaPipe `@mediapipe/tasks-vision`, Vitest, browser localStorage, generated PNG assets with Canvas fallback.

---

## File Structure

Create or modify these files:

- Modify `src/domain/types.ts`
  - Add `TrackedPoint3D`, `GameId`, `HandInputState`, `ClickEvent`, `SwipeSample`, `HoverState`, and click animation types.
- Modify `src/camera/cameraTracker.ts`
  - Preserve existing tracking lifecycle and add fingertip `z`.
- Modify `src/camera/cameraTracker.test.ts`
  - Cover mirrored `x` and preserved `z`.
- Create `src/input/handInput.ts`
  - Convert tracker frames into pointer position, swipe trail, hover-click, poke-click, and click animation state.
- Create `src/input/handInput.test.ts`
  - Unit tests for poke click, hover click, click animation, and trail reset.
- Create `src/domain/geometry.ts`
  - Shared point/segment/rect/circle helpers.
- Create `src/domain/geometry.test.ts`
  - Unit tests for geometry used by menu and Fruit Slice.
- Create `src/storage/bestScores.ts`
  - Local storage-backed best-score helper with in-memory fallback.
- Create `src/storage/bestScores.test.ts`
  - Unit tests for read/write and unavailable storage fallback.
- Create `src/scenes/scene.ts`
  - Scene interface and shared scene transition types.
- Create `src/scenes/menuScene.ts`
  - Gesture menu cards for Snake and Fruit Slice.
- Create `src/scenes/menuScene.test.ts`
  - Unit tests for hover/click selection.
- Create `src/scenes/snakeScene.ts`
  - Wrap existing Snake game and fixed-center joystick behavior.
- Create `src/scenes/snakeScene.test.ts`
  - Unit tests for joystick update and Home transition.
- Create `src/domain/fruitSlice.ts`
  - Fruit Slice game rules: spawning, physics, slicing, bombs, lives, combo, game over.
- Create `src/domain/fruitSlice.test.ts`
  - Unit tests for Fruit Slice rules.
- Create `src/assets/fruit/`
  - Generated PNG assets for juicy arcade fruit, bombs, and splashes.
- Create `src/assets/fruit/manifest.ts`
  - Asset key list and import surface for optional sprites.
- Create `src/scenes/fruitSliceScene.ts`
  - Scene wrapper around Fruit Slice domain and input.
- Create `src/scenes/fruitSliceScene.test.ts`
  - Unit tests for restart, Home, and best-score updates.
- Modify `src/render/renderer.ts`
  - Add shared menu, pointer animation, Home button, and Fruit Slice drawing helpers while keeping existing canvas scaling.
- Modify `src/render/renderer.test.ts`
  - Cover shared pointer click ring, menu card drawing, Home button drawing, and Fruit Slice fallback drawing.
- Modify `src/app/appController.ts`
  - Wire tracker -> `HandInputController` -> current `Scene`; switch scenes on transitions.
- Modify `src/app/appController.test.ts`
  - Cover startup to menu, scene switching, and startup error behavior.
- Modify `src/styles.css`
  - Keep focused test layout but rename copy/spacing for arcade hub.
- Modify `src/main.ts`
  - Should remain a thin app bootstrap; update only if constructor signature changes.

---

## Task 1: Extend Tracking Types and Camera Output With Z

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/camera/cameraTracker.ts`
- Modify: `src/camera/cameraTracker.test.ts`
- Modify: `src/render/renderer.test.ts`

- [ ] **Step 1: Write the failing tracker z test**

Add this test inside `describe("extractIndexFingerTip", ...)` in `src/camera/cameraTracker.test.ts`:

```ts
it("returns mirrored x, y, and z for landmark 8", () => {
  const landmarks = Array.from({ length: 21 }, (_, index) => ({
    x: index / 100,
    y: index / 200,
    z: -index / 300,
  }));

  expect(extractIndexFingerTip({ landmarks: [landmarks] })).toEqual({
    x: 0.92,
    y: 0.04,
    z: -8 / 300,
  });
});
```

- [ ] **Step 2: Run the tracker test to verify it fails**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/camera/cameraTracker.test.ts
```

Expected: FAIL because `extractIndexFingerTip()` currently returns only `x` and `y`.

- [ ] **Step 3: Add point types**

Modify `src/domain/types.ts`:

```ts
export interface Point {
  x: number;
  y: number;
}

export interface TrackedPoint3D extends Point {
  z: number;
}
```

Change `TrackingFrame.point`:

```ts
export interface TrackingFrame {
  point: TrackedPoint3D | null;
  status: "loading" | "searching" | "tracking" | "error";
  errorMessage: string | null;
}
```

Keep all existing interfaces in `types.ts`; only add `TrackedPoint3D` and update `TrackingFrame.point`.

Update existing `TrackingFrame` fixtures so typed test data has `z`:

```ts
internals.latestFrame = {
  point: { x: 0.4, y: 0.6, z: 0 },
  status: "tracking",
  errorMessage: null,
};
```

```ts
internals.latestFrame = {
  point: { x: 0.2, y: 0.3, z: 0 },
  status: "tracking",
  errorMessage: null,
};
```

In `src/render/renderer.test.ts`, update the tracked fingertip fixture:

```ts
const tracking: TrackingFrame = {
  errorMessage: null,
  point: { x: 0.25, y: 0.75, z: 0 },
  status: "tracking",
};
```

- [ ] **Step 4: Preserve z from MediaPipe**

Modify the `LandmarkLike` interface in `src/camera/cameraTracker.ts`:

```ts
interface LandmarkLike {
  x: number;
  y: number;
  z?: number;
}
```

Modify `extractIndexFingerTip()`:

```ts
return { x: 1 - indexTip.x, y: indexTip.y, z: indexTip.z ?? 0 };
```

- [ ] **Step 5: Run tracker tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/camera/cameraTracker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/camera/cameraTracker.ts src/camera/cameraTracker.test.ts src/render/renderer.test.ts
git commit -m "feat: expose fingertip depth"
```

---

## Task 2: Add Shared Geometry Helpers

**Files:**
- Create: `src/domain/geometry.ts`
- Create: `src/domain/geometry.test.ts`

- [ ] **Step 1: Write geometry tests**

Create `src/domain/geometry.test.ts`:

```ts
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
```

- [ ] **Step 2: Run geometry tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/domain/geometry.test.ts
```

Expected: FAIL because `geometry.ts` does not exist.

- [ ] **Step 3: Implement geometry helpers**

Create `src/domain/geometry.ts`:

```ts
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
```

- [ ] **Step 4: Run geometry tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/domain/geometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/geometry.ts src/domain/geometry.test.ts
git commit -m "feat: add geometry helpers"
```

---

## Task 3: Build Shared Hand Input Controller

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/input/handInput.ts`
- Create: `src/input/handInput.test.ts`

- [ ] **Step 1: Add input type tests**

Create `src/input/handInput.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HandInputController } from "./handInput";

describe("HandInputController", () => {
  it("maps normalized tracking points into canvas pointer coordinates", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    const state = input.update({
      timestampMs: 100,
      trackingPoint: { x: 0.25, y: 0.75, z: -0.1 },
      hoverTargetId: null,
    });

    expect(state.pointer).toEqual({ x: 240, y: 480 });
    expect(state.normalizedPointer).toEqual({ x: 0.25, y: 0.75, z: -0.1 });
    expect(state.pointerVisible).toBe(true);
  });

  it("emits a poke click when fingertip z moves toward the camera quickly", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0.02 }, hoverTargetId: null });
    const state = input.update({ timestampMs: 160, trackingPoint: { x: 0.5, y: 0.5, z: -0.09 }, hoverTargetId: "snake" });

    expect(state.click).toEqual({
      id: "snake",
      point: { x: 480, y: 320 },
      source: "poke",
    });
    expect(state.clickAnimation.active).toBe(true);
  });

  it("emits a hover click after the pointer remains on the same target", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    input.update({ timestampMs: 700, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    const state = input.update({ timestampMs: 930, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });

    expect(state.click?.source).toBe("hover");
    expect(state.click?.id).toBe("fruit");
  });

  it("resets trail and hover when tracking is lost", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.1, y: 0.1, z: 0 }, hoverTargetId: "snake" });
    const lost = input.update({ timestampMs: 150, trackingPoint: null, hoverTargetId: "snake" });

    expect(lost.pointerVisible).toBe(false);
    expect(lost.trail).toEqual([]);
    expect(lost.hover).toEqual({ targetId: null, progress: 0 });
  });
});
```

- [ ] **Step 2: Run input tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/input/handInput.test.ts
```

Expected: FAIL because `handInput.ts` does not exist.

- [ ] **Step 3: Add shared input types**

Modify `src/domain/types.ts` by appending:

```ts
export type GameId = "snake" | "fruit-slice";
export type ClickSource = "poke" | "hover";

export interface SwipeSample {
  point: Point;
  timestampMs: number;
}

export interface ClickEvent {
  id: string;
  point: Point;
  source: ClickSource;
}

export interface HoverState {
  targetId: string | null;
  progress: number;
}

export interface ClickAnimationState {
  active: boolean;
  point: Point | null;
  progress: number;
}

export interface HandInputState {
  pointer: Point | null;
  normalizedPointer: TrackedPoint3D | null;
  pointerVisible: boolean;
  trail: SwipeSample[];
  click: ClickEvent | null;
  hover: HoverState;
  clickAnimation: ClickAnimationState;
}
```

- [ ] **Step 4: Implement hand input controller**

Create `src/input/handInput.ts`:

```ts
import type { ClickEvent, HandInputState, Point, SwipeSample, TrackedPoint3D } from "../domain/types";
import { pointFromNormalized, type Size } from "../domain/geometry";

interface HandInputOptions {
  canvasSize: Size;
  hoverClickMs: number;
  pokeDepthDelta: number;
  clickAnimationMs: number;
  maxTrailAgeMs: number;
}

interface HandInputUpdate {
  timestampMs: number;
  trackingPoint: TrackedPoint3D | null;
  hoverTargetId: string | null;
}

export class HandInputController {
  private readonly options: HandInputOptions;
  private trail: SwipeSample[] = [];
  private previousPoint: TrackedPoint3D | null = null;
  private hoverTargetId: string | null = null;
  private hoverStartedAt: number | null = null;
  private consumedHoverTargetId: string | null = null;
  private clickAnimationStartedAt: number | null = null;
  private clickAnimationPoint: Point | null = null;

  constructor(options: HandInputOptions) {
    this.options = options;
  }

  update(update: HandInputUpdate): HandInputState {
    if (!update.trackingPoint) {
      this.trail = [];
      this.previousPoint = null;
      this.hoverTargetId = null;
      this.hoverStartedAt = null;
      this.consumedHoverTargetId = null;
      return this.state(null, null, null, update.timestampMs);
    }

    const pointer = pointFromNormalized(update.trackingPoint, this.options.canvasSize);
    this.updateTrail(pointer, update.timestampMs);
    const click = this.detectClick(update, pointer);
    this.previousPoint = update.trackingPoint;

    if (click) {
      this.clickAnimationStartedAt = update.timestampMs;
      this.clickAnimationPoint = { ...click.point };
    }

    return this.state(pointer, update.trackingPoint, click, update.timestampMs);
  }

  private updateTrail(pointer: Point, timestampMs: number): void {
    this.trail = [...this.trail, { point: { ...pointer }, timestampMs }].filter(
      (sample) => timestampMs - sample.timestampMs <= this.options.maxTrailAgeMs,
    );
  }

  private detectClick(update: HandInputUpdate, pointer: Point): ClickEvent | null {
    const pokeClick = this.detectPokeClick(update, pointer);
    if (pokeClick) {
      this.resetHover(update.hoverTargetId, update.timestampMs);
      return pokeClick;
    }

    return this.detectHoverClick(update, pointer);
  }

  private detectPokeClick(update: HandInputUpdate, pointer: Point): ClickEvent | null {
    if (!this.previousPoint || !update.hoverTargetId) {
      return null;
    }

    const zDelta = this.previousPoint.z - update.trackingPoint.z;
    if (zDelta < this.options.pokeDepthDelta) {
      return null;
    }

    return {
      id: update.hoverTargetId,
      point: { ...pointer },
      source: "poke",
    };
  }

  private detectHoverClick(update: HandInputUpdate, pointer: Point): ClickEvent | null {
    if (!update.hoverTargetId) {
      this.resetHover(null, update.timestampMs);
      return null;
    }

    if (this.hoverTargetId !== update.hoverTargetId) {
      this.resetHover(update.hoverTargetId, update.timestampMs);
      return null;
    }

    if (this.consumedHoverTargetId === update.hoverTargetId) {
      return null;
    }

    const startedAt = this.hoverStartedAt ?? update.timestampMs;
    if (update.timestampMs - startedAt < this.options.hoverClickMs) {
      return null;
    }

    this.consumedHoverTargetId = update.hoverTargetId;
    return {
      id: update.hoverTargetId,
      point: { ...pointer },
      source: "hover",
    };
  }

  private resetHover(targetId: string | null, timestampMs: number): void {
    this.hoverTargetId = targetId;
    this.hoverStartedAt = targetId ? timestampMs : null;
    this.consumedHoverTargetId = null;
  }

  private state(
    pointer: Point | null,
    normalizedPointer: TrackedPoint3D | null,
    click: ClickEvent | null,
    timestampMs: number,
  ): HandInputState {
    return {
      pointer,
      normalizedPointer,
      pointerVisible: Boolean(pointer),
      trail: this.trail.map((sample) => ({ point: { ...sample.point }, timestampMs: sample.timestampMs })),
      click,
      hover: this.hoverState(timestampMs),
      clickAnimation: this.clickAnimationState(timestampMs),
    };
  }

  private hoverState(timestampMs: number): HandInputState["hover"] {
    if (!this.hoverTargetId || this.hoverStartedAt === null) {
      return { targetId: null, progress: 0 };
    }

    return {
      targetId: this.hoverTargetId,
      progress: Math.min(1, (timestampMs - this.hoverStartedAt) / this.options.hoverClickMs),
    };
  }

  private clickAnimationState(timestampMs: number): HandInputState["clickAnimation"] {
    if (this.clickAnimationStartedAt === null || !this.clickAnimationPoint) {
      return { active: false, point: null, progress: 0 };
    }

    const progress = (timestampMs - this.clickAnimationStartedAt) / this.options.clickAnimationMs;
    if (progress >= 1) {
      return { active: false, point: null, progress: 0 };
    }

    return {
      active: true,
      point: { ...this.clickAnimationPoint },
      progress: Math.max(0, progress),
    };
  }
}
```

- [ ] **Step 5: Run input tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/input/handInput.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/input/handInput.ts src/input/handInput.test.ts
git commit -m "feat: add shared hand input"
```

---

## Task 4: Add Best Score Persistence

**Files:**
- Create: `src/storage/bestScores.ts`
- Create: `src/storage/bestScores.test.ts`

- [ ] **Step 1: Write best score tests**

Create `src/storage/bestScores.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BestScores } from "./bestScores";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("BestScores", () => {
  it("stores and reads the best score for a game", () => {
    const scores = new BestScores(createStorage());

    scores.record("fruit-slice", 120);
    scores.record("fruit-slice", 90);

    expect(scores.get("fruit-slice")).toBe(120);
  });

  it("falls back to memory when storage throws", () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const scores = new BestScores(brokenStorage);

    scores.record("snake", 42);

    expect(scores.get("snake")).toBe(42);
  });
});
```

- [ ] **Step 2: Run best score tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/storage/bestScores.test.ts
```

Expected: FAIL because `bestScores.ts` does not exist.

- [ ] **Step 3: Implement best score helper**

Create `src/storage/bestScores.ts`:

```ts
import type { GameId } from "../domain/types";

const PREFIX = "motionArcade.bestScore.";

export class BestScores {
  private readonly fallback = new Map<GameId, number>();

  constructor(private readonly storage: Storage | null) {}

  get(gameId: GameId): number {
    const fallbackValue = this.fallback.get(gameId) ?? 0;

    try {
      const stored = this.storage?.getItem(`${PREFIX}${gameId}`);
      if (!stored) {
        return fallbackValue;
      }

      const parsed = Number(stored);
      return Number.isFinite(parsed) ? Math.max(fallbackValue, parsed) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  record(gameId: GameId, score: number): number {
    const next = Math.max(this.get(gameId), Math.floor(score));
    this.fallback.set(gameId, next);

    try {
      this.storage?.setItem(`${PREFIX}${gameId}`, String(next));
    } catch {
      return next;
    }

    return next;
  }
}
```

- [ ] **Step 4: Run best score tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/storage/bestScores.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/bestScores.ts src/storage/bestScores.test.ts
git commit -m "feat: add best score storage"
```

---

## Task 5: Define Scene Contracts

**Files:**
- Create: `src/scenes/scene.ts`

- [ ] **Step 1: Create scene contract**

Create `src/scenes/scene.ts`:

```ts
import type { GameId, HandInputState } from "../domain/types";

export type SceneId = "menu" | GameId;

export type SceneTransition =
  | { type: "none" }
  | { type: "switch"; scene: SceneId };

export interface SceneUpdateContext {
  input: HandInputState;
  deltaSeconds: number;
}

export interface SceneRenderContext {
  input: HandInputState;
}

export interface Scene {
  readonly id: SceneId;
  update(context: SceneUpdateContext): SceneTransition;
  render(context: SceneRenderContext): void;
}

export const NO_TRANSITION: SceneTransition = { type: "none" };
```

- [ ] **Step 2: Run TypeScript build**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/scene.ts
git commit -m "feat: define scene contract"
```

---

## Task 6: Build Menu Scene

**Files:**
- Create: `src/scenes/menuScene.ts`
- Create: `src/scenes/menuScene.test.ts`
- Modify: `src/render/renderer.ts`
- Modify: `src/render/renderer.test.ts`

- [ ] **Step 1: Write menu scene tests**

Create `src/scenes/menuScene.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { HandInputState, Point } from "../domain/types";
import { MenuScene } from "./menuScene";

function input(overrides: Partial<HandInputState> = {}): HandInputState {
  return {
    click: null,
    clickAnimation: { active: false, point: null, progress: 0 },
    hover: { targetId: null, progress: 0 },
    normalizedPointer: null,
    pointer: null,
    pointerVisible: false,
    trail: [],
    ...overrides,
  };
}

describe("MenuScene", () => {
  it("switches to snake when the snake card is clicked", () => {
    const scene = new MenuScene({
      bounds: { width: 960, height: 640 },
      bestScores: { snake: 10, "fruit-slice": 20 },
      render: () => undefined,
    });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "menu:snake", point: { x: 220, y: 260 } satisfies Point, source: "poke" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "snake" });
  });

  it("switches to fruit slice when the fruit card is clicked", () => {
    const scene = new MenuScene({
      bounds: { width: 960, height: 640 },
      bestScores: { snake: 10, "fruit-slice": 20 },
      render: () => undefined,
    });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "menu:fruit-slice", point: { x: 610, y: 260 }, source: "hover" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "fruit-slice" });
  });

  it("reports the hovered card id for pointer hit testing", () => {
    const scene = new MenuScene({
      bounds: { width: 960, height: 640 },
      bestScores: { snake: 10, "fruit-slice": 20 },
      render: () => undefined,
    });

    expect(scene.hitTest({ x: 240, y: 300 })).toBe("menu:snake");
    expect(scene.hitTest({ x: 720, y: 300 })).toBe("menu:fruit-slice");
    expect(scene.hitTest({ x: 20, y: 20 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run menu tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/scenes/menuScene.test.ts
```

Expected: FAIL because `menuScene.ts` does not exist.

- [ ] **Step 3: Add renderer menu types**

In `src/render/renderer.ts`, export these interfaces near the top:

```ts
export interface MenuCardView {
  id: string;
  title: string;
  description: string;
  bestScore: number;
  rect: { x: number; y: number; width: number; height: number };
  hovered: boolean;
}

export interface MenuView {
  cards: MenuCardView[];
}
```

Add a public method:

```ts
renderMenu(view: MenuView): void {
  const metrics = this.resizeCanvas();
  this.context.clearRect(0, 0, metrics.width, metrics.height);
  this.context.fillStyle = "#101820";
  this.context.fillRect(0, 0, metrics.width, metrics.height);

  for (const card of view.cards) {
    this.context.fillStyle = card.hovered ? "#1d3b4f" : "#121b26";
    this.context.fillRect(card.rect.x, card.rect.y, card.rect.width, card.rect.height);
    this.context.strokeStyle = card.hovered ? "#ffd166" : "#2f435b";
    this.context.lineWidth = 2;
    this.context.strokeRect(card.rect.x, card.rect.y, card.rect.width, card.rect.height);
    this.context.fillStyle = "#e8eef7";
    this.context.font = "700 28px system-ui";
    this.context.textAlign = "left";
    this.context.textBaseline = "top";
    this.context.fillText(card.title, card.rect.x + 24, card.rect.y + 24);
    this.context.font = "500 16px system-ui";
    this.context.fillText(card.description, card.rect.x + 24, card.rect.y + 72);
    this.context.fillText(`Best ${card.bestScore}`, card.rect.x + 24, card.rect.y + card.rect.height - 42);
  }
}
```

- [ ] **Step 4: Implement menu scene**

Create `src/scenes/menuScene.ts`:

```ts
import type { GameId, Point } from "../domain/types";
import { containsPoint, type Rect, type Size } from "../domain/geometry";
import type { MenuView } from "../render/renderer";
import type { Scene, SceneRenderContext, SceneTransition, SceneUpdateContext } from "./scene";
import { NO_TRANSITION } from "./scene";

interface MenuSceneOptions {
  bounds: Size;
  bestScores: Record<GameId, number>;
  render: (view: MenuView) => void;
}

interface MenuCard {
  id: `menu:${GameId}`;
  gameId: GameId;
  title: string;
  description: string;
  rect: Rect;
}

export class MenuScene implements Scene {
  readonly id = "menu";
  private readonly cards: MenuCard[];

  constructor(private readonly options: MenuSceneOptions) {
    const cardWidth = 340;
    const cardHeight = 240;
    const gap = 40;
    const startX = (options.bounds.width - cardWidth * 2 - gap) / 2;
    const y = 190;

    this.cards = [
      {
        id: "menu:snake",
        gameId: "snake",
        title: "Snake",
        description: "Move from the center joystick.",
        rect: { x: startX, y, width: cardWidth, height: cardHeight },
      },
      {
        id: "menu:fruit-slice",
        gameId: "fruit-slice",
        title: "Fruit Slice",
        description: "Swipe through fruit, avoid bombs.",
        rect: { x: startX + cardWidth + gap, y, width: cardWidth, height: cardHeight },
      },
    ];
  }

  hitTest(point: Point | null): string | null {
    if (!point) {
      return null;
    }

    return this.cards.find((card) => containsPoint(card.rect, point))?.id ?? null;
  }

  update(context: SceneUpdateContext): SceneTransition {
    const clickedCard = this.cards.find((card) => card.id === context.input.click?.id);
    return clickedCard ? { type: "switch", scene: clickedCard.gameId } : NO_TRANSITION;
  }

  render(context: SceneRenderContext): void {
    this.options.render({
      cards: this.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        bestScore: this.options.bestScores[card.gameId],
        rect: card.rect,
        hovered: context.input.hover.targetId === card.id,
      })),
    });
  }
}
```

- [ ] **Step 5: Run menu scene tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/scenes/menuScene.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add renderer menu test**

Append to `src/render/renderer.test.ts`:

```ts
it("draws menu cards", () => {
  const context = new FakeCanvasContext();
  const renderer = createRenderer(context);

  renderer.renderMenu({
    cards: [
      {
        id: "menu:snake",
        title: "Snake",
        description: "Move from center.",
        bestScore: 4,
        rect: { x: 100, y: 120, width: 300, height: 200 },
        hovered: true,
      },
    ],
  });

  expect(context.calls).toContainEqual({
    method: "fillText",
    args: ["Snake", 124, 144],
  });
});
```

- [ ] **Step 7: Run renderer tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/render/renderer.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/menuScene.ts src/scenes/menuScene.test.ts src/render/renderer.ts src/render/renderer.test.ts
git commit -m "feat: add gesture menu scene"
```

---

## Task 7: Wrap Existing Snake as a Scene

**Files:**
- Create: `src/scenes/snakeScene.ts`
- Create: `src/scenes/snakeScene.test.ts`
- Modify: `src/render/renderer.ts`

- [ ] **Step 1: Write snake scene tests**

Create `src/scenes/snakeScene.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { HandInputState } from "../domain/types";
import { SnakeScene } from "./snakeScene";

function input(overrides: Partial<HandInputState> = {}): HandInputState {
  return {
    click: null,
    clickAnimation: { active: false, point: null, progress: 0 },
    hover: { targetId: null, progress: 0 },
    normalizedPointer: null,
    pointer: null,
    pointerVisible: false,
    trail: [],
    ...overrides,
  };
}

describe("SnakeScene", () => {
  it("updates snake with fixed-center joystick input", () => {
    const scene = new SnakeScene({
      bounds: { width: 960, height: 640 },
      render: () => undefined,
      recordBestScore: () => undefined,
    });

    scene.update({
      deltaSeconds: 1,
      input: input({ normalizedPointer: { x: 0.9, y: 0.5, z: 0 }, pointerVisible: true }),
    });

    expect(scene.getState().head.x).toBeGreaterThan(480);
  });

  it("switches to menu when Home is clicked", () => {
    let recordedScore = -1;
    const scene = new SnakeScene({
      bounds: { width: 960, height: 640 },
      render: () => undefined,
      recordBestScore: (score) => {
        recordedScore = score;
      },
    });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "nav:home", point: { x: 34, y: 34 }, source: "poke" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "menu" });
    expect(recordedScore).toBe(scene.getState().score);
  });
});
```

- [ ] **Step 2: Run snake scene tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/scenes/snakeScene.test.ts
```

Expected: FAIL because `snakeScene.ts` does not exist.

- [ ] **Step 3: Add renderer snake wrapper**

In `src/render/renderer.ts`, keep the existing `render(game, debug)` method. Add this alias so scenes can call intent-specific methods without changing old tests:

```ts
renderSnake(game: SnakeGameState, debug: RenderDebugState): void {
  this.render(game, debug);
}
```

- [ ] **Step 4: Implement snake scene**

Create `src/scenes/snakeScene.ts`:

```ts
import { GestureJoystick } from "../domain/gestureJoystick";
import { SnakeGame } from "../domain/snakeGame";
import type { JoystickOutput, SnakeGameState } from "../domain/types";
import type { Size } from "../domain/geometry";
import type { Renderer } from "../render/renderer";
import type { Scene, SceneRenderContext, SceneTransition, SceneUpdateContext } from "./scene";
import { NO_TRANSITION } from "./scene";

const EMPTY_JOYSTICK: JoystickOutput = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  origin: { x: 0.5, y: 0.5 },
  speedScale: 0,
};

interface SnakeSceneOptions {
  bounds: Size;
  render: (game: SnakeGameState, debug: Parameters<Renderer["renderSnake"]>[1]) => void;
  recordBestScore: (score: number) => void;
}

export class SnakeScene implements Scene {
  readonly id = "snake";
  private readonly joystick = new GestureJoystick({ deadZone: 0.035, maxDistance: 0.32 });
  private readonly game: SnakeGame;
  private latestJoystick = EMPTY_JOYSTICK;

  constructor(private readonly options: SnakeSceneOptions) {
    this.game = new SnakeGame({ width: options.bounds.width, height: options.bounds.height });
  }

  getState(): SnakeGameState {
    return this.game.getState();
  }

  update(context: SceneUpdateContext): SceneTransition {
    if (context.input.click?.id === "nav:home") {
      this.options.recordBestScore(this.game.getState().score);
      return { type: "switch", scene: "menu" };
    }

    this.latestJoystick = this.joystick.update(context.input.normalizedPointer);
    this.game.update(this.latestJoystick, context.deltaSeconds);

    if (this.game.getState().status === "game-over") {
      this.options.recordBestScore(this.game.getState().score);
    }

    return NO_TRANSITION;
  }

  render(context: SceneRenderContext): void {
    this.options.render(this.game.getState(), {
      joystick: this.latestJoystick,
      tracking: {
        point: context.input.normalizedPointer,
        status: context.input.pointerVisible ? "tracking" : "searching",
        errorMessage: null,
      },
    });
  }
}
```

- [ ] **Step 5: Run snake scene tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/scenes/snakeScene.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/snakeScene.ts src/scenes/snakeScene.test.ts src/render/renderer.ts
git commit -m "feat: add snake scene"
```

---

## Task 8: Implement Fruit Slice Domain Rules

**Files:**
- Create: `src/domain/fruitSlice.ts`
- Create: `src/domain/fruitSlice.test.ts`

- [ ] **Step 1: Write fruit domain tests**

Create `src/domain/fruitSlice.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FruitSliceGame } from "./fruitSlice";

describe("FruitSliceGame", () => {
  it("slices fruit when a fast trail segment crosses it", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().score).toBe(10);
    expect(game.getState().objects[0].sliced).toBe(true);
  });

  it("does not slice fruit with a slow trail", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 260, y: 300 }, timestampMs: 400 },
    ]);

    expect(game.getState().score).toBe(0);
    expect(game.getState().objects[0].sliced).toBe(false);
  });

  it("reduces lives and clears combo when a bomb is sliced", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().lives).toBe(2);
    expect(game.getState().combo).toBe(0);
  });

  it("ends the game when lives reach zero", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      lives: 1,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().status).toBe("game-over");
  });

  it("reduces lives when an unsliced fruit falls below the screen", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 700 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, []);

    expect(game.getState().lives).toBe(2);
  });
});
```

- [ ] **Step 2: Run fruit domain tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/domain/fruitSlice.test.ts
```

Expected: FAIL because `fruitSlice.ts` does not exist.

- [ ] **Step 3: Implement fruit domain**

Create `src/domain/fruitSlice.ts`:

```ts
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
}

const FRUIT_TYPES: FruitType[] = ["apple", "orange", "watermelon", "banana", "strawberry", "kiwi", "pineapple", "dragon-fruit"];
const GRAVITY = 780;
const MIN_SLICE_SPEED = 700;

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
    this.state = {
      bounds: { width: this.width, height: this.height },
      objects: (options.initialObjects ?? []).map((object) => this.cloneObject(object)),
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
    if (this.state.status === "game-over") {
      return;
    }

    this.state = {
      ...this.state,
      elapsedSeconds: this.state.elapsedSeconds + deltaSeconds,
      objects: this.state.objects.map((object) => this.moveObject(object, deltaSeconds)),
    };

    this.applySlices(trail);
    if (this.state.status === "game-over") {
      return;
    }

    this.removeMissedObjects();
    if (this.state.status === "game-over") {
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

  private cloneObject<T extends SliceObject>(object: T): T {
    return {
      ...object,
      position: { ...object.position },
      velocity: { ...object.velocity },
    };
  }
}
```

- [ ] **Step 4: Run fruit domain tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/domain/fruitSlice.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/fruitSlice.ts src/domain/fruitSlice.test.ts
git commit -m "feat: add fruit slice game rules"
```

---

## Task 9: Add Fruit Assets and Manifest

**Files:**
- Create: `src/assets/fruit/manifest.ts`
- Create: generated PNG files in `src/assets/fruit/`

- [ ] **Step 1: Generate juicy arcade sprites with imagegen**

Use the image generation tool to create transparent-background PNG sprites. Generate at least:

```text
Juicy arcade fruit game sprite sheet on transparent background. Include whole apple, orange, watermelon, banana, strawberry, kiwi, pineapple, dragon fruit, one cartoon bomb, and bright juice splashes. High saturation, clean readable silhouettes, front-facing game assets, no text, no background.
```

Save usable PNG assets under `src/assets/fruit/`. File names:

```text
apple.png
apple-left.png
apple-right.png
orange.png
orange-left.png
orange-right.png
watermelon.png
watermelon-left.png
watermelon-right.png
banana.png
banana-left.png
banana-right.png
strawberry.png
strawberry-left.png
strawberry-right.png
kiwi.png
kiwi-left.png
kiwi-right.png
pineapple.png
pineapple-left.png
pineapple-right.png
dragon-fruit.png
dragon-fruit-left.png
dragon-fruit-right.png
bomb.png
juice-splash.png
```

If image generation returns a sprite sheet rather than separate files, crop each sprite into the file names above and keep the original sheet as `src/assets/fruit/fruit-sheet.png`.

- [ ] **Step 2: Create manifest**

Create `src/assets/fruit/manifest.ts`:

```ts
import apple from "./apple.png";
import appleLeft from "./apple-left.png";
import appleRight from "./apple-right.png";
import banana from "./banana.png";
import bananaLeft from "./banana-left.png";
import bananaRight from "./banana-right.png";
import bomb from "./bomb.png";
import dragonFruit from "./dragon-fruit.png";
import dragonFruitLeft from "./dragon-fruit-left.png";
import dragonFruitRight from "./dragon-fruit-right.png";
import kiwi from "./kiwi.png";
import kiwiLeft from "./kiwi-left.png";
import kiwiRight from "./kiwi-right.png";
import juiceSplash from "./juice-splash.png";
import orange from "./orange.png";
import orangeLeft from "./orange-left.png";
import orangeRight from "./orange-right.png";
import pineapple from "./pineapple.png";
import pineappleLeft from "./pineapple-left.png";
import pineappleRight from "./pineapple-right.png";
import strawberry from "./strawberry.png";
import strawberryLeft from "./strawberry-left.png";
import strawberryRight from "./strawberry-right.png";
import watermelon from "./watermelon.png";
import watermelonLeft from "./watermelon-left.png";
import watermelonRight from "./watermelon-right.png";
import type { FruitType } from "../../domain/fruitSlice";

export interface FruitAssetSet {
  whole: string;
  left: string;
  right: string;
}

export const fruitAssets: Record<FruitType, FruitAssetSet> = {
  apple: { whole: apple, left: appleLeft, right: appleRight },
  banana: { whole: banana, left: bananaLeft, right: bananaRight },
  "dragon-fruit": { whole: dragonFruit, left: dragonFruitLeft, right: dragonFruitRight },
  kiwi: { whole: kiwi, left: kiwiLeft, right: kiwiRight },
  orange: { whole: orange, left: orangeLeft, right: orangeRight },
  pineapple: { whole: pineapple, left: pineappleLeft, right: pineappleRight },
  strawberry: { whole: strawberry, left: strawberryLeft, right: strawberryRight },
  watermelon: { whole: watermelon, left: watermelonLeft, right: watermelonRight },
};

export const bombAsset = bomb;
export const juiceSplashAsset = juiceSplash;
```

- [ ] **Step 3: Run build**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run build
```

Expected: PASS. If an import fails, rename or recrop the generated PNG so every manifest import path exists.

- [ ] **Step 4: Commit**

```bash
git add src/assets/fruit
git commit -m "feat: add fruit slice assets"
```

---

## Task 10: Render Fruit Slice Fallback and Shared UI

**Files:**
- Modify: `src/render/renderer.ts`
- Modify: `src/render/renderer.test.ts`

- [ ] **Step 1: Write renderer tests for shared UI and Fruit Slice fallback**

Append to `src/render/renderer.test.ts`:

```ts
it("draws the pointer click animation ring", () => {
  const context = new FakeCanvasContext();
  const renderer = createRenderer(context);

  renderer.renderPointer({
    pointer: { x: 100, y: 120 },
    clickAnimation: { active: true, point: { x: 100, y: 120 }, progress: 0.5 },
  });

  expect(context.calls).toContainEqual({
    method: "arc",
    args: [100, 120, 18, 0, Math.PI * 2],
  });
});

it("draws the Home button", () => {
  const context = new FakeCanvasContext();
  const renderer = createRenderer(context);

  renderer.renderHomeButton(true);

  expect(context.calls).toContainEqual({
    method: "fillText",
    args: ["Home", 60, 38],
  });
});

it("draws fruit slice fallback objects", () => {
  const context = new FakeCanvasContext();
  const renderer = createRenderer(context);

  renderer.renderFruitSlice({
    bounds: { width: 960, height: 640 },
    objects: [
      { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 200, y: 240 }, velocity: { x: 0, y: 0 }, radius: 38, sliced: false },
      { id: "bomb-1", kind: "bomb", position: { x: 420, y: 240 }, velocity: { x: 0, y: 0 }, radius: 36, sliced: false },
    ],
    score: 30,
    combo: 2,
    lives: 3,
    status: "running",
    elapsedSeconds: 4,
  });

  expect(context.calls).toContainEqual({
    method: "arc",
    args: [200, 240, 38, 0, Math.PI * 2],
  });
  expect(context.calls).toContainEqual({
    method: "arc",
    args: [420, 240, 36, 0, Math.PI * 2],
  });
});

it("draws the Fruit Slice restart button on game over", () => {
  const context = new FakeCanvasContext();
  const renderer = createRenderer(context);

  renderer.renderFruitSlice({
    bounds: { width: 960, height: 640 },
    objects: [],
    score: 30,
    combo: 0,
    lives: 0,
    status: "game-over",
    elapsedSeconds: 20,
  });

  expect(context.calls).toContainEqual({
    method: "fillText",
    args: ["Restart", 480, 385],
  });
});

it("draws camera startup errors", () => {
  const context = new FakeCanvasContext();
  const renderer = createRenderer(context);

  renderer.renderTrackingError({
    point: null,
    status: "error",
    errorMessage: "Permission denied",
  });

  expect(context.calls).toContainEqual({
    method: "fillText",
    args: ["Permission denied", 480, 320],
  });
});
```

- [ ] **Step 2: Run renderer tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/render/renderer.test.ts
```

Expected: FAIL because `renderPointer()`, `renderFruitSlice()`, and `renderTrackingError()` do not exist.

- [ ] **Step 3: Add renderer methods**

Modify `src/render/renderer.ts` imports:

```ts
import { bombAsset, fruitAssets } from "../assets/fruit/manifest";
import type { FruitSliceState, SliceObject } from "../domain/fruitSlice";
import type { ClickAnimationState, JoystickOutput, Point, SnakeGameState, TrackingFrame } from "../domain/types";
```

Add this field to `Renderer`:

```ts
private readonly imageCache = new Map<string, HTMLImageElement>();
```

Add methods to `Renderer`:

```ts
renderPointer(view: { pointer: Point | null; clickAnimation: ClickAnimationState }): void {
  if (view.pointer) {
    this.context.fillStyle = "#ffd166";
    this.context.beginPath();
    this.context.arc(view.pointer.x, view.pointer.y, 6, 0, Math.PI * 2);
    this.context.fill();
  }

  if (view.clickAnimation.active && view.clickAnimation.point) {
    this.context.strokeStyle = "#ffd166";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.arc(view.clickAnimation.point.x, view.clickAnimation.point.y, 12 + view.clickAnimation.progress * 12, 0, Math.PI * 2);
    this.context.stroke();
  }
}

renderHomeButton(hovered: boolean): void {
  this.context.fillStyle = hovered ? "#1d3b4f" : "#121b26";
  this.context.fillRect(16, 16, 88, 44);
  this.context.strokeStyle = hovered ? "#ffd166" : "#2f435b";
  this.context.strokeRect(16, 16, 88, 44);
  this.context.fillStyle = "#e8eef7";
  this.context.font = "700 16px system-ui";
  this.context.textAlign = "center";
  this.context.textBaseline = "middle";
  this.context.fillText("Home", 60, 38);
}

renderTrackingError(tracking: TrackingFrame): void {
  const metrics = this.resizeCanvas();
  this.context.clearRect(0, 0, metrics.width, metrics.height);
  this.context.fillStyle = "#101820";
  this.context.fillRect(0, 0, metrics.width, metrics.height);
  this.drawCenteredText(tracking.errorMessage ?? "Camera unavailable", metrics);
  this.elements.statusValue.textContent = tracking.status;
  this.elements.scoreValue.textContent = "0";
  this.elements.originValue.textContent = "not locked";
  this.elements.vectorValue.textContent = "paused";
  this.elements.errorText.textContent = tracking.errorMessage ?? "";
}

renderFruitSlice(state: FruitSliceState): void {
  const metrics = this.resizeCanvas();
  this.context.clearRect(0, 0, metrics.width, metrics.height);
  this.context.fillStyle = "#101820";
  this.context.fillRect(0, 0, metrics.width, metrics.height);

  for (const object of state.objects) {
    this.drawSliceObject(object);
  }

  this.context.fillStyle = "#e8eef7";
  this.context.font = "700 20px system-ui";
  this.context.textAlign = "left";
  this.context.textBaseline = "top";
  this.context.fillText(`Score ${state.score}`, 124, 22);
  this.context.fillText(`Lives ${state.lives}`, 260, 22);
  this.context.fillText(`Combo ${state.combo}`, 380, 22);

  if (state.status === "game-over") {
    this.drawCenteredText("Game Over", metrics);
    this.context.fillStyle = "#ffd166";
    this.context.fillRect(380, 350, 200, 70);
    this.context.strokeStyle = "#101820";
    this.context.lineWidth = 3;
    this.context.strokeRect(380, 350, 200, 70);
    this.context.fillStyle = "#101820";
    this.context.font = "800 24px system-ui";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText("Restart", 480, 385);
  }
}

private drawSliceObject(object: SliceObject): void {
  const asset = object.kind === "bomb" ? bombAsset : fruitAssets[object.fruitType]?.whole;
  const size = object.radius * 2.2;

  if (asset && this.drawImageAsset(asset, object.position.x - size / 2, object.position.y - size / 2, size)) {
    return;
  }

  this.context.fillStyle = object.kind === "bomb" ? "#2b2d42" : "#ff6b6b";
  this.context.beginPath();
  this.context.arc(object.position.x, object.position.y, object.radius, 0, Math.PI * 2);
  this.context.fill();
}

private drawImageAsset(src: string, x: number, y: number, size: number): boolean {
  if (typeof Image === "undefined") {
    return false;
  }

  let image = this.imageCache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    this.imageCache.set(src, image);
  }

  if (!image.complete || image.naturalWidth === 0) {
    return false;
  }

  this.context.drawImage(image, x, y, size, size);
  return true;
}
```

- [ ] **Step 4: Run renderer tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/render/renderer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/renderer.ts src/render/renderer.test.ts
git commit -m "feat: add arcade render helpers"
```

---

## Task 11: Build Fruit Slice Scene

**Files:**
- Create: `src/scenes/fruitSliceScene.ts`
- Create: `src/scenes/fruitSliceScene.test.ts`

- [ ] **Step 1: Write fruit scene tests**

Create `src/scenes/fruitSliceScene.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SliceObject } from "../domain/fruitSlice";
import type { HandInputState } from "../domain/types";
import { BestScores } from "../storage/bestScores";
import { FruitSliceScene } from "./fruitSliceScene";

function input(overrides: Partial<HandInputState> = {}): HandInputState {
  return {
    click: null,
    clickAnimation: { active: false, point: null, progress: 0 },
    hover: { targetId: null, progress: 0 },
    normalizedPointer: null,
    pointer: null,
    pointerVisible: false,
    trail: [],
    ...overrides,
  };
}

describe("FruitSliceScene", () => {
  it("switches to menu when Home is clicked", () => {
    const scene = new FruitSliceScene({
      bounds: { width: 960, height: 640 },
      bestScores: new BestScores(null),
      render: () => undefined,
      random: () => 0.5,
    });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "nav:home", point: { x: 34, y: 34 }, source: "hover" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "menu" });
  });

  it("restarts after game over when restart is clicked", () => {
    const bomb: SliceObject = {
      id: "bomb-1",
      kind: "bomb",
      position: { x: 300, y: 300 },
      velocity: { x: 0, y: 0 },
      radius: 40,
      sliced: false,
    };
    const scene = new FruitSliceScene({
      bounds: { width: 960, height: 640 },
      bestScores: new BestScores(null),
      render: () => undefined,
      random: () => 0.5,
      initialLives: 1,
      initialObjects: [bomb],
    });

    scene.update({
      deltaSeconds: 0.016,
      input: input({
        trail: [
          { point: { x: 240, y: 300 }, timestampMs: 0 },
          { point: { x: 360, y: 300 }, timestampMs: 80 },
        ],
      }),
    });
    expect(scene.getState().status).toBe("game-over");

    scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "fruit:restart", point: { x: 480, y: 380 }, source: "poke" } }),
    });

    expect(scene.getState().status).toBe("running");
    expect(scene.getState().lives).toBe(3);
  });
});
```

- [ ] **Step 2: Run fruit scene tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/scenes/fruitSliceScene.test.ts
```

Expected: FAIL because `fruitSliceScene.ts` does not exist.

- [ ] **Step 3: Implement fruit scene**

Create `src/scenes/fruitSliceScene.ts`:

```ts
import { FruitSliceGame, type FruitSliceState, type SliceObject } from "../domain/fruitSlice";
import type { Size } from "../domain/geometry";
import { BestScores } from "../storage/bestScores";
import type { Scene, SceneRenderContext, SceneTransition, SceneUpdateContext } from "./scene";
import { NO_TRANSITION } from "./scene";

interface FruitSliceSceneOptions {
  bounds: Size;
  bestScores: BestScores;
  render: (state: FruitSliceState) => void;
  random?: () => number;
  initialLives?: number;
  initialObjects?: SliceObject[];
}

export class FruitSliceScene implements Scene {
  readonly id = "fruit-slice";
  private game: FruitSliceGame;

  constructor(private readonly options: FruitSliceSceneOptions) {
    this.game = this.createGame(options.initialLives ?? 3, options.initialObjects ?? []);
  }

  getState(): FruitSliceState {
    return this.game.getState();
  }

  update(context: SceneUpdateContext): SceneTransition {
    if (context.input.click?.id === "nav:home") {
      this.options.bestScores.record("fruit-slice", this.game.getState().score);
      return { type: "switch", scene: "menu" };
    }

    if (context.input.click?.id === "fruit:restart" && this.game.getState().status === "game-over") {
      this.game = this.createGame(3, []);
      return NO_TRANSITION;
    }

    this.game.update(context.deltaSeconds, context.input.trail);
    if (this.game.getState().status === "game-over") {
      this.options.bestScores.record("fruit-slice", this.game.getState().score);
    }

    return NO_TRANSITION;
  }

  render(_context: SceneRenderContext): void {
    this.options.render(this.game.getState());
  }

  private createGame(lives: number, initialObjects: SliceObject[]): FruitSliceGame {
    return new FruitSliceGame({
      width: this.options.bounds.width,
      height: this.options.bounds.height,
      lives,
      random: this.options.random,
      initialObjects,
    });
  }
}
```

- [ ] **Step 4: Run fruit scene tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/scenes/fruitSliceScene.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/fruitSliceScene.ts src/scenes/fruitSliceScene.test.ts
git commit -m "feat: add fruit slice scene"
```

---

## Task 12: Integrate Scenes Into AppController

**Files:**
- Modify: `src/app/appController.ts`
- Modify: `src/app/appController.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write app integration tests**

Modify `src/app/appController.test.ts` to mock new scenes and input. Add tests:

```ts
it("renders the menu after camera startup succeeds", async () => {
  appMocks.trackerStart.mockResolvedValue({
    point: null,
    status: "searching",
    errorMessage: null,
  });

  const controller = new AppController(createRoot());

  await controller.start();

  expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  expect(appMocks.rendererRenderMenu).toHaveBeenCalled();
});

it("keeps startup error behavior without scheduling the loop", async () => {
  const errorFrame = {
    point: null,
    status: "error" as const,
    errorMessage: "Permission denied",
  };
  appMocks.trackerStart.mockResolvedValue(errorFrame);

  const controller = new AppController(createRoot());

  await controller.start();

  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(appMocks.rendererRenderTrackingError).toHaveBeenCalledWith(errorFrame);
});
```

Update the existing mocks to this shape:

```ts
const appMocks = vi.hoisted(() => ({
  trackerStart: vi.fn(),
  trackerDetect: vi.fn(),
  trackerDispose: vi.fn(),
  rendererRender: vi.fn(),
  rendererRenderMenu: vi.fn(),
  rendererRenderSnake: vi.fn(),
  rendererRenderFruitSlice: vi.fn(),
  rendererRenderPointer: vi.fn(),
  rendererRenderHomeButton: vi.fn(),
  rendererRenderTrackingError: vi.fn(),
}));

vi.mock("../render/renderer", () => ({
  Renderer: vi.fn(
    class {
      render = appMocks.rendererRender;
      renderMenu = appMocks.rendererRenderMenu;
      renderSnake = appMocks.rendererRenderSnake;
      renderFruitSlice = appMocks.rendererRenderFruitSlice;
      renderPointer = appMocks.rendererRenderPointer;
      renderHomeButton = appMocks.rendererRenderHomeButton;
      renderTrackingError = appMocks.rendererRenderTrackingError;
    },
  ),
}));
```

- [ ] **Step 2: Run app tests to verify failure**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/app/appController.test.ts
```

Expected: FAIL because `AppController` still directly wires the old snake-only loop.

- [ ] **Step 3: Refactor AppController wiring**

Modify `src/app/appController.ts`:

- Keep the existing DOM shell and `CameraTracker`.
- Update the canvas label and debug title inside the constructor template:

```html
<canvas class="game-canvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Motion Arcade game canvas"></canvas>
```

```html
<h1>Motion Arcade</h1>
```

- Add imports:

```ts
import { HandInputController } from "../input/handInput";
import { BestScores } from "../storage/bestScores";
import { MenuScene } from "../scenes/menuScene";
import { SnakeScene } from "../scenes/snakeScene";
import { FruitSliceScene } from "../scenes/fruitSliceScene";
import type { Scene, SceneId, SceneTransition } from "../scenes/scene";
import type { Point } from "../domain/types";
```

- Add fields:

```ts
private readonly bestScores = new BestScores(globalThis.localStorage ?? null);
private readonly input = new HandInputController({
  canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  hoverClickMs: 800,
  pokeDepthDelta: 0.08,
  clickAnimationMs: 220,
  maxTrailAgeMs: 180,
});
private currentScene: Scene;
```

- Initialize `currentScene` after `this.renderer` is created:

```ts
this.currentScene = this.createScene("menu");
```

- Add `createScene(sceneId: SceneId): Scene`:

```ts
private createScene(sceneId: SceneId): Scene {
  if (sceneId === "menu") {
    return new MenuScene({
      bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      bestScores: {
        snake: this.bestScores.get("snake"),
        "fruit-slice": this.bestScores.get("fruit-slice"),
      },
      render: (view) => this.renderer.renderMenu(view),
    });
  }

  if (sceneId === "snake") {
    return new SnakeScene({
      bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      render: (game, debug) => this.renderer.renderSnake(game, debug),
      recordBestScore: (score) => this.bestScores.record("snake", score),
    });
  }

  return new FruitSliceScene({
    bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    bestScores: this.bestScores,
    render: (state) => this.renderer.renderFruitSlice(state),
  });
}
```

- Add `updateAndRenderCurrentScene(timestampMs: number, deltaSeconds: number)`:

```ts
private updateAndRenderCurrentScene(timestampMs: number, deltaSeconds: number): void {
  const pointer = this.latestTracking.point
    ? { x: this.latestTracking.point.x * CANVAS_WIDTH, y: this.latestTracking.point.y * CANVAS_HEIGHT }
    : null;
  const hoverTargetId = this.hitTest(pointer);
  const inputState = this.input.update({
    timestampMs,
    trackingPoint: this.latestTracking.point,
    hoverTargetId,
  });
  const transition = this.currentScene.update({ input: inputState, deltaSeconds });
  this.applyTransition(transition);
  this.currentScene.render({ input: inputState });
  if (this.currentScene.id !== "menu") {
    this.renderer.renderHomeButton(inputState.hover.targetId === "nav:home");
  }
  this.renderer.renderPointer({
    pointer: inputState.pointer,
    clickAnimation: inputState.clickAnimation,
  });
}
```

- In `loop`, replace the old joystick/game update/render block after `this.latestTracking = this.tracker.detect(timestamp)` with:

```ts
this.updateAndRenderCurrentScene(timestamp, deltaSeconds);
```

- Add `hitTest`:

```ts
private hitTest(point: Point | null): string | null {
  if (!point) {
    return null;
  }

  if (point.x >= 16 && point.x <= 104 && point.y >= 16 && point.y <= 60 && this.currentScene.id !== "menu") {
    return "nav:home";
  }

  if (this.currentScene instanceof MenuScene) {
    return this.currentScene.hitTest(point);
  }

  if (this.currentScene.id === "fruit-slice" && point.x >= 380 && point.x <= 580 && point.y >= 350 && point.y <= 420) {
    return "fruit:restart";
  }

  return null;
}
```

- Add `applyTransition`:

```ts
private applyTransition(transition: SceneTransition): void {
  if (transition.type === "switch") {
    this.currentScene = this.createScene(transition.scene);
  }
}
```

Keep startup error behavior: if `tracker.start()` returns error, do not schedule RAF.

In `startInternal()`, after `this.latestTracking = await this.tracker.start()`, keep the early return and render the error through the new renderer method:

```ts
if (this.latestTracking.status === "error") {
  this.renderer.renderTrackingError(this.latestTracking);
  return;
}
```

After that error block and before scheduling RAF, render the menu once so `start()` shows the arcade hub before the first animation callback:

```ts
this.updateAndRenderCurrentScene(0, 0);
```

Modify `src/styles.css` so the focused test layout remains dense but fits the arcade hub copy:

```css
.app-shell {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 300px;
  gap: 14px;
  width: 100%;
  height: 100%;
  padding: 14px;
  background: #0b1117;
}

.debug-card h1,
.debug-card h2 {
  margin: 0 0 8px;
  font-size: 15px;
  letter-spacing: 0;
}
```

- [ ] **Step 4: Run app tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test -- src/app/appController.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/appController.ts src/app/appController.test.ts src/styles.css
git commit -m "feat: wire motion arcade scenes"
```

---

## Task 13: Browser Smoke Verification

**Files:**
- Modify only if smoke finds a bug.

- [ ] **Step 1: Run production build**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run build
```

Expected: PASS.

- [ ] **Step 2: Start dev server**

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run dev -- --host 127.0.0.1
```

Expected: Vite serves `http://127.0.0.1:5173/`.

- [ ] **Step 3: Run fake-camera browser smoke**

Use Chrome with fake camera and do not disable GPU:

```bash
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless=new \
  --remote-debugging-port=9334 \
  --user-data-dir=/private/tmp/motion-arcade-smoke \
  --use-fake-ui-for-media-stream \
  --use-fake-device-for-media-stream \
  --no-first-run \
  --no-default-browser-check \
  --disable-crash-reporter \
  http://127.0.0.1:5173/
```

Expected through CDP or browser inspection:

- Page title is present.
- Camera permission is granted.
- Video reaches readyState 4.
- App status is `searching` or menu-visible.
- Canvas exists and is nonzero size.
- Menu card text for Snake and Fruit Slice is present or rendered.

- [ ] **Step 4: Manual real-camera verification**

In a normal browser:

1. Open `http://127.0.0.1:5173/`.
2. Allow camera.
3. Confirm menu shows Snake and Fruit Slice cards.
4. Move index finger and confirm pointer follows.
5. Hover over Snake until it selects, or poke toward camera and confirm click animation.
6. Return Home from Snake.
7. Enter Fruit Slice.
8. Swipe through fruit and confirm score increases.
9. Swipe a bomb and confirm lives decrease.
10. Miss fruit and confirm lives decrease.
11. Reach Game Over and restart.

- [ ] **Step 5: Fix bugs found by smoke**

If smoke fails, write a failing test for the failing behavior, fix it, rerun:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run build
```

- [ ] **Step 6: Final commit**

If fixes were needed:

```bash
git add src
git commit -m "fix: stabilize motion arcade smoke flow"
```

If no fixes were needed, do not create an empty commit.

---

## Final Verification

Run:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run test
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin /opt/homebrew/bin/npm run build
git status --short --branch
```

Expected:

- All tests pass.
- Build passes.
- Working tree is clean after the final commit.

## Spec Coverage Checklist

- Gesture-controllable home menu: Task 6 and Task 12.
- Existing snake preserved: Task 7 and Task 12.
- Fruit Slice arcade game: Task 8, Task 10, Task 11, and Task 12.
- Shared fingertip pointer: Task 3 and Task 10.
- Poke click and hover fallback: Task 3.
- Click animation: Task 3 and Task 10.
- Fruit slicing by fast swipe: Task 8 and Task 11.
- Bomb life penalty: Task 8 and Task 11.
- Infinite arcade difficulty: Task 8.
- Home button: Task 7, Task 10, Task 11, and Task 12.
- Juicy arcade assets: Task 9 and Task 10 asset rendering with fallback.
- Best scores: Task 4, Task 6, Task 7, and Task 11.
- Browser smoke and manual camera verification: Task 13.
