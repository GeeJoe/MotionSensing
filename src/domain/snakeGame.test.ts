import { describe, expect, it } from "vitest";
import { SnakeGame } from "./snakeGame";
import type { MovementVector } from "./types";

const moveRight: MovementVector = {
  active: true,
  direction: { x: 1, y: 0 },
  magnitude: 0.4,
  speedScale: 1,
};

const inactive: MovementVector = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  speedScale: 0,
};

describe("SnakeGame", () => {
  it("moves the head with a continuous movement vector", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 100, y: 100 },
      initialFood: { position: { x: 260, y: 100 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 100,
    });

    game.update(moveRight, 0.5);

    expect(game.getState().head).toEqual({ x: 150, y: 100 });
    expect(game.getState().status).toBe("running");
  });

  it("pauses movement when the joystick is inactive", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 100, y: 100 },
      initialFood: { position: { x: 260, y: 100 }, radius: 8 },
    });

    game.update(inactive, 1);

    expect(game.getState().head).toEqual({ x: 100, y: 100 });
    expect(game.getState().score).toBe(0);
  });

  it("grows and increments score after eating food", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 90, y: 100 },
      initialFood: { position: { x: 100, y: 100 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 100,
      random: () => 0.5,
    });

    const before = game.getState().targetLength;
    game.update(moveRight, 0.1);

    expect(game.getState().score).toBe(1);
    expect(game.getState().targetLength).toBeGreaterThan(before);
    expect(game.getState().food.position).toEqual({ x: 150, y: 100 });
  });

  it("ends the run when the snake hits a wall", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 295, y: 100 },
      initialFood: { position: { x: 100, y: 100 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 100,
    });

    game.update(moveRight, 0.1);

    expect(game.getState().status).toBe("game-over");
  });

  it("clamps movement speed scale before applying speed", () => {
    const fastGame = new SnakeGame({
      width: 500,
      height: 200,
      initialHead: { x: 100, y: 100 },
      initialFood: { position: { x: 490, y: 190 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 200,
    });

    fastGame.update({ ...moveRight, speedScale: 2 }, 1);

    expect(fastGame.getState().head).toEqual({ x: 300, y: 100 });

    const slowGame = new SnakeGame({
      width: 500,
      height: 200,
      initialHead: { x: 100, y: 100 },
      initialFood: { position: { x: 490, y: 190 }, radius: 8 },
      baseSpeed: 100,
      maxSpeed: 200,
    });

    slowGame.update({ ...moveRight, speedScale: -1 }, 1);

    expect(slowGame.getState().head).toEqual({ x: 200, y: 100 });
  });

  it("counts food as eaten when movement segment crosses it", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 80, y: 100 },
      initialFood: { position: { x: 150, y: 100 }, radius: 8 },
      baseSpeed: 200,
      maxSpeed: 200,
    });

    game.update(moveRight, 0.5);

    expect(game.getState().score).toBe(1);
  });

  it("ends run when head radius crosses a wall", () => {
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead: { x: 289, y: 100 },
      initialFood: { position: { x: 100, y: 100 }, radius: 8 },
      headRadius: 10,
      baseSpeed: 2,
      maxSpeed: 2,
    });

    game.update(moveRight, 1);

    expect(game.getState().status).toBe("game-over");
  });

  it("clones initial input objects", () => {
    const initialHead = { x: 100, y: 100 };
    const initialFood = { position: { x: 260, y: 100 }, radius: 8 };
    const game = new SnakeGame({
      width: 300,
      height: 200,
      initialHead,
      initialFood,
    });

    initialHead.x = 10;
    initialFood.position.x = 20;

    expect(game.getState().head).toEqual({ x: 100, y: 100 });
    expect(game.getState().food.position).toEqual({ x: 260, y: 100 });
  });
});
