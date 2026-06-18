# Camera-Controlled Snake Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop Chrome web prototype where MediaPipe tracks the user's index fingertip and uses its displacement from a locked origin to steer a continuous snake game.

**Architecture:** Use a small Vite + TypeScript app with Canvas 2D rendering. Keep camera tracking, joystick interpretation, game state, rendering, and app orchestration in separate files so MediaPipe-specific code does not leak into game logic.

**Tech Stack:** Vite 8.0.16, TypeScript 6.0.3, Vitest 4.1.9, `@mediapipe/tasks-vision` 0.10.35, Canvas 2D, browser `getUserMedia`.

---

## References

- Design spec: `docs/superpowers/specs/2026-06-18-camera-snake-design.md`
- MediaPipe Hand Landmarker Web guide: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- Verified npm package version: `@mediapipe/tasks-vision@0.10.35`
- Verified model URL: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`

## File Structure

- Create: `.gitignore` - ignores dependencies, build output, local logs, and `.superpowers/`.
- Create: `package.json` - scripts and exact dependencies.
- Create: `tsconfig.json` - strict TypeScript settings for browser code.
- Create: `index.html` - root document and application mount point.
- Create: `src/styles.css` - focused test layout styles.
- Create: `src/main.ts` - app entry point.
- Create: `src/domain/types.ts` - shared game and tracking types.
- Create: `src/domain/vector.ts` - pure vector math helpers.
- Create: `src/domain/gestureJoystick.ts` - fingertip-origin locking and movement-vector conversion.
- Create: `src/domain/gestureJoystick.test.ts` - joystick unit tests.
- Create: `src/domain/snakeGame.ts` - continuous snake state and rules.
- Create: `src/domain/snakeGame.test.ts` - snake game unit tests.
- Create: `src/camera/cameraTracker.ts` - webcam and MediaPipe Hand Landmarker integration.
- Create: `src/camera/cameraTracker.test.ts` - pure fingertip extraction tests.
- Create: `src/render/renderer.ts` - Canvas drawing and debug panel updates.
- Create: `src/app/appController.ts` - wires camera, joystick, game loop, and renderer.

## Task 1: Scaffold the Vite TypeScript App

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.ts`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
.vite/
.superpowers/
*.log
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "camera-snake-prototype",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "0.10.35"
  },
  "devDependencies": {
    "typescript": "6.0.3",
    "vite": "8.0.16",
    "vitest": "4.1.9"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Camera Snake Prototype</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/styles.css`**

```css
:root {
  color: #e8eef7;
  background: #0b1117;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

button {
  font: inherit;
}

.app-shell {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 280px;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 16px;
  background: #0b1117;
}

.game-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  border: 1px solid #253244;
  border-radius: 8px;
  overflow: hidden;
  background: #101820;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.side-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.camera-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  border: 1px solid #253244;
  border-radius: 8px;
  object-fit: cover;
  background: #111827;
  transform: scaleX(-1);
}

.debug-card {
  border: 1px solid #253244;
  border-radius: 8px;
  padding: 12px;
  background: #121b26;
}

.debug-card h1,
.debug-card h2 {
  margin: 0 0 8px;
  font-size: 14px;
}

.debug-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  font-size: 13px;
  color: #b8c7d9;
}

.debug-grid dt {
  color: #7f91a8;
}

.debug-grid dd {
  margin: 0;
  text-align: right;
  color: #e8eef7;
}

.error-text {
  min-height: 20px;
  color: #ff9b9b;
  font-size: 13px;
  line-height: 1.4;
}
```

- [ ] **Step 6: Create temporary `src/main.ts`**

```typescript
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element");
}

