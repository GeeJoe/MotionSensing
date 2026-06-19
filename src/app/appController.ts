import { CameraTracker } from "../camera/cameraTracker";
import { pointFromNormalized } from "../domain/geometry";
import type { Point, TrackingFrame } from "../domain/types";
import { HandInputController } from "../input/handInput";
import { Renderer } from "../render/renderer";
import { FruitSliceScene } from "../scenes/fruitSliceScene";
import { MenuScene } from "../scenes/menuScene";
import type { Scene, SceneId, SceneTransition } from "../scenes/scene";
import { SnakeScene } from "../scenes/snakeScene";
import { BestScores } from "../storage/bestScores";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const CANVAS_SIZE = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };

export class AppController {
  private readonly canvas: HTMLCanvasElement;
  private readonly video: HTMLVideoElement;
  private readonly renderer: Renderer;
  private readonly tracker: CameraTracker;
  private readonly bestScores = new BestScores(globalThis.localStorage ?? null);
  private readonly input = new HandInputController({
    canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    hoverClickMs: 800,
    pokeDepthDelta: 0.08,
    clickAnimationMs: 220,
    maxTrailAgeMs: 900,
  });
  private currentScene: Scene;
  private startPromise: Promise<void> | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime: number | null = null;
  private running = false;
  private disposed = false;
  private latestTracking: TrackingFrame = {
    point: null,
    status: "loading",
    errorMessage: null,
  };

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = `
      <main class="app-shell">
        <section class="game-panel">
          <canvas class="game-canvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" aria-label="Motion Arcade game canvas"></canvas>
        </section>
        <aside class="side-panel">
          <video class="camera-preview" autoplay muted playsinline></video>
          <section class="debug-card">
            <h1>Motion Arcade</h1>
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
    this.currentScene = this.createScene("menu");
  }

  start(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    if (this.running) {
      return Promise.resolve();
    }

    this.startPromise = this.startInternal().finally(() => {
      this.startPromise = null;
    });

    return this.startPromise;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.tracker.dispose();
  }

  private async startInternal(): Promise<void> {
    this.latestTracking = await this.tracker.start();

    if (this.disposed) {
      this.tracker.dispose();
      return;
    }

    if (this.latestTracking.status === "error") {
      this.renderer.renderTrackingError(this.latestTracking);
      return;
    }

    this.running = true;
    this.lastFrameTime = null;
    this.updateAndRenderCurrentScene(0, 0);
    this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  private loop(timestamp: number): void {
    if (this.disposed || !this.running) {
      this.animationFrameId = null;
      return;
    }

    const deltaSeconds = this.lastFrameTime === null ? 0 : Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    this.latestTracking = this.tracker.detect(timestamp);
    this.updateAndRenderCurrentScene(timestamp, deltaSeconds);

    if (this.disposed || !this.running) {
      this.animationFrameId = null;
      return;
    }

    this.animationFrameId = requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  private createScene(sceneId: SceneId): Scene {
    if (sceneId === "menu") {
      return new MenuScene({
        bounds: CANVAS_SIZE,
        bestScores: {
          snake: this.bestScores.get("snake"),
          "fruit-slice": this.bestScores.get("fruit-slice"),
        },
        render: (view) => this.renderer.renderMenu(view),
      });
    }

    if (sceneId === "snake") {
      return new SnakeScene({
        bounds: CANVAS_SIZE,
        render: (game, debug) => this.renderer.renderSnake(game, debug),
        recordBestScore: (score) => this.bestScores.record("snake", score),
      });
    }

    return new FruitSliceScene({
      bounds: CANVAS_SIZE,
      bestScores: this.bestScores,
      render: (state) => this.renderer.renderFruitSlice(state),
    });
  }

  private updateAndRenderCurrentScene(timestampMs: number, deltaSeconds: number): void {
    const pointer = this.latestTracking.point ? pointFromNormalized(this.latestTracking.point, CANVAS_SIZE) : null;
    const inputState = this.input.update({
      timestampMs,
      trackingPoint: this.latestTracking.point,
      hoverTargetId: this.hitTest(pointer),
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

  private hitTest(point: Point | null): string | null {
    if (!point) {
      return null;
    }

    if (this.currentScene.id !== "menu" && point.x >= 16 && point.x <= 104 && point.y >= 16 && point.y <= 60) {
      return "nav:home";
    }

    if (this.currentScene instanceof MenuScene) {
      return this.currentScene.hitTest(point);
    }

    if (
      this.currentScene instanceof FruitSliceScene &&
      this.currentScene.getState().status === "game-over" &&
      point.x >= 380 &&
      point.x <= 580 &&
      point.y >= 350 &&
      point.y <= 420
    ) {
      return "fruit:restart";
    }

    return null;
  }

  private applyTransition(transition: SceneTransition): void {
    if (transition.type === "switch") {
      this.currentScene = this.createScene(transition.scene);
    }
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);

    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }

    return element;
  }
}
