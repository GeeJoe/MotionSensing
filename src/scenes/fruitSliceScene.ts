import { FruitSliceGame, type FruitSliceState, type SliceObject } from "../domain/fruitSlice";
import type { Size } from "../domain/geometry";
import { BestScores } from "../storage/bestScores";
import type { Scene, SceneRenderContext, SceneTransition, SceneUpdateContext } from "./scene";
import { NO_TRANSITION } from "./scene";

interface FruitSliceSceneOptions {
  bounds: Size;
  bestScores: BestScores;
  render: (state: FruitSliceState) => void;
  random?: () => number;
  initialLives?: number;
  initialObjects?: SliceObject[];
}

export class FruitSliceScene implements Scene {
  readonly id = "fruit-slice";
  private game: FruitSliceGame;
  private hasRecordedFinalScore = false;

  constructor(private readonly options: FruitSliceSceneOptions) {
    this.game = this.createGame(options.initialLives, options.initialObjects);
  }

  getState(): FruitSliceState {
    return this.game.getState();
  }

  update(context: SceneUpdateContext): SceneTransition {
    const clickId = context.input.click?.id;

    if (clickId === "nav:home") {
      this.recordCurrentScore();
      return { type: "switch", scene: "menu" };
    }

    if (clickId === "fruit:restart" && this.game.getState().status === "game-over") {
      this.game = this.createGame(3, undefined);
      this.hasRecordedFinalScore = false;
      return NO_TRANSITION;
    }

    this.game.update(context.deltaSeconds, context.input.trail);

    const gameState = this.game.getState();
    if (gameState.status === "game-over" && !this.hasRecordedFinalScore) {
      this.hasRecordedFinalScore = true;
      this.recordCurrentScore();
    }

    return NO_TRANSITION;
  }

  render(_context: SceneRenderContext): void {
    this.options.render(this.game.getState());
  }

  private createGame(lives: number | undefined, initialObjects: SliceObject[] | undefined): FruitSliceGame {
    return new FruitSliceGame({
      width: this.options.bounds.width,
      height: this.options.bounds.height,
      lives,
      random: this.options.random,
      initialObjects: initialObjects ?? [this.createStarterFruit()],
    });
  }

  private createStarterFruit(): SliceObject {
    return {
      id: "fruit-1",
      kind: "fruit",
      fruitType: "apple",
      position: {
        x: this.options.bounds.width / 2,
        y: this.options.bounds.height - 140,
      },
      velocity: { x: 0, y: -520 },
      radius: 42,
      sliced: false,
    };
  }

  private recordCurrentScore(): void {
    this.options.bestScores.record("fruit-slice", this.game.getState().score);
  }
}