root.innerHTML = `
  <main class="app-shell">
    <section class="game-panel">
      <canvas class="game-canvas" aria-label="Snake game canvas"></canvas>
    </section>
    <aside class="side-panel">
      <video class="camera-preview" autoplay muted playsinline></video>
      <section class="debug-card">
        <h1>Camera Snake Prototype</h1>
        <dl class="debug-grid">
          <dt>Status</dt><dd>Bootstrapped</dd>
          <dt>Score</dt><dd>0</dd>
        </dl>
      </section>
      <p class="error-text"></p>
    </aside>
  </main>
`;
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm install
```

Expected: `package-lock.json` is created and the install exits with code 0.

- [ ] **Step 8: Verify scaffold builds**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run build
```

Expected: TypeScript completes with no errors and Vite writes `dist/`.

- [ ] **Step 9: Commit scaffold**

```bash
git -c core.fsmonitor=false add .gitignore package.json package-lock.json tsconfig.json index.html src/styles.css src/main.ts
git -c core.fsmonitor=false commit -m "chore: scaffold camera snake web app"
```

## Task 2: Add Vector Math and Gesture Joystick Logic

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/vector.ts`
- Create: `src/domain/gestureJoystick.ts`
- Create: `src/domain/gestureJoystick.test.ts`

- [ ] **Step 1: Write failing joystick tests in `src/domain/gestureJoystick.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { GestureJoystick } from "./gestureJoystick";

describe("GestureJoystick", () => {
  it("locks the first tracked point as origin and pauses inside the dead zone", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.5 });

    const first = joystick.update({ x: 0.5, y: 0.5 });
    expect(first.origin).toEqual({ x: 0.5, y: 0.5 });
    expect(first.active).toBe(false);
    expect(first.speedScale).toBe(0);

    const insideDeadZone = joystick.update({ x: 0.56, y: 0.5 });
    expect(insideDeadZone.origin).toEqual({ x: 0.5, y: 0.5 });
    expect(insideDeadZone.active).toBe(false);
    expect(insideDeadZone.magnitude).toBeCloseTo(0.06);
  });

  it("normalizes movement direction and clamps speed scale", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.3 });

    joystick.update({ x: 0.2, y: 0.2 });
    const output = joystick.update({ x: 0.8, y: 0.2 });

    expect(output.active).toBe(true);
    expect(output.direction.x).toBeCloseTo(1);
    expect(output.direction.y).toBeCloseTo(0);
    expect(output.speedScale).toBe(1);
  });

  it("resets the origin after tracking is lost", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.5 });

    joystick.update({ x: 0.1, y: 0.1 });
    const lost = joystick.update(null);
    expect(lost.origin).toBeNull();
    expect(lost.active).toBe(false);

    const relocked = joystick.update({ x: 0.8, y: 0.8 });
    expect(relocked.origin).toEqual({ x: 0.8, y: 0.8 });
    expect(relocked.active).toBe(false);
  });
});
```

- [ ] **Step 2: Run the joystick test to verify it fails**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test -- src/domain/gestureJoystick.test.ts
```

Expected: FAIL with an import error for `./gestureJoystick`.

- [ ] **Step 3: Create `src/domain/types.ts`**

```typescript
export interface Point {
  x: number;
  y: number;
}

export interface MovementVector {
  active: boolean;
  direction: Point;
  magnitude: number;
  speedScale: number;
}

export interface JoystickOutput extends MovementVector {
  origin: Point | null;
}

export type GameStatus = "running" | "game-over";

export interface Food {
  position: Point;
  radius: number;
}

export interface SnakeGameState {
  bounds: {
    width: number;
    height: number;
  };
  head: Point;
  trail: Point[];
  targetLength: number;
  food: Food;
  score: number;
  status: GameStatus;
}

export interface TrackingFrame {
  point: Point | null;
  status: "loading" | "searching" | "tracking" | "error";
  errorMessage: string | null;
}
```

- [ ] **Step 4: Create `src/domain/vector.ts`**

```typescript
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
```

- [ ] **Step 5: Create `src/domain/gestureJoystick.ts`**

