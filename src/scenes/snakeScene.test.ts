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
