import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FruitSliceState } from "../domain/fruitSlice";
import type { JoystickOutput, SnakeGameState, TrackingFrame } from "../domain/types";
import { Renderer } from "./renderer";

interface CanvasCall {
  method: string;
  args: unknown[];
  fillStyle?: string;
  strokeStyle?: string;
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
    this.calls.push({ method: "fillRect", args, fillStyle: this.fillStyle });
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
    this.calls.push({ method: "strokeRect", args, strokeStyle: this.strokeStyle });
  }

  translate(...args: [number, number]): void {
    this.calls.push({ method: "translate", args });
  }
}

function createTextElement(): HTMLElement {
  return { textContent: "" } as HTMLElement;
}

function createRendererWithElements(
  context: FakeCanvasContext,
  size: { width: number; height: number } = { width: 960, height: 640 },
): {
  elements: ConstructorParameters<typeof Renderer>[0];
  renderer: Renderer;
} {
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect: () => size,
    getContext: () => context,
  };

  const elements = {
    canvas,
    statusValue: createTextElement(),
    scoreValue: createTextElement(),
    originValue: createTextElement(),
    vectorValue: createTextElement(),
    errorText: createTextElement(),
  } as unknown as ConstructorParameters<typeof Renderer>[0];

  return {
    elements,
    renderer: new Renderer(elements),
  };
}

function createRenderer(context: FakeCanvasContext): Renderer {
  return createRendererWithElements(context).renderer;
}

