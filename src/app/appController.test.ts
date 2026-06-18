import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackingFrame } from "../domain/types";
import { AppController } from "./appController";

const appMocks = vi.hoisted(() => ({
  trackerStart: vi.fn(),
  trackerDetect: vi.fn(),
  trackerDispose: vi.fn(),
  rendererRender: vi.fn(),
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
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: vi.fn(() => 1),
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    });
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
    expect(appMocks.rendererRender).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        tracking: errorFrame,
      }),
    );
  });
});
