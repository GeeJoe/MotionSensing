import { describe, expect, it } from "vitest";
import { BestScores } from "./bestScores";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("BestScores", () => {
  it("stores and reads the best score for a game", () => {
    const scores = new BestScores(createStorage());

    scores.record("fruit-slice", 120);
    scores.record("fruit-slice", 90);

    expect(scores.get("fruit-slice")).toBe(120);
  });

  it("falls back to memory when storage throws", () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const scores = new BestScores(brokenStorage);

    scores.record("snake", 42);

    expect(scores.get("snake")).toBe(42);
  });

  it("uses the motion arcade best score storage prefix", () => {
    const storage = createStorage();
    const scores = new BestScores(storage);

    scores.record("snake", 7);

    expect(storage.getItem("motionArcade.bestScore.snake")).toBe("7");
  });

  it("ignores malformed and negative stored scores", () => {
    const storage = createStorage();
    const scores = new BestScores(storage);

    storage.setItem("motionArcade.bestScore.snake", "bad");
    expect(scores.get("snake")).toBe(0);

    storage.setItem("motionArcade.bestScore.snake", "-1");
    expect(scores.get("snake")).toBe(0);
  });

  it("ignores decimal stored scores and floors finite decimal records", () => {
    const storage = createStorage();
    const scores = new BestScores(storage);

    storage.setItem("motionArcade.bestScore.snake", "12.9");

    expect(scores.get("snake")).toBe(0);
    expect(scores.record("snake", 12.1)).toBe(12);
    expect(storage.getItem("motionArcade.bestScore.snake")).toBe("12");
  });

  it("does not let negative records reduce the current best score", () => {
    const scores = new BestScores(createStorage());

    expect(scores.record("snake", -4)).toBe(0);
    expect(scores.record("snake", 8)).toBe(8);
    expect(scores.record("snake", -2)).toBe(8);
    expect(scores.get("snake")).toBe(8);
  });

  it("does not let non-finite records pollute the current best score", () => {
    const storage = createStorage();
    const scores = new BestScores(storage);

    scores.record("snake", 10);

    expect(scores.record("snake", Number.NaN)).toBe(10);
    expect(scores.record("snake", Number.POSITIVE_INFINITY)).toBe(10);
    expect(scores.get("snake")).toBe(10);
    expect(storage.getItem("motionArcade.bestScore.snake")).toBe("10");
  });

  it("uses memory fallback when storage is null", () => {
    const scores = new BestScores(null);

    expect(scores.record("fruit-slice", 14)).toBe(14);
    expect(scores.get("fruit-slice")).toBe(14);
  });

  it("keeps memory fallback when setItem throws", () => {
    const brokenStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const scores = new BestScores(brokenStorage);

    expect(scores.record("snake", 18)).toBe(18);
    expect(scores.get("snake")).toBe(18);
  });
});
