import { describe, expect, it } from "vitest";
import { HandInputController } from "./handInput";

function createInput(
  overrides: Partial<{
    canvasSize: { width: number; height: number };
    hoverClickMs: number;
    pokeDepthDelta: number;
    clickAnimationMs: number;
    maxTrailAgeMs: number;
  }> = {},
): HandInputController {
  return new HandInputController({
    canvasSize: { width: 960, height: 640 },
    hoverClickMs: 800,
    pokeDepthDelta: 0.08,
    clickAnimationMs: 220,
    maxTrailAgeMs: 180,
    ...overrides,
  });
}

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

  it("isolates tracked input objects from later caller mutations", () => {
    const input = createInput();
    const trackingPoint = { x: 0.5, y: 0.5, z: 0.02 };

    const firstState = input.update({ timestampMs: 100, trackingPoint, hoverTargetId: null });
    trackingPoint.x = 0.1;
    trackingPoint.z = -0.09;
    const secondState = input.update({
      timestampMs: 160,
      trackingPoint: { x: 0.5, y: 0.5, z: -0.09 },
      hoverTargetId: "snake",
    });

    expect(firstState.normalizedPointer).toEqual({ x: 0.5, y: 0.5, z: 0.02 });
    expect(secondState.click).toEqual({
      id: "snake",
      point: { x: 480, y: 320 },
      source: "poke",
    });
  });

  it("prunes trail samples older than maxTrailAgeMs", () => {
    const input = createInput({ maxTrailAgeMs: 100 });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.1, y: 0.1, z: 0 }, hoverTargetId: null });
    input.update({ timestampMs: 180, trackingPoint: { x: 0.2, y: 0.2, z: 0 }, hoverTargetId: null });
    const state = input.update({ timestampMs: 221, trackingPoint: { x: 0.3, y: 0.3, z: 0 }, hoverTargetId: null });

    expect(state.trail).toEqual([
      { point: { x: 192, y: 128 }, timestampMs: 180 },
      { point: { x: 288, y: 192 }, timestampMs: 221 },
    ]);
  });

  it("emits one hover click per continuous target hover", () => {
    const input = createInput();

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    const firstClick = input.update({
      timestampMs: 900,
      trackingPoint: { x: 0.5, y: 0.5, z: 0 },
      hoverTargetId: "fruit",
    });
    const repeatedHover = input.update({
      timestampMs: 1200,
      trackingPoint: { x: 0.5, y: 0.5, z: 0 },
      hoverTargetId: "fruit",
    });

    expect(firstClick.click?.source).toBe("hover");
    expect(repeatedHover.click).toBeNull();
  });

  it("resets consumed hover when target changes", () => {
    const input = createInput();

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    input.update({ timestampMs: 900, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    const changedTarget = input.update({
      timestampMs: 920,
      trackingPoint: { x: 0.5, y: 0.5, z: 0 },
      hoverTargetId: "snake",
    });
    const nextClick = input.update({
      timestampMs: 1720,
      trackingPoint: { x: 0.5, y: 0.5, z: 0 },
      hoverTargetId: "snake",
    });

    expect(changedTarget.click).toBeNull();
    expect(nextClick.click).toEqual({
      id: "snake",
      point: { x: 480, y: 320 },
      source: "hover",
    });
  });

  it("resets consumed hover when tracking is lost", () => {
    const input = createInput();

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    input.update({ timestampMs: 900, trackingPoint: { x: 0.5, y: 0.5, z: 0 }, hoverTargetId: "fruit" });
    input.update({ timestampMs: 930, trackingPoint: null, hoverTargetId: "fruit" });
    const reacquired = input.update({
      timestampMs: 960,
      trackingPoint: { x: 0.5, y: 0.5, z: 0 },
      hoverTargetId: "fruit",
    });
    const nextClick = input.update({
      timestampMs: 1760,
      trackingPoint: { x: 0.5, y: 0.5, z: 0 },
      hoverTargetId: "fruit",
    });

    expect(reacquired.click).toBeNull();
    expect(nextClick.click?.source).toBe("hover");
  });

  it("prefers poke clicks over hover clicks on the same frame", () => {
    const input = createInput();

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0.02 }, hoverTargetId: "fruit" });
    const state = input.update({
      timestampMs: 900,
      trackingPoint: { x: 0.5, y: 0.5, z: -0.09 },
      hoverTargetId: "fruit",
    });

    expect(state.click).toEqual({
      id: "fruit",
      point: { x: 480, y: 320 },
      source: "poke",
    });
  });

  it("expires click animation after clickAnimationMs", () => {
    const input = createInput({ clickAnimationMs: 220 });

    input.update({ timestampMs: 100, trackingPoint: { x: 0.5, y: 0.5, z: 0.02 }, hoverTargetId: null });
    const clicked = input.update({
      timestampMs: 160,
      trackingPoint: { x: 0.5, y: 0.5, z: -0.09 },
      hoverTargetId: "snake",
    });
    const expired = input.update({
      timestampMs: 381,
      trackingPoint: { x: 0.5, y: 0.5, z: -0.09 },
      hoverTargetId: null,
    });

    expect(clicked.clickAnimation.active).toBe(true);
    expect(expired.clickAnimation).toEqual({ active: false, point: null, progress: 0 });
  });
});
