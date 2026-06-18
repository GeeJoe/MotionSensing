import { describe, expect, it } from "vitest";
import { HandInputController } from "./handInput";

describe("HandInputController", () => {
  it("maps normalized tracking points into canvas pointer coordinates", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    const state = input.update({
      timestampMs: 100,
      trackingPoint: { x: 0.25, y: 0.75, z: -0.1 },
      hoverTargetId: null,
    });

    expect(state.pointer).toEqual({ x: 240, y: 480 });
    expect(state.normalizedPointer).toEqual({ x: 0.25, y: 0.75, z: -0.1 });
    expect(state.pointerVisible).toBe(true);
  });

  it("emits a poke click when fingertip z moves toward the camera quickly", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0.02 }, hoverTargetId: null });
    const state = input.update({
      timestampMs: 160,
      trackingPoint: { x: 0.5, y: 0.5, z: -0.09 },
      hoverTargetId: "snake",
    });

    expect(state.click).toEqual({
      id: "snake",
      point: { x: 480, y: 320 },
      source: "poke",
    });
    expect(state.clickAnimation.active).toBe(true);
  });

  it("emits a hover click after the pointer remains on the same target", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    input.update({ timestampMs: 700, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    const state = input.update({ timestampMs: 930, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });

    expect(state.click?.source).toBe("hover");
    expect(state.click?.id).toBe("fruit");
  });

  it("resets trail and hover when tracking is lost", () => {
    const input = new HandInputController({
      canvasSize: { width: 960, height: 640 },
      hoverClickMs: 800,
      pokeDepthDelta: 0.08,
      clickAnimationMs: 220,
      maxTrailAgeMs: 180,
    });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.1, y: 0.1, z: 0 }, hoverTargetId: "snake" });
    const lost = input.update({ timestampMs: 150, trackingPoint: null, hoverTargetId: "snake" });

    expect(lost.pointerVisible).toBe(false);
    expect(lost.trail).toEqual([]);
    expect(lost.hover).toEqual({ targetId: null, progress: 0 });
  });
});
