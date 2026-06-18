import { GestureJoystick } from "../domain/gestureJoystick";
import { SnakeGame } from "../domain/snakeGame";
import type { JoystickOutput, SnakeGameState } from "../domain/types";
import type { Size } from "../domain/geometry";
import type { Renderer } from "../render/renderer";
import type { Scene, SceneRenderContext, SceneTransition, SceneUpdateContext } from "./scene";
import { NO_TRANSITION } from "./scene";

const EMPTY_JOYSTICK: JoystickOutput = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  origin: { x: 0.5, y: 0.5 },
  speedScale: 0,
};

interface SnakeSceneOptions {
  bounds: Size;
  render: (game: SnakeGameState, debug: Parameters<Renderer["renderSnake"]>[1]) => void;
  recordBestScore: (score: number) => void;
}

export class SnakeScene implements Scene {
  readonly id = "snake";
  private readonly joystick = new GestureJoystick({ deadZone: 0.035, maxDistance: 0.32 });
  private readonly game: SnakeGame;
  private latestJoystick = EMPTY_JOYSTICK;

  constructor(private readonly options: SnakeSceneOptions) {
    this.game = new SnakeGame({ width: options.bounds.width, height: options.bounds.height });
  }

  getState(): SnakeGameState {
    return this.game.getState();
  }

  update(context: SceneUpdateContext): SceneTransition {
    if (context.input.click?.id === "nav:home") {
      this.options.recordBestScore(this.game.getState().score);
      return { type: "switch", scene: "menu" };
    }

    this.latestJoystick = this.joystick.update(context.input.normalizedPointer);
    this.game.update(this.latestJoystick, context.deltaSeconds);

    if (this.game.getState().status === "game-over") {
      this.options.recordBestScore(this.game.getState().score);
    }

    return NO_TRANSITION;
  }

  render(context: SceneRenderContext): void {
    this.options.render(this.game.getState(), {
      joystick: this.latestJoystick,
      tracking: {
        point: context.input.normalizedPointer,
        status: context.input.pointerVisible ? "tracking" : "searching",
        errorMessage: null,
      },
    });
  }
}
