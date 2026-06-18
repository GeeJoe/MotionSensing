import { describe, expect, it } from "vitest";
import type { HandInputState, JoystickOutput, SnakeGameState, TrackingFrame } from "../domain/types";
import { NO_TRANSITION } from "./scene";
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

type RenderedDebug = { joystick: JoystickOutput; tracking: TrackingFrame };

describe("SnakeScene", () => {
  it("stays in the snake scene when there is no Home click", () => {
    const scene = new SnakeScene({
      bounds: { width: 960, height: 640 },
      render: () => undefined,
      recordBestScore: () => undefined,
    });

    expect(scene.update({ deltaSeconds: 0.016, input: input() })).toEqual(NO_TRANSITION);
    expect(
      scene.update({
        deltaSeconds: 0.016,
        input: input({ click: { id: "menu:snake", point: { x: 240, y: 220 }, source: "poke" } }),
      }),
    ).toEqual(NO_TRANSITION);
  });

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

  it("renders the current game state and latest debug payload", () => {
    const renderedGames: SnakeGameState[] = [];
    const renderedDebugs: RenderedDebug[] = [];
    const scene = new SnakeScene({
      bounds: { width: 960, height: 640 },
      render: (game, debug) => {
        renderedGames.push(game);
        renderedDebugs.push(debug);
      },
      recordBestScore: () => undefined,
    });

    scene.update({
      deltaSeconds: 1,
      input: input({ normalizedPointer: { x: 0.9, y: 0.5, z: 0 }, pointerVisible: true }),
    });
    scene.render({
      input: input({ normalizedPointer: { x: 0.2, y: 0.25, z: -0.1 }, pointerVisible: true }),
    });
    const debug = renderedDebugs[0];

    if (!debug) {
      throw new Error("Expected SnakeScene to call render callback");
    }

    expect(renderedGames[0]).toEqual(scene.getState());
    expect(debug.tracking).toEqual({
      errorMessage: null,
      point: { x: 0.2, y: 0.25, z: -0.1 },
      status: "tracking",
    });
    expect(debug.joystick.active).toBe(true);
    expect(debug.joystick.direction.x).toBeGreaterThan(0);
  });

  it("renders searching and inactive joystick after the pointer is lost", () => {
    const renderedDebugs: RenderedDebug[] = [];
    const scene = new SnakeScene({
      bounds: { width: 960, height: 640 },
      render: (_game, debug) => {
        renderedDebugs.push(debug);
      },
      recordBestScore: () => undefined,
    });

    scene.update({
      deltaSeconds: 1,
      input: input({ normalizedPointer: { x: 0.9, y: 0.5, z: 0 }, pointerVisible: true }),
    });
    scene.update({ deltaSeconds: 0.016, input: input({ normalizedPointer: null, pointerVisible: false }) });
    scene.render({ input: input({ normalizedPointer: null, pointerVisible: false }) });
    const debug = renderedDebugs[0];

    if (!debug) {
      throw new Error("Expected SnakeScene to call render callback");
    }

    expect(debug.tracking).toEqual({
      errorMessage: null,
      point: null,
      status: "searching",
    });
    expect(debug.joystick.active).toBe(false);
    expect(debug.joystick.speedScale).toBe(0);
  });

  it("records the game-over score only once across repeated updates", () => {
    const recordedScores: number[] = [];
    const scene = new SnakeScene({
      bounds: { width: 960, height: 640 },
      render: () => undefined,
      recordBestScore: (score) => {
        recordedScores.push(score);
      },
    });
    const rightInput = input({ normalizedPointer: { x: 0.9, y: 0.5, z: 0 }, pointerVisible: true });

    scene.update({ deltaSeconds: 3.5, input: rightInput });
    expect(scene.getState().status).toBe("game-over");

    scene.update({ deltaSeconds: 0.016, input: rightInput });

    expect(recordedScores).toEqual([scene.getState().score]);
  });
});
