import type { JoystickOutput, Point } from "./types";
import { clamp, magnitude, normalize, subtract } from "./vector";

interface GestureJoystickOptions {
  deadZone: number;
  maxDistance: number;
}

export const FIXED_JOYSTICK_ORIGIN: Point = { x: 0.5, y: 0.5 };

function fixedOrigin(): Point {
  return { ...FIXED_JOYSTICK_ORIGIN };
}

function inactiveOutput(magnitude = 0): JoystickOutput {
  return {
    active: false,
    direction: { x: 0, y: 0 },
    magnitude,
    speedScale: 0,
    origin: fixedOrigin(),
  };
}

export class GestureJoystick {
  private readonly deadZone: number;
  private readonly maxDistance: number;

  constructor(options: GestureJoystickOptions) {
    this.deadZone = options.deadZone;
    this.maxDistance = options.maxDistance;
  }

  update(point: Point | null): JoystickOutput {
    if (!point) {
      return inactiveOutput();
    }

    const delta = subtract(point, FIXED_JOYSTICK_ORIGIN);
    const length = magnitude(delta);

    if (length <= this.deadZone) {
      return inactiveOutput(length);
    }

    const usableRange = Math.max(this.maxDistance - this.deadZone, Number.EPSILON);
    const speedScale = clamp((length - this.deadZone) / usableRange, 0, 1);

    return {
      active: true,
      direction: normalize(delta),
      magnitude: length,
      speedScale,
      origin: fixedOrigin(),
    };
  }
}
