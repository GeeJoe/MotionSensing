import { describe, expect, it } from "vitest";
import { GestureJoystick } from "./gestureJoystick";

describe("GestureJoystick", () => {
  it("locks the first tracked point as origin and pauses inside the dead zone", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.5 });

    const first = joystick.update({ x: 0.5, y: 0.5 });
    expect(first.origin).toEqual({ x: 0.5, y: 0.5 });
    expect(first.active).toBe(false);
    expect(first.speedScale).toBe(0);

    const insideDeadZone = joystick.update({ x: 0.56, y: 0.5 });
    expect(insideDeadZone.origin).toEqual({ x: 0.5, y: 0.5 });
    expect(insideDeadZone.active).toBe(false);
    expect(insideDeadZone.magnitude).toBeCloseTo(0.06);
  });

  it("normalizes movement direction and clamps speed scale", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.3 });

    joystick.update({ x: 0.2, y: 0.2 });
    const output = joystick.update({ x: 0.8, y: 0.2 });

    expect(output.active).toBe(true);
    expect(output.direction.x).toBeCloseTo(1);
    expect(output.direction.y).toBeCloseTo(0);
    expect(output.speedScale).toBe(1);
  });

  it("stays inactive exactly at the dead zone boundary", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.5 });

    joystick.update({ x: 0, y: 0 });
    const output = joystick.update({ x: 0.1, y: 0 });

    expect(output.active).toBe(false);
    expect(output.direction).toEqual({ x: 0, y: 0 });
    expect(output.magnitude).toBeCloseTo(0.1);
    expect(output.speedScale).toBe(0);
  });

  it("does not share mutable direction objects between inactive outputs", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.5 });

    const first = joystick.update({ x: 0.1, y: 0.1 });
    first.direction.x = 1;

    const lost = joystick.update(null);
    expect(lost.direction).toEqual({ x: 0, y: 0 });

    lost.direction.y = 1;
    const relocked = joystick.update({ x: 0.8, y: 0.8 });
    expect(relocked.direction).toEqual({ x: 0, y: 0 });
  });

  it("resets the origin after tracking is lost", () => {
    const joystick = new GestureJoystick({ deadZone: 0.1, maxDistance: 0.5 });

    joystick.update({ x: 0.1, y: 0.1 });
    const lost = joystick.update(null);
    expect(lost.origin).toBeNull();
    expect(lost.active).toBe(false);

    const relocked = joystick.update({ x: 0.8, y: 0.8 });
    expect(relocked.origin).toEqual({ x: 0.8, y: 0.8 });
    expect(relocked.active).toBe(false);
  });
});
