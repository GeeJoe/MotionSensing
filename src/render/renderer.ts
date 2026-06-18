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

interface CanvasMetrics {
  width: number;
  height: number;
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
    const metrics = this.resizeCanvas();

    this.drawGame(game, debug, metrics);
    this.updateDebugPanel(game, debug);
  }

  private resizeCanvas(): CanvasMetrics {
    const rect = this.elements.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const nextWidth = Math.max(1, Math.floor(width * window.devicePixelRatio));
    const nextHeight = Math.max(1, Math.floor(height * window.devicePixelRatio));

    if (this.elements.canvas.width !== nextWidth || this.elements.canvas.height !== nextHeight) {
      this.elements.canvas.width = nextWidth;
      this.elements.canvas.height = nextHeight;
    }

    this.context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    return { width, height };
  }

  private drawGame(game: SnakeGameState, debug: RenderDebugState, metrics: CanvasMetrics): void {
    const scale = Math.min(metrics.width / game.bounds.width, metrics.height / game.bounds.height);
    const offsetX = (metrics.width - game.bounds.width * scale) / 2;
    const offsetY = (metrics.height - game.bounds.height * scale) / 2;

    this.context.clearRect(0, 0, metrics.width, metrics.height);
    this.context.fillStyle = "#101820";
    this.context.fillRect(0, 0, metrics.width, metrics.height);
    this.context.save();
    this.context.translate(offsetX, offsetY);
    this.context.scale(scale, scale);
    this.context.strokeStyle = "#2f435b";
    this.context.lineWidth = 2;
    this.context.strokeRect(1, 1, game.bounds.width - 2, game.bounds.height - 2);

    this.drawFood(game);
    this.drawSnake(game);
    this.context.restore();

    if (debug.tracking.status === "searching") {
      this.drawCenteredText("Searching for finger", metrics);
    }

    if (game.status === "game-over") {
      this.drawCenteredText("Game Over", metrics);
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

  private drawCenteredText(text: string, metrics: CanvasMetrics): void {
    this.context.fillStyle = "rgba(11, 17, 23, 0.72)";
    this.context.fillRect(0, metrics.height / 2 - 34, metrics.width, 68);
    this.context.fillStyle = "#e8eef7";
    this.context.font = "600 24px system-ui";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(text, metrics.width / 2, metrics.height / 2);
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
