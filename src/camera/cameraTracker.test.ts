import { describe, expect, it } from "vitest";
import { extractIndexFingerTip } from "./cameraTracker";

describe("extractIndexFingerTip", () => {
  it("returns landmark 8 from the first detected hand", () => {
    const landmarks = Array.from({ length: 21 }, (_, index) => ({
      x: index / 100,
      y: index / 200,
      z: 0,
      visibility: 0,
    }));

    expect(extractIndexFingerTip({ landmarks: [landmarks] })).toEqual({
      x: 0.08,
      y: 0.04,
    });
  });

  it("returns null when no hand is detected", () => {
    expect(extractIndexFingerTip({ landmarks: [] })).toBeNull();
  });
});
