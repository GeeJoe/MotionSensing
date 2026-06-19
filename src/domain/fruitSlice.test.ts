import { describe, expect, it } from "vitest";
import { FruitSliceGame, type SliceObject } from "./fruitSlice";

function randomSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0.5;
}

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

  it("slices a moving fruit at the position the player just swiped through", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: -870 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.05, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 180 },
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

  it("stops slicing remaining objects when a bomb ends the game", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      lives: 1,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);

    const state = game.getState();
    const fruit = state.objects.find((object) => object.id === "fruit-1");
    expect(state.status).toBe("game-over");
    expect(state.score).toBe(0);
    expect(fruit?.sliced).toBe(false);
  });

  it("does not duplicate ids when spawning after initial objects", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: randomSequence([0.5, 0.5, 0.5, 0.5, 0]),
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 250, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
        { id: "bomb-1", kind: "bomb", position: { x: 450, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, []);

    const ids = game.getState().objects.map((object) => object.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns cloned state", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 10, y: 20 }, radius: 40, sliced: false },
      ],
    });

    const state = game.getState();
    state.bounds.width = 1;
    state.objects[0].position.x = 1;
    state.objects[0].velocity.y = 1;
    state.objects[0].sliced = true;

    expect(game.getState().bounds.width).toBe(960);
    expect(game.getState().objects[0].position).toEqual({ x: 300, y: 300 });
    expect(game.getState().objects[0].velocity).toEqual({ x: 10, y: 20 });
    expect(game.getState().objects[0].sliced).toBe(false);
  });

  it("clones initial objects", () => {
    const initialObjects: SliceObject[] = [
      { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 10, y: 20 }, radius: 40, sliced: false },
    ];
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects,
    });

    initialObjects[0].position.x = 1;
    initialObjects[0].velocity.y = 1;
    initialObjects[0].sliced = true;

    expect(game.getState().objects[0].position).toEqual({ x: 300, y: 300 });
    expect(game.getState().objects[0].velocity).toEqual({ x: 10, y: 20 });
    expect(game.getState().objects[0].sliced).toBe(false);
  });

  it("does not move spawn or slice after game over", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      lives: 1,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 500, y: 300 }, velocity: { x: 10, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ]);
    const gameOverState = game.getState();
    const fruitBefore = gameOverState.objects.find((object) => object.id === "fruit-1");

    game.update(5, [
      { point: { x: 440, y: 300 }, timestampMs: 100 },
      { point: { x: 560, y: 300 }, timestampMs: 180 },
    ]);

    const state = game.getState();
    const fruitAfter = state.objects.find((object) => object.id === "fruit-1");
    expect(state.status).toBe("game-over");
    expect(state.elapsedSeconds).toBe(gameOverState.elapsedSeconds);
    expect(state.objects).toHaveLength(gameOverState.objects.length);
    expect(fruitAfter?.position).toEqual(fruitBefore?.position);
    expect(fruitAfter?.sliced).toBe(false);
  });

  it("scores multiple sliced fruit with combo bonuses", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
        { id: "fruit-2", kind: "fruit", fruitType: "orange", position: { x: 420, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 480, y: 300 }, timestampMs: 80 },
    ]);

    expect(game.getState().score).toBe(22);
    expect(game.getState().combo).toBe(2);
  });

  it("does not lose a life when a sliced fruit falls below the screen", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 700 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: true },
      ],
    });

    game.update(0.016, []);

    expect(game.getState().lives).toBe(3);
  });

  it("does not lose a life when a bomb falls below the screen", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "bomb-1", kind: "bomb", position: { x: 300, y: 700 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });

    game.update(0.016, []);

    expect(game.getState().lives).toBe(3);
  });

  it("does not score a sliced object twice", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: () => 0.5,
      initialObjects: [
        { id: "fruit-1", kind: "fruit", fruitType: "apple", position: { x: 300, y: 300 }, velocity: { x: 0, y: 0 }, radius: 40, sliced: false },
      ],
    });
    const trail = [
      { point: { x: 240, y: 300 }, timestampMs: 0 },
      { point: { x: 360, y: 300 }, timestampMs: 80 },
    ];

    game.update(0.016, trail);
    game.update(0.016, trail);

    expect(game.getState().score).toBe(10);
    expect(game.getState().combo).toBe(1);
  });

  it("spawns fruit and ramps the spawn interval as elapsed time grows", () => {
    const game = new FruitSliceGame({
      width: 960,
      height: 640,
      random: randomSequence([0.5, 0.25, 0.5, 0.5, 0, 0.5, 0.75, 0.5, 0.5, 0]),
    });

    game.update(240, []);

    const firstState = game.getState();
    expect(firstState.objects).toHaveLength(1);
    expect(firstState.objects[0]).toMatchObject({
      id: "fruit-1",
      kind: "fruit",
      fruitType: "apple",
      position: { x: 280, y: 690 },
      velocity: { x: 0, y: -870 },
      radius: 38,
      sliced: false,
    });

    game.update(0.44, []);
    expect(game.getState().objects).toHaveLength(1);

    game.update(0.02, []);
    expect(game.getState().objects).toHaveLength(2);
  });
});
