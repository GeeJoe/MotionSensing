import { bombAsset, fruitAssets } from "../assets/fruit/manifest";
import type { FruitSliceState, SliceObject } from "../domain/fruitSlice";
import type { ClickAnimationState, JoystickOutput, Point, SnakeGameState, TrackingFrame } from "../domain/types";
import { clamp } from "../domain/vector";

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

const WORLD_BOUNDS = { width: 960, height: 640 };

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly imageCache = new Map<string, HTMLImageElement>();

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

  renderSnake(game: SnakeGameState, debug: RenderDebugState): void {
    this.render(game, debug);
  }

  renderMenu(view: MenuView): void {
    const metrics = this.resizeCanvas();
    this.context.clearRect(0, 0, metrics.width, metrics.height);
    this.context.fillStyle = "#101820";
    this.context.fillRect(0, 0, metrics.width, metrics.height);
    this.context.save();
    this.applyWorldTransform(metrics);

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

    this.context.restore();
    this.updateMenuDebugPanel();
  }

  renderPointer(view: { pointer: Point | null; clickAnimation: ClickAnimationState }): void {
    const metrics = this.resizeCanvas();
    this.context.save();
    this.applyWorldTransform(metrics);

    if (view.pointer) {
      this.context.fillStyle = "#ffd166";
      this.context.beginPath();
      this.context.arc(view.pointer.x, view.pointer.y, 7, 0, Math.PI * 2);
      this.context.fill();
    }

    if (view.clickAnimation.active && view.clickAnimation.point) {
      const progress = clamp(view.clickAnimation.progress, 0, 1);
      this.context.strokeStyle = `rgba(255, 209, 102, ${1 - progress})`;
      this.context.lineWidth = 3;
      this.context.beginPath();
      this.context.arc(view.clickAnimation.point.x, view.clickAnimation.point.y, 12 + progress * 12, 0, Math.PI * 2);
      this.context.stroke();
    }

    this.context.restore();
  }

  renderHomeButton(hovered: boolean): void {
    const metrics = this.resizeCanvas();

    const x = 16;
    const y = 16;
    const width = 88;
    const height = 44;

    this.context.save();
    this.applyWorldTransform(metrics);
    this.context.fillStyle = hovered ? "#1d3b4f" : "#121b26";
    this.context.fillRect(x, y, width, height);
    this.context.strokeStyle = hovered ? "#ffd166" : "#2f435b";
    this.context.lineWidth = 2;
    this.context.strokeRect(x, y, width, height);
    this.context.fillStyle = "#e8eef7";
    this.context.font = "700 16px system-ui";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText("Home", 60, 38);
    this.context.restore();
  }

  renderTrackingError(tracking: TrackingFrame): void {
    const metrics = this.resizeCanvas();
    this.context.clearRect(0, 0, metrics.width, metrics.height);
    this.context.fillStyle = "#101820";
    this.context.fillRect(0, 0, metrics.width, metrics.height);
    this.drawCenteredText(tracking.errorMessage ?? "Tracking unavailable", metrics);
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
    this.context.save();
    this.applyWorldTransform(metrics, state.bounds);
    this.context.strokeStyle = "#2f435b";
    this.context.lineWidth = 2;
    this.context.strokeRect(1, 1, state.bounds.width - 2, state.bounds.height - 2);

    for (const object of state.objects) {
      this.drawSliceObject(object);
    }

    this.context.restore();
    this.context.save();
    this.applyWorldTransform(metrics);
    this.context.fillStyle = "#e8eef7";
    this.context.font = "700 22px system-ui";
    this.context.textAlign = "left";
    this.context.textBaseline = "top";
    this.context.fillText(`Score ${state.score}`, 24, 24);
    this.context.textAlign = "right";
    this.context.fillText(`Lives ${state.lives}`, WORLD_BOUNDS.width - 24, 24);

    if (state.combo > 1) {
      this.context.textAlign = "center";
      this.context.fillText(`Combo x${state.combo}`, WORLD_BOUNDS.width / 2, 24);
    }

    if (state.status === "game-over") {
      this.drawCenteredTextInWorld("Game Over");
      const buttonX = 380;
      const buttonY = 350;
      const buttonWidth = 200;
      const buttonHeight = 70;

      this.context.fillStyle = "#ffd166";
      this.context.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      this.context.strokeStyle = "#e8eef7";
      this.context.lineWidth = 2;
      this.context.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
      this.context.fillStyle = "#101820";
      this.context.font = "700 20px system-ui";
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText("Restart", 480, 385);
    }

    this.context.restore();
    this.updateFruitSliceDebugPanel(state);
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
    this.context.clearRect(0, 0, metrics.width, metrics.height);
    this.context.fillStyle = "#101820";
    this.context.fillRect(0, 0, metrics.width, metrics.height);
    this.context.save();
    this.applyWorldTransform(metrics, game.bounds);
    this.context.strokeStyle = "#2f435b";
    this.context.lineWidth = 2;
    this.context.strokeRect(1, 1, game.bounds.width - 2, game.bounds.height - 2);

    this.drawFood(game);
    this.drawSnake(game);
    this.drawJoystickCenter(game);
    this.drawFingerPoint(game, debug.tracking);
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

  private drawFingerPoint(game: SnakeGameState, tracking: TrackingFrame): void {
    if (!tracking.point) {
      return;
    }

    this.context.fillStyle = "#ffd166";
    this.context.beginPath();
    this.context.arc(
      clamp(tracking.point.x, 0, 1) * game.bounds.width,
      clamp(tracking.point.y, 0, 1) * game.bounds.height,
      6,
      0,
      Math.PI * 2,
    );
    this.context.fill();
  }

  private drawJoystickCenter(game: SnakeGameState): void {
    this.context.fillStyle = "#8ecae6";
    this.context.beginPath();
    this.context.arc(game.bounds.width / 2, game.bounds.height / 2, 4, 0, Math.PI * 2);
    this.context.fill();
  }

  private drawSliceObject(object: SliceObject): void {
    const size = object.radius * 2;
    const src = object.kind === "bomb" ? bombAsset : fruitAssets[object.fruitType].whole;

    if (this.drawImageAsset(src, object.position.x, object.position.y, size)) {
      return;
    }

    this.context.fillStyle = object.kind === "bomb" ? "#2b2d42" : "#ff6b6b";
    this.context.strokeStyle = object.kind === "bomb" ? "#f87171" : "#ffd166";
    this.context.lineWidth = object.kind === "bomb" ? 3 : 2;
    this.context.beginPath();
    this.context.arc(object.position.x, object.position.y, object.radius, 0, Math.PI * 2);
    this.context.fill();
    this.context.stroke();
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

    if (!image.complete || image.naturalWidth <= 0) {
      return false;
    }

    this.context.drawImage(image, x - size / 2, y - size / 2, size, size);

    return true;
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

  private drawCenteredTextInWorld(text: string): void {
    this.context.fillStyle = "rgba(11, 17, 23, 0.72)";
    this.context.fillRect(0, WORLD_BOUNDS.height / 2 - 34, WORLD_BOUNDS.width, 68);
    this.context.fillStyle = "#e8eef7";
    this.context.font = "600 24px system-ui";
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillText(text, WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height / 2);
  }

  private applyWorldTransform(metrics: CanvasMetrics, bounds = WORLD_BOUNDS): void {
    const scale = Math.min(metrics.width / bounds.width, metrics.height / bounds.height);
    const offsetX = (metrics.width - bounds.width * scale) / 2;
    const offsetY = (metrics.height - bounds.height * scale) / 2;

    this.context.translate(offsetX, offsetY);
    this.context.scale(scale, scale);
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

  private updateMenuDebugPanel(): void {
    this.elements.statusValue.textContent = "menu";
    this.elements.scoreValue.textContent = "0";
    this.elements.originValue.textContent = "not locked";
    this.elements.vectorValue.textContent = "paused";
    this.elements.errorText.textContent = "";
  }

  private updateFruitSliceDebugPanel(state: FruitSliceState): void {
    this.elements.statusValue.textContent = state.status;
    this.elements.scoreValue.textContent = String(state.score);
    this.elements.originValue.textContent = "not locked";
    this.elements.vectorValue.textContent = `combo x${state.combo}, lives ${state.lives}`;
    this.elements.errorText.textContent = "";
  }
}