```typescript
import type { JoystickOutput, Point } from "./types";
import { clamp, magnitude, normalize, subtract } from "./vector";

interface GestureJoystickOptions {
  deadZone: number;
  maxDistance: number;
}

const INACTIVE_MOVEMENT = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  speedScale: 0,
};

export class GestureJoystick {
  private origin: Point | null = null;
  private readonly deadZone: number;
  private readonly maxDistance: number;

  constructor(options: GestureJoystickOptions) {
    this.deadZone = options.deadZone;
    this.maxDistance = options.maxDistance;
  }

  update(point: Point | null): JoystickOutput {
    if (!point) {
      this.origin = null;
      return { ...INACTIVE_MOVEMENT, origin: null };
    }

    if (!this.origin) {
      this.origin = { ...point };
      return { ...INACTIVE_MOVEMENT, origin: { ...this.origin } };
    }

    const delta = subtract(point, this.origin);
    const length = magnitude(delta);

    if (length < this.deadZone) {
      return {
        active: false,
        direction: { x: 0, y: 0 },
        magnitude: length,
        speedScale: 0,
        origin: { ...this.origin },
      };
    }

    const usableRange = Math.max(this.maxDistance - this.deadZone, Number.EPSILON);
    const speedScale = clamp((length - this.deadZone) / usableRange, 0, 1);

    return {
      active: true,
      direction: normalize(delta),
      magnitude: length,
      speedScale,
      origin: { ...this.origin },
    };
  }
}
```

- [ ] **Step 6: Run joystick tests**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test -- src/domain/gestureJoystick.test.ts
```

Expected: PASS, 3 tests pass.

- [ ] **Step 7: Commit joystick logic**

```bash
git -c core.fsmonitor=false add src/domain/types.ts src/domain/vector.ts src/domain/gestureJoystick.ts src/domain/gestureJoystick.test.ts
git -c core.fsmonitor=false commit -m "feat: add fingertip joystick logic"
```

## Task 3: Add Continuous Snake Game Logic

**Files:**
- Create: `src/domain/snakeGame.ts`
- Create: `src/domain/snakeGame.test.ts`

- [ ] **Step 1: Write failing snake tests in `src/domain/snakeGame.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { SnakeGame } from "./snakeGame";
import type { MovementVector } from "./types";

const moveRight: MovementVector = {
  active: true,
  direction: { x: 1, y: 0 },
  magnitude: 0.4,
  speedScale: 1,
};

const inactive: MovementVector = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  speedScale: 0,
};

describe("SnakeGame", () => {
  it("moves the head with a continuous movement vector", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 100, y: 100 },
      initialFood: { position: { x: 260, y: 100 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 100,
    });

    game.update(moveRight, 0.5);

    expect(game.getState().head).toEqual({ x: 150, y: 100 });
    expect(game.getState().status).toBe("running");
  });

  it("pauses movement when the joystick is inactive", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 100, y: 100 },
      initialFood: { position: { x: 260, y: 100 }, radius: 8 },
    });

    game.update(inactive, 1);

    expect(game.getState().head).toEqual({ x: 100, y: 100 });
    expect(game.getState().score).toBe(0);
  });

  it("grows and increments score after eating food", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 90, y: 100 },
      initialFood: { position: { x: 100, y: 100 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 100,
      random: () => 0.5,
    });

    const before = game.getState().targetLength;
    game.update(moveRight, 0.1);

    expect(game.getState().score).toBe(1);
    expect(game.getState().targetLength).toBeGreaterThan(before);
    expect(game.getState().food.position).toEqual({ x: 150, y: 100 });
  });

  it("ends the run when the snake hits a wall", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 295, y: 100 },
      initialFood: { position: { x: 100, y: 100 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 100,
    });

    game.update(moveRight, 0.1);

    expect(game.getState().status).toBe("game-over");
  });
});
```

- [ ] **Step 2: Run snake tests to verify they fail**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test -- src/domain/snakeGame.test.ts
```

