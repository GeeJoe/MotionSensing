import type { GameId, HandInputState } from "../domain/types";

export type SceneId = "menu" | GameId;

export type SceneTransition =
  | { type: "none" }
  | { type: "switch"; scene: SceneId };

export interface SceneUpdateContext {
  input: HandInputState;
  deltaSeconds: number;
}

export interface SceneRenderContext {
  input: HandInputState;
}

export interface Scene {
  readonly id: SceneId;
  update(context: SceneUpdateContext): SceneTransition;
  render(context: SceneRenderContext): void;
}

export const NO_TRANSITION: SceneTransition = { type: "none" };
