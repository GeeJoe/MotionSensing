export interface Point {
  x: number;
  y: number;
}

export interface TrackedPoint3D extends Point {
  z: number;
}

export interface MovementVector {
  active: boolean;
  direction: Point;
  magnitude: number;
  speedScale: number;
}

export interface JoystickOutput extends MovementVector {
  origin: Point | null;
}

export type GameStatus = "running" | "game-over";

export interface Food {
  position: Point;
  radius: number;
}

export interface SnakeGameState {
  bounds: {
    width: number;
    height: number;
  };
  head: Point;
  trail: Point[];
  targetLength: number;
  food: Food;
  score: number;
  status: GameStatus;
}

export interface TrackingFrame {
  point: TrackedPoint3D | null;
  status: "loading" | "searching" | "tracking" | "error";
  errorMessage: string | null;
}

export type GameId = "snake" | "fruit-slice";
export type ClickSource = "poke" | "hover";

export interface SwipeSample {
  point: Point;
  timestampMs: number;
}

export interface ClickEvent {
  id: string;
  point: Point;
  source: ClickSource;
}

export interface HoverState {
  targetId: string | null;
  progress: number;
}

export interface ClickAnimationState {
  active: boolean;
  point: Point | null;
  progress: number;
}

export interface HandInputState {
  pointer: Point | null;
  normalizedPointer: TrackedPoint3D | null;
  pointerVisible: boolean;
  trail: SwipeSample[];
  click: ClickEvent | null;
  hover: HoverState;
  clickAnimation: ClickAnimationState;
}