function worldScaleCallCount(context: FakeCanvasContext, scale: number): number {
  return context.calls.filter((call) => call.method === "scale" && call.args[0] === scale && call.args[1] === scale).length;
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

const fruitSliceState: FruitSliceState = {
  bounds: { width: 960, height: 640 },
  combo: 1,
  elapsedSeconds: 4,
  lives: 3,
  objects: [
    {
      fruitType: "apple",
      id: "fruit-1",
      kind: "fruit",
      position: { x: 200, y: 240 },
      radius: 38,
      sliced: false,
      velocity: { x: 0, y: 0 },
    },
    {
      id: "bomb-1",
      kind: "bomb",
      position: { x: 420, y: 240 },
      radius: 36,
      sliced: false,
      velocity: { x: 0, y: 0 },
    },
  ],
  score: 12,
  status: "running",
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
      point: { x: 0.25, y: 0.75, z: 0 },
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

  it("renderSnake draws through the same snake renderer path", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);
    const tracking: TrackingFrame = {
      errorMessage: null,
      point: { x: 0.25, y: 0.75, z: 0 },
      status: "tracking",
    };

    renderer.renderSnake(game, { joystick, tracking });

    expect(context.calls).toContainEqual({
      method: "arc",
      args: [240, 480, 6, 0, Math.PI * 2],
    });
  });

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
        {
          id: "menu:fruit-slice",
          title: "Fruit Slice",
          description: "Swipe through fruit.",
          bestScore: 8,
          rect: { x: 440, y: 120, width: 300, height: 200 },
          hovered: false,
        },
      ],
    });

    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Snake", 124, 144],
    });
    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Move from center.", 124, 192],
    });
    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Best 4", 124, 278],
    });
    expect(context.calls).toContainEqual({
      method: "fillRect",
      args: [100, 120, 300, 200],
      fillStyle: "#1d3b4f",
    });
    expect(context.calls).toContainEqual({
      method: "strokeRect",
      args: [100, 120, 300, 200],
      strokeStyle: "#ffd166",
    });
    expect(context.calls).toContainEqual({
      method: "fillRect",
      args: [440, 120, 300, 200],
      fillStyle: "#121b26",
    });
    expect(context.calls).toContainEqual({
      method: "strokeRect",
      args: [440, 120, 300, 200],
      strokeStyle: "#2f435b",
    });
  });

  it("renderMenu applies the world transform for smaller canvas sizes", () => {
    const context = new FakeCanvasContext();
    const { renderer } = createRendererWithElements(context, { width: 480, height: 320 });

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

    expect(worldScaleCallCount(context, 0.5)).toBe(1);
    expect(context.calls).toContainEqual({
      method: "fillRect",
      args: [100, 120, 300, 200],
      fillStyle: "#1d3b4f",
    });
    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Snake", 124, 144],
    });
  });

  it("renderPointer draws the pointer click animation ring", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);

    renderer.renderPointer({
      clickAnimation: {
        active: true,
        point: { x: 100, y: 120 },
        progress: 0.5,
      },
      pointer: { x: 100, y: 120 },
    });

    expect(context.calls).toContainEqual({
      method: "arc",
      args: [100, 120, 18, 0, Math.PI * 2],
    });
  });

  it("renderPointer applies the world transform for smaller canvas sizes", () => {
    const context = new FakeCanvasContext();
    const { renderer } = createRendererWithElements(context, { width: 480, height: 320 });

    renderer.renderPointer({
      clickAnimation: { active: false, point: null, progress: 0 },
      pointer: { x: 100, y: 120 },
    });

    expect(context.calls).toContainEqual({
      method: "scale",
      args: [0.5, 0.5],
    });
    expect(context.calls).toContainEqual({
      method: "arc",
      args: [100, 120, 7, 0, Math.PI * 2],
    });
  });

  it("renderHomeButton draws the home button label", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);

    renderer.renderHomeButton(true);

    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Home", 60, 38],
    });
  });

  it("renderHomeButton applies the world transform for smaller canvas sizes", () => {
    const context = new FakeCanvasContext();
    const { renderer } = createRendererWithElements(context, { width: 480, height: 320 });

    renderer.renderHomeButton(true);

    expect(worldScaleCallCount(context, 0.5)).toBe(1);
    expect(context.calls).toContainEqual({
      method: "fillRect",
      args: [16, 16, 88, 44],
      fillStyle: "#1d3b4f",
    });
    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Home", 60, 38],
    });
  });

  it("renderMenu resets stale debug panel values", () => {
    const context = new FakeCanvasContext();
    const { elements, renderer } = createRendererWithElements(context);

    elements.statusValue.textContent = "tracking";
    elements.scoreValue.textContent = "42";
    elements.originValue.textContent = "0.50, 0.50";
    elements.vectorValue.textContent = "1.00, 0.00 @ 0.50";
    elements.errorText.textContent = "Previous error";

    renderer.renderMenu({ cards: [] });

    expect(elements.statusValue.textContent).toBe("menu");
    expect(elements.scoreValue.textContent).toBe("0");
    expect(elements.originValue.textContent).toBe("not locked");
    expect(elements.vectorValue.textContent).toBe("paused");
    expect(elements.errorText.textContent).toBe("");
  });

  it("renderFruitSlice falls back to fruit and bomb circles when images are unavailable", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);

    renderer.renderFruitSlice(fruitSliceState);

    expect(context.calls).toContainEqual({
      method: "arc",
      args: [200, 240, 38, 0, Math.PI * 2],
    });
    expect(context.calls).toContainEqual({
      method: "arc",
      args: [420, 240, 36, 0, Math.PI * 2],
    });
  });

  it("keeps the Fruit Slice score clear of the Home button area", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);

    renderer.renderFruitSlice(fruitSliceState);

    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Score 12", 124, 24],
    });
  });

  it("renderFruitSlice draws a restart button on game over", () => {
    const context = new FakeCanvasContext();
    const renderer = createRenderer(context);

    renderer.renderFruitSlice({
      ...fruitSliceState,
      objects: [],
      status: "game-over",
    });

    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Restart", 480, 385],
    });
  });

  it("renderFruitSlice applies the world transform for the game-over restart overlay at smaller canvas sizes", () => {
    const context = new FakeCanvasContext();
    const { renderer } = createRendererWithElements(context, { width: 480, height: 320 });

    renderer.renderFruitSlice({
      ...fruitSliceState,
      objects: [],
      status: "game-over",
    });

    expect(worldScaleCallCount(context, 0.5)).toBe(2);
    expect(context.calls).toContainEqual({
      method: "fillRect",
      args: [380, 350, 200, 70],
      fillStyle: "#ffd166",
    });
    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Restart", 480, 385],
    });
  });

  it("renderFruitSlice updates stale debug panel values", () => {
    const context = new FakeCanvasContext();
    const { elements, renderer } = createRendererWithElements(context);

    elements.statusValue.textContent = "menu";
    elements.scoreValue.textContent = "0";
    elements.originValue.textContent = "0.50, 0.50";
    elements.vectorValue.textContent = "paused";
    elements.errorText.textContent = "Previous error";

    renderer.renderFruitSlice({
      ...fruitSliceState,
      combo: 3,
      lives: 2,
      score: 14,
    });

    expect(elements.statusValue.textContent).toBe("running");
    expect(elements.scoreValue.textContent).toBe("14");
    expect(elements.originValue.textContent).toBe("not locked");
    expect(elements.vectorValue.textContent).toBe("combo x3, lives 2");
    expect(elements.errorText.textContent).toBe("");
  });

  it("renderTrackingError draws the error message centered", () => {
    const context = new FakeCanvasContext();
    const { elements, renderer } = createRendererWithElements(context);
    const tracking: TrackingFrame = {
      errorMessage: "Permission denied",
      point: null,
      status: "error",
    };

    elements.statusValue.textContent = "tracking";
    elements.scoreValue.textContent = "24";
    elements.originValue.textContent = "0.50, 0.50";
    elements.vectorValue.textContent = "1.00, 0.00 @ 0.50";
    elements.errorText.textContent = "Previous error";

    renderer.renderTrackingError(tracking);

    expect(context.calls).toContainEqual({
      method: "fillText",
      args: ["Permission denied", 480, 320],
    });
    expect(elements.statusValue.textContent).toBe("error");
    expect(elements.scoreValue.textContent).toBe("0");
    expect(elements.originValue.textContent).toBe("not locked");
    expect(elements.vectorValue.textContent).toBe("paused");
    expect(elements.errorText.textContent).toBe("Permission denied");
  });
});
