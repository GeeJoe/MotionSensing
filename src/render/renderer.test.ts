import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JoystickOutput, SnakeGameState, TrackingFrame } from "../domain/types";
import { Renderer } from "./renderer";

interface CanvasCall {
  method: string;
  args: unknown[];
}

class FakeCanvasContext {
  readonly calls: CanvasCall[] = [];
  fillStyle = "";
  font = "";
  lineCap = "";
  lineJoin = "";
  lineWidth = 1;
  strokeStyle = "";
  textAlign = "";
  textBaseline = "";

  arc(...args: [number, number, number, number, number]): void {
    this.calls.push({ method: "arc", args });
  }

  beginPath(): void {
    this.calls.push({ method: "beginPath", args: [] });
  }

  clearRect(...args: [number, number, number, number]): void {
    this.calls.push({ method: "clearRect", args });
  }

  fill(): void {
    this.calls.push({ method: "fill", args: [] });
  }

  fillRect(...args: [number, number, number, number]): void {
    this.calls.push({ method: "fillRect", args });
  }

  fillText(...args: [string, number, number]): void {
    this.calls.push({ method: "fillText", args });
  }

  lineTo(...args: [number, number]): void {
    this.calls.push({ method: "lineTo", args });
  }

  moveTo(...args: [number, number]): void {
    this.calls.push({ method: "moveTo", args });
  }

  restore(): void {
    this.calls.push({ method: "restore", args: [] });
  }

  save(): void {
    this.calls.push({ method: "save", args: [] });
  }

  scale(...args: [number, number]): void {
    this.calls.push({ method: "scale", args });
  }

  setTransform(...args: [number, number, number, number, number, number]): void {
    this.calls.push({ method: "setTransform", args });
  }

  stroke(): void {
    this.calls.push({ method: "stroke", args: [] });
  }

  strokeRect(...args: [number, number, number, number]): void {
    this.calls.push({ method: "strokeRect", args });
  }

  translate(...args: [number, number]): void {
    this.calls.push({ method: "translate", args });
  }
}

function createTextElement(): HTMLElement {
  return { textContent: "" } as HTMLElement;
}

function createRenderer(context: FakeCanvasContext): Renderer {
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ width: 960, height: 640 }),
    getContext: () => context,
  };

  return new Renderer({
    canvas,
    statusValue: createTextElement(),
    scoreValue: createTextElement(),
    originValue: createTextElement(),
    vectorValue: createTextElement(),
    errorText: createTextElement(),
  } as unknown as ConstructorParameters<typeof Renderer>[0]);
}

const game: SnakeGameState = {
  bounds: { width: 960, height: 640 },
  food: { position: { x: 720, y: 320 }, radius: 8 },
  head: { x: 480, y: 320 },
  score: 0,
  status: "running",
  targetLength: 80,
  trail: [
    { x: 480, y: 320 },
    { x: 400, y: 320 },
  ],
};

const joystick: JoystickOutput = {
  active: true,
  direction: { x: 1, y: 0 },
  magnitude: 0.4,
  origin: { x: 0.5, y: 0.5 },
  speedScale: 0.5,
};

describe("Renderer", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { devicePixelRatio: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("draws the tracked fingertip as a point in the game area", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);
    const tracking: TrackingFrame = {
      errorMessage: null,
      point: { x: 0.25, y: 0.75 },
      status: "tracking",
    };

    renderer.render(game, { joystick, tracking });

    expect(context.calls).toContainEqual({
      method: "arc",
      args: [240, 480, 6, 0, Math.PI * 2],
    });
  });

  it("draws the fixed joystick center marker in the game area", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);
    const tracking: TrackingFrame = {
      errorMessage: null,
      point: null,
      status: "searching",
    };

    renderer.render(game, { joystick, tracking });

    expect(context.calls).toContainEqual({
      method: "arc",
      args: [480, 320, 4, 0, Math.PI * 2],
    });
  });
});
