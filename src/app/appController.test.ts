import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackingFrame } from "../domain/types";
import { AppController } from "./appController";

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

vi.mock("../camera/cameraTracker", () => ({
  CameraTracker: vi.fn(
    class {
      start = appMocks.trackerStart;
      detect = appMocks.trackerDetect;
      dispose = appMocks.trackerDispose;
    },
  ),
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

function createRoot(): HTMLElement {
  const elements = new Map<string, object>([
    [".game-canvas", {}],
    [".camera-preview", {}],
    ['[data-role="status"]', { textContent: "" }],
    ['[data-role="score"]', { textContent: "" }],
    ['[data-role="origin"]', { textContent: "" }],
    ['[data-role="vector"]', { textContent: "" }],
    ['[data-role="error"]', { textContent: "" }],
  ]);

  return {
    innerHTML: "",
    querySelector: (selector: string) => elements.get(selector) ?? null,
  } as unknown as HTMLElement;
}

describe("AppController", () => {
  let animationCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    vi.resetAllMocks();
    animationCallbacks = [];
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback) => {
        animationCallbacks.push(callback);
        return animationCallbacks.length;
      }),
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("builds the Motion Arcade shell", () => {
    const root = createRoot();

    new AppController(root);

    expect(root.innerHTML).toContain('aria-label="Motion Arcade game canvas"');
    expect(root.innerHTML).toContain("<h1>Motion Arcade</h1>");
  });

  it("renders the menu after camera startup succeeds", async () => {
    appMocks.trackerStart.mockResolvedValue({
      point: null,
      status: "searching",
      errorMessage: null,
    } satisfies TrackingFrame);

    const controller = new AppController(createRoot());

    await controller.start();

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(appMocks.rendererRenderMenu).toHaveBeenCalledTimes(1);
    expect(appMocks.rendererRenderPointer).toHaveBeenCalledWith({
      pointer: null,
      clickAnimation: { active: false, point: null, progress: 0 },
    });
    expect(appMocks.rendererRenderHomeButton).not.toHaveBeenCalled();
  });

  it("does not schedule the game loop when camera startup fails", async () => {
    const errorFrame: TrackingFrame = {
      point: null,
      status: "error",
      errorMessage: "Permission denied",
    };
    appMocks.trackerStart.mockResolvedValue(errorFrame);

    const controller = new AppController(createRoot());

    await controller.start();

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(appMocks.rendererRenderTrackingError).toHaveBeenCalledWith(errorFrame);
    expect(appMocks.rendererRenderMenu).not.toHaveBeenCalled();
  });

  it("switches from menu to snake and back to menu through tracked clicks", async () => {
    appMocks.trackerStart.mockResolvedValue({
      point: null,
      status: "searching",
      errorMessage: null,
    } satisfies TrackingFrame);
    appMocks.trackerDetect.mockReturnValue({
      point: { x: 0.25, y: 0.46875, z: 0 },
      status: "tracking",
      errorMessage: null,
    } satisfies TrackingFrame);

    const controller = new AppController(createRoot());

    await controller.start();
    animationCallbacks[0]?.(100);
    animationCallbacks[1]?.(900);

    expect(appMocks.rendererRenderMenu).toHaveBeenCalledTimes(2);
    expect(appMocks.rendererRenderSnake).toHaveBeenCalledTimes(1);
    expect(appMocks.rendererRenderHomeButton).toHaveBeenCalledWith(false);

    appMocks.trackerDetect.mockReturnValue({
      point: { x: 40 / 960, y: 40 / 640, z: -0.1 },
      status: "tracking",
      errorMessage: null,
    } satisfies TrackingFrame);

    animationCallbacks[2]?.(940);

    expect(appMocks.rendererRenderMenu).toHaveBeenCalledTimes(3);
    expect(appMocks.rendererRenderHomeButton).toHaveBeenCalledTimes(1);
  });

  it("does not treat the hidden fruit restart button as hover-clickable while fruit slice is running", async () => {
    appMocks.trackerStart.mockResolvedValue({
      point: null,
      status: "searching",
      errorMessage: null,
    } satisfies TrackingFrame);
    appMocks.trackerDetect.mockReturnValue({
      point: { x: 0.75, y: 0.46875, z: 0 },
      status: "tracking",
      errorMessage: null,
    } satisfies TrackingFrame);

    const controller = new AppController(createRoot());

    await controller.start();
    animationCallbacks[0]?.(100);
    animationCallbacks[1]?.(900);

    expect(appMocks.rendererRenderFruitSlice).toHaveBeenCalledTimes(1);

    appMocks.trackerDetect.mockReturnValue({
      point: { x: 480 / 960, y: 385 / 640, z: 0 },
      status: "tracking",
      errorMessage: null,
    } satisfies TrackingFrame);

    animationCallbacks[2]?.(1121);
    animationCallbacks[3]?.(1922);

    expect(appMocks.rendererRenderPointer).toHaveBeenLastCalledWith({
      pointer: { x: 480, y: 385 },
      clickAnimation: { active: false, point: null, progress: 0 },
    });
  });
});
