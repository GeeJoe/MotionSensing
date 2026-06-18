import { describe, expect, it } from "vitest";
import type { FruitSliceState, SliceObject } from "../domain/fruitSlice";
import type { HandInputState, SwipeSample } from "../domain/types";
import { BestScores } from "../storage/bestScores";
import { FruitSliceScene } from "./fruitSliceScene";
import { NO_TRANSITION } from "./scene";

const BOUNDS = { width: 960, height: 640 };

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

function fastTrailThrough(point: { x: number; y: number }): SwipeSample[] {
  return [
    { point: { x: point.x - 60, y: point.y }, timestampMs: 0 },
    { point: { x: point.x + 60, y: point.y }, timestampMs: 80 },
  ];
}

describe("FruitSliceScene", () => {
  it("starts normal play with a visible fruit instead of an empty black arena", () => {
    const scene = new FruitSliceScene({
      bounds: BOUNDS,
      bestScores: new BestScores(null),
      render: () => undefined,
      random: () => 0.5,
    });

    const state = scene.getState();
    const visibleFruit = state.objects.find(
      (object) =>
        object.kind === "fruit" &&
        object.position.y - object.radius <= state.bounds.height &&
        object.position.y + object.radius >= 0,
    );

    expect(visibleFruit).toBeDefined();
  });

  it("records the current score and switches to menu when Home is clicked", () => {
    const bestScores = new BestScores(null);
    const initialObjects: SliceObject[] = [
      { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
    ];
    const scene = new FruitSliceScene({
      bounds: BOUNDS,
      bestScores,
      render: () => undefined,
      random: () => 0.5,
      initialObjects,
    });

    scene.update({ deltaSeconds: 0.016, input: input({ trail: fastTrailThrough({ x: 300, y: 300 }) }) });

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "nav:home", point: { x: 34, y: 34 }, source: "poke" } }),
    });

    expect(transition).toEqual({ type: "switch", scene: "menu" });
    expect(bestScores.get("fruit-slice")).toBe(10);
  });

  it("restarts from game over with three lives and a visible fruit", () => {
    const initialObjects: SliceObject[] = [
      { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
    ];
    const scene = new FruitSliceScene({
      bounds: BOUNDS,
      bestScores: new BestScores(null),
      render: () => undefined,
      random: () => 0.5,
      initialLives: 1,
      initialObjects,
    });

    expect(scene.update({ deltaSeconds: 0.016, input: input({ trail: fastTrailThrough({ x: 300, y: 300 }) }) })).toEqual(NO_TRANSITION);
    expect(scene.getState().status).toBe("game-over");

    const transition = scene.update({
      deltaSeconds: 0.016,
      input: input({ click: { id: "fruit:restart", point: { x: 480, y: 390 }, source: "poke" } }),
    });

    expect(transition).toEqual(NO_TRANSITION);
    const restartedState = scene.getState();
    const visibleFruit = restartedState.objects.find(
      (object) =>
        object.kind === "fruit" &&
        object.position.y - object.radius <= restartedState.bounds.height &&
        object.position.y + object.radius >= 0,
    );

    expect(restartedState).toMatchObject({
      lives: 3,
      status: "running",
    });
    expect(visibleFruit).toBeDefined();
  });

  it("renders the current fruit slice state", () => {
    const renderedStates: FruitSliceState[] = [];
    const scene = new FruitSliceScene({
      bounds: BOUNDS,
      bestScores: new BestScores(null),
      render: (state) => {
        renderedStates.push(state);
      },
      random: () => 0.5,
    });

    scene.render({ input: input() });

    expect(renderedStates[0]).toEqual(scene.getState());
  });
});
