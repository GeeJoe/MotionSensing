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
