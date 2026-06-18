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
});
