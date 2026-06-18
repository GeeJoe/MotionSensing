import { describe, expect, it } from "vitest";
import { FruitSliceGame } from "./fruitSlice";

describe("FruitSliceGame", () => {
  it("slices fruit when a fast trail segment crosses it", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().score).toBe(10);
    expect(game.getState().objects[0].sliced).toBe(true);
  });

  it("does not slice fruit with a slow trail", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 260, y: 300 }, timestampMs: 400 },
    ]);

    expect(game.getState().score).toBe(0);
    expect(game.getState().objects[0].sliced).toBe(false);
  });

  it("reduces lives and clears combo when a bomb is sliced", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().lives).toBe(2);
    expect(game.getState().combo).toBe(0);
  });

  it("ends the game when lives reach zero", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      lives: 1,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().status).toBe("game-over");
  });

  it("reduces lives when an unsliced fruit falls below the screen", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 700 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, []);

    expect(game.getState().lives).toBe(2);
  });
});
