import { describe, expect, it } from "vitest";
import type { HandInputState, Point } from "../domain/types";
import { MenuScene } from "./menuScene";

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

describe("MenuScene", () => {
  it("switches to snake when the snake card is clicked", () => {
    const scene = new MenuScene({
      bounds: { width: 960, height: 640 },
      bestScores: { snake: 10, "fruit-slice": 20 },
      render: () => undefined,
    });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "menu:snake", point: { x: 220, y: 260 } satisfies Point, source: "poke" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "snake" });
  });

  it("switches to fruit slice when the fruit card is clicked", () => {
    const scene = new MenuScene({
      bounds: { width: 960, height: 640 },
      bestScores: { snake: 10, "fruit-slice": 20 },
      render: () => undefined,
    });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "menu:fruit-slice", point: { x: 610, y: 260 }, source: "hover" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "fruit-slice" });
  });

  it("reports the hovered card id for pointer hit testing", () => {
    const scene = new MenuScene({
      bounds: { width: 960, height: 640 },
      bestScores: { snake: 10, "fruit-slice": 20 },
      render: () => undefined,
    });

    expect(scene.hitTest({ x: 240, y: 300 })).toBe("menu:snake");
    expect(scene.hitTest({ x: 720, y: 300 })).toBe("menu:fruit-slice");
    expect(scene.hitTest({ x: 20, y: 20 })).toBeNull();
  });
});