Expected: FAIL with an import error for `./snakeGame`.

- [ ] **Step 3: Create `src/domain/snakeGame.ts`**

```typescript
import type { Food, MovementVector, Point, SnakeGameState } from "./types";
import { add, distance, normalize, scale } from "./vector";

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

    const head = options.initialHead ?? { x: this.width / 2, y: this.height / 2 };
    const initialLength = options.initialLength ?? 80;

    this.state = {
      bounds: {
        width: this.width,
        height: this.height,
      },
      head,
      trail: [head, { x: head.x - initialLength, y: head.y }],
      targetLength: initialLength,
      food: options.initialFood ?? this.spawnFood(),
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

    const speed = this.baseSpeed + (this.maxSpeed - this.baseSpeed) * movement.speedScale;
    const nextHead = add(this.state.head, scale(normalize(movement.direction), speed * deltaSeconds));
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

    if (distance(nextHead, this.state.food.position) <= this.headRadius + this.state.food.radius) {
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
    return point.x < 0 || point.x > this.width || point.y < 0 || point.y > this.height;
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
```

- [ ] **Step 4: Run snake tests**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test -- src/domain/snakeGame.test.ts
```

Expected: PASS, 4 tests pass.

- [ ] **Step 5: Commit snake game logic**

```bash
git -c core.fsmonitor=false add src/domain/snakeGame.ts src/domain/snakeGame.test.ts
git -c core.fsmonitor=false commit -m "feat: add continuous snake game logic"
```

## Task 4: Add Webcam and MediaPipe Hand Tracking

**Files:**
- Create: `src/camera/cameraTracker.ts`
- Create: `src/camera/cameraTracker.test.ts`

- [ ] **Step 1: Write failing fingertip extraction tests in `src/camera/cameraTracker.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { extractIndexFingerTip } from "./cameraTracker";

