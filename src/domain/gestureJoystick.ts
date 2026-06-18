import type { JoystickOutput, Point } from "./types";
import { clamp, magnitude, normalize, subtract } from "./vector";

interface GestureJoystickOptions {
  deadZone: number;
  maxDistance: number;
}

const INACTIVE_MOVEMENT = {
  active: false,
  direction: { x: 0, y: 0 },
  magnitude: 0,
  speedScale: 0,
};

export class GestureJoystick {
  private origin: Point | null = null;
  private readonly deadZone: number;
  private readonly maxDistance: number;

  constructor(options: GestureJoystickOptions) {
    this.deadZone = options.deadZone;
    this.maxDistance = options.maxDistance;
  }

  update(point: Point | null): JoystickOutput {
    if (!point) {
      this.origin = null;
      return { ...INACTIVE_MOVEMENT, origin: null };
    }

    if (!this.origin) {
      this.origin = { ...point };
      return { ...INACTIVE_MOVEMENT, origin: { ...this.origin } };
    }

    const delta = subtract(point, this.origin);
    const length = magnitude(delta);

    if (length < this.deadZone) {
      return {
        active: false,
        direction: { x: 0, y: 0 },
        magnitude: length,
        speedScale: 0,
        origin: { ...this.origin },
      };
    }

    const usableRange = Math.max(this.maxDistance - this.deadZone, Number.EPSILON);
    const speedScale = clamp((length - this.deadZone) / usableRange, 0, 1);

    return {
      active: true,
      direction: normalize(delta),
      magnitude: length,
      speedScale,
      origin: { ...this.origin },
    };
  }
}
