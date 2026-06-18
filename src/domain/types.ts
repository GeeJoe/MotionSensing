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