describe("extractIndexFingerTip", () => {
  it("returns landmark 8 from the first detected hand", () => {
    const landmarks = Array.from({ length: 21 }, (_, index) => ({
      x: index / 100,
      y: index / 200,
      z: 0,
      visibility: 0,
    }));

    expect(extractIndexFingerTip({ landmarks: [landmarks] })).toEqual({
      x: 0.08,
      y: 0.04,
    });
  });

  it("returns null when no hand is detected", () => {
    expect(extractIndexFingerTip({ landmarks: [] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run camera tests to verify they fail**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test -- src/camera/cameraTracker.test.ts
```

Expected: FAIL with an import error for `./cameraTracker`.

- [ ] **Step 3: Create `src/camera/cameraTracker.ts`**

```typescript
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { Point, TrackingFrame } from "../domain/types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

interface LandmarkLike {
  x: number;
  y: number;
}

type LandmarkResultLike = Pick<HandLandmarkerResult, "landmarks"> | { landmarks: LandmarkLike[][] };

export function extractIndexFingerTip(result: LandmarkResultLike): Point | null {
  const firstHand = result.landmarks[0] as LandmarkLike[] | undefined;
  const indexTip = firstHand?.[8];

  if (!indexTip) {
    return null;
  }

  return { x: indexTip.x, y: indexTip.y };
}

export class CameraTracker {
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private lastVideoTime = -1;
  private latestFrame: TrackingFrame = {
    point: null,
    status: "loading",
    errorMessage: null,
  };

  constructor(private readonly video: HTMLVideoElement) {}

  async start(): Promise<void> {
    try {
      this.latestFrame = { point: null, status: "loading", errorMessage: null };
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      this.video.srcObject = this.stream;
      await this.video.play();
      this.latestFrame = { point: null, status: "searching", errorMessage: null };
    } catch (error) {
      this.latestFrame = {
        point: null,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unable to start camera tracking",
      };
    }
  }

  detect(timestampMs: number): TrackingFrame {
    if (!this.landmarker || this.latestFrame.status === "error") {
      return this.latestFrame;
    }

    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return { point: null, status: "searching", errorMessage: null };
    }

    if (this.video.currentTime === this.lastVideoTime) {
      return this.latestFrame;
    }

    this.lastVideoTime = this.video.currentTime;
    const result = this.landmarker.detectForVideo(this.video, timestampMs);
    const point = extractIndexFingerTip(result);

    this.latestFrame = {
      point,
      status: point ? "tracking" : "searching",
      errorMessage: null,
    };

    return this.latestFrame;
  }

  dispose(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
  }
}
```

- [ ] **Step 4: Run camera tests**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test -- src/camera/cameraTracker.test.ts
```

Expected: PASS, 2 tests pass.

- [ ] **Step 5: Commit camera tracker**

```bash
git -c core.fsmonitor=false add src/camera/cameraTracker.ts src/camera/cameraTracker.test.ts
git -c core.fsmonitor=false commit -m "feat: add MediaPipe hand tracker"
```

## Task 5: Add Canvas Renderer and Debug Panel Updates

**Files:**
- Create: `src/render/renderer.ts`

- [ ] **Step 1: Create `src/render/renderer.ts`**

```typescript
import type { JoystickOutput, SnakeGameState, TrackingFrame } from "../domain/types";

interface RendererElements {
  canvas: HTMLCanvasElement;
  statusValue: HTMLElement;
  scoreValue: HTMLElement;
  originValue: HTMLElement;
  vectorValue: HTMLElement;
  errorText: HTMLElement;
}

interface RenderDebugState {
  tracking: TrackingFrame;
  joystick: JoystickOutput;
}

export class Renderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(private readonly elements: RendererElements) {
    const context = elements.canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available");
    }

    this.context = context;
  }

  render(game: SnakeGameState, debug: RenderDebugState): void {
    this.resizeCanvas();
    this.drawGame(game, debug);
    this.updateDebugPanel(game, debug);
  }

  private resizeCanvas(): void {
    const rect = this.elements.canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
    const nextHeight = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));

    if (this.elements.canvas.width !== nextWidth || this.elements.canvas.height !== nextHeight) {
      this.elements.canvas.width = nextWidth;
      this.elements.canvas.height = nextHeight;
    }

    this.context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  private drawGame(game: SnakeGameState, debug: RenderDebugState): void {
    const width = this.elements.canvas.clientWidth;
    const height = this.elements.canvas.clientHeight;
    const scaleX = width / game.bounds.width;
    const scaleY = height / game.bounds.height;

    this.context.clearRect(0, 0, width, height);
    this.context.fillStyle = "#101820";
    this.context.fillRect(0, 0, width, height);
    this.context.save();
    this.context.scale(scaleX, scaleY);
    this.context.strokeStyle = "#2f435b";
    this.context.lineWidth = 2;
    this.context.strokeRect(1, 1, game.bounds.width - 2, game.bounds.height - 2);

    this.drawFood(game);
    this.drawSnake(game);
    this.context.restore();

    if (debug.tracking.status === "searching") {
      this.drawCenteredText("Searching for finger");
    }

    if (game.status === "game-over") {
      this.drawCenteredText("Game Over");
    }
  }

  private drawSnake(game: SnakeGameState): void {
    if (game.trail.length < 2) {
      return;
    }

    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    this.context.strokeStyle = "#50c878";
    this.context.lineWidth = 18;
    this.context.beginPath();
    this.context.moveTo(game.trail[0].x, game.trail[0].y);

    for (const point of game.trail.slice(1)) {
      this.context.lineTo(point.x, point.y);
    }

    this.context.stroke();
    this.context.fillStyle = "#d8ff8f";
    this.context.beginPath();
    this.context.arc(game.head.x, game.head.y, 10, 0, Math.PI * 2);
    this.context.fill();
  }

  private drawFood(game: SnakeGameState): void {
    this.context.fillStyle = "#ff6b6b";
    this.context.beginPath();
    this.context.arc(game.food.position.x, game.food.position.y, game.food.radius, 0, Math.PI * 2);
    this.context.fill();
  }

  private drawCenteredText(text: string): void {
    const width = this.elements.canvas.clientWidth;
    const height = this.elements.canvas.clientHeight;

    this.context.fillStyle = "rgba(11, 17, 23, 0.72)";
    this.context.fillRect(0, height / 2 - 34, width, 68);
    this.context.fillStyle = "#e8eef7";
    this.context.font = "600 24px system-ui";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(text, width / 2, height / 2);
  }

  private updateDebugPanel(game: SnakeGameState, debug: RenderDebugState): void {
    this.elements.statusValue.textContent = debug.tracking.status;
    this.elements.scoreValue.textContent = String(game.score);
    this.elements.originValue.textContent = debug.joystick.origin
      ? `${debug.joystick.origin.x.toFixed(2)}, ${debug.joystick.origin.y.toFixed(2)}`
      : "not locked";
    this.elements.vectorValue.textContent = debug.joystick.active
      ? `${debug.joystick.direction.x.toFixed(2)}, ${debug.joystick.direction.y.toFixed(2)} @ ${debug.joystick.speedScale.toFixed(2)}`
      : "paused";
    this.elements.errorText.textContent = debug.tracking.errorMessage ?? "";
  }
}
```

- [ ] **Step 2: Run full tests and build**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run build
```

Expected: Tests pass and build succeeds.

- [ ] **Step 3: Commit renderer**

```bash
git -c core.fsmonitor=false add src/render/renderer.ts
git -c core.fsmonitor=false commit -m "feat: add snake renderer"
```

## Task 6: Wire the App Controller and Real Game Loop

**Files:**
- Create: `src/app/appController.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace `src/main.ts`**

```typescript
import { AppController } from "./app/appController";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root element");
}

const app = new AppController(root);
app.start();

window.addEventListener("beforeunload", () => {
  app.dispose();
});
```

- [ ] **Step 2: Create `src/app/appController.ts`**

```typescript
import { CameraTracker } from "../camera/cameraTracker";
import { GestureJoystick } from "../domain/gestureJoystick";
import { SnakeGame } from "../domain/snakeGame";
import type { JoystickOutput, TrackingFrame } from "../domain/types";
import { Renderer } from "../render/renderer";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

const EMPTY_JOYSTICK: JoystickOutput = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  speedScale: 0,
  origin: null,
};

export class AppController {
  private readonly canvas: HTMLCanvasElement;
  private readonly video: HTMLVideoElement;
  private readonly renderer: Renderer;
  private readonly tracker: CameraTracker;
  private readonly joystick = new GestureJoystick({ deadZone: 0.035, maxDistance: 0.32 });
  private readonly game = new SnakeGame({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  private animationFrameId: number | null = null;
  private lastFrameTime: number | null = null;
  private latestTracking: TrackingFrame = {
    point: null,
    status: "loading",
    errorMessage: null,
  };
  private latestJoystick: JoystickOutput = EMPTY_JOYSTICK;

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = `
      <main class="app-shell">
        <section class="game-panel">
          <canvas class="game-canvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Snake game canvas"></canvas>
        </section>
        <aside class="side-panel">
          <video class="camera-preview" autoplay muted playsinline></video>
          <section class="debug-card">
            <h1>Camera Snake Prototype</h1>
            <dl class="debug-grid">
              <dt>Status</dt><dd data-role="status">loading</dd>
              <dt>Score</dt><dd data-role="score">0</dd>
              <dt>Origin</dt><dd data-role="origin">not locked</dd>
              <dt>Vector</dt><dd data-role="vector">paused</dd>
            </dl>
          </section>
          <p class="error-text" data-role="error"></p>
        </aside>
      </main>
    `;

    this.canvas = this.requireElement<HTMLCanvasElement>(".game-canvas");
    this.video = this.requireElement<HTMLVideoElement>(".camera-preview");
    this.tracker = new CameraTracker(this.video);
    this.renderer = new Renderer({
      canvas: this.canvas,
      statusValue: this.requireElement<HTMLElement>('[data-role="status"]'),
      scoreValue: this.requireElement<HTMLElement>('[data-role="score"]'),
      originValue: this.requireElement<HTMLElement>('[data-role="origin"]'),
      vectorValue: this.requireElement<HTMLElement>('[data-role="vector"]'),
      errorText: this.requireElement<HTMLElement>('[data-role="error"]'),
    });
  }

  async start(): Promise<void> {
    this.render();
    await this.tracker.start();
    this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.tracker.dispose();
  }

  private loop(timestamp: number): void {
    const deltaSeconds = this.lastFrameTime === null ? 0 : Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    this.latestTracking = this.tracker.detect(timestamp);
    this.latestJoystick = this.joystick.update(this.latestTracking.point);
    this.game.update(this.latestJoystick, deltaSeconds);
    this.render();

    this.animationFrameId = requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  private render(): void {
    this.renderer.render(this.game.getState(), {
      tracking: this.latestTracking,
      joystick: this.latestJoystick,
    });
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);

    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }

    return element;
  }
}
```

- [ ] **Step 3: Add fixed canvas scaling rules to `src/styles.css`**

Append this block to the end of `src/styles.css`:

```css
.game-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(420px, 1fr) auto;
  }

  .side-panel {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: start;
  }
}
```

- [ ] **Step 4: Run all automated checks**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run build
```

Expected: Tests pass and build succeeds.

- [ ] **Step 5: Commit integration**

```bash
git -c core.fsmonitor=false add src/main.ts src/app/appController.ts src/styles.css
git -c core.fsmonitor=false commit -m "feat: wire camera snake prototype"
```

## Task 7: Manual Chrome Verification

**Files:**
- Modify only if verification exposes a concrete defect in files created by earlier tasks.

- [ ] **Step 1: Start the dev server**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run dev
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 2: Open the page in desktop Chrome**

Use the printed local URL. Expected: Chrome asks for camera permission.

- [ ] **Step 3: Verify camera permission and preview**

Grant camera permission. Expected: the right panel shows the live mirrored camera preview and the status changes from `loading` to either `searching` or `tracking`.

- [ ] **Step 4: Verify origin locking**

Raise one index finger into the camera frame and hold it steady. Expected: status becomes `tracking`, `Origin` shows two normalized numbers, and `Vector` remains `paused` while the fingertip stays near the origin.

- [ ] **Step 5: Verify continuous movement**

Move the fingertip right, left, up, and down from the locked origin. Expected: the snake moves continuously in the same direction as the fingertip displacement.

- [ ] **Step 6: Verify food and wall rules**

Steer the snake into food and then into a wall. Expected: food increases score and length; wall contact displays `Game Over` and the score stops changing.

- [ ] **Step 7: Run final checks**

Run:

```bash
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run test
env PATH="/opt/homebrew/bin:/usr/local/bin:/bin:/usr/sbin:/sbin" npm_config_cache=/private/tmp/mediapipe-npm-cache /opt/homebrew/bin/npm run build
git status --short --branch
```

Expected: tests pass, build succeeds, and `git status` shows a clean tree except local files that were intentionally not committed.

- [ ] **Step 8: Commit verification fixes if any file changed**

If verification required a fix, commit the changed implementation files:

```bash
git -c core.fsmonitor=false add src package.json package-lock.json tsconfig.json index.html .gitignore
git -c core.fsmonitor=false commit -m "fix: polish camera snake prototype"
```

If verification required no fix, skip this commit step.
