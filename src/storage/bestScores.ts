import type { GameId } from "../domain/types";

const PREFIX = "motionArcade.bestScore.";

function normalizeScore(score: number): number | null {
  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.max(0, Math.floor(score));
}

export class BestScores {
  private readonly fallback = new Map<GameId, number>();

  constructor(private readonly storage: Storage | null) {}

  get(gameId: GameId): number {
    const fallbackValue = this.fallback.get(gameId) ?? 0;
    const storedValue = this.readStoredScore(gameId);

    return storedValue === null ? fallbackValue : Math.max(fallbackValue, storedValue);
  }

  record(gameId: GameId, score: number): number {
    const current = this.get(gameId);
    const normalized = normalizeScore(score);
    if (normalized === null) {
      return current;
    }

    const next = Math.max(current, normalized);
    this.fallback.set(gameId, next);

    try {
      this.storage?.setItem(`${PREFIX}${gameId}`, String(next));
    } catch {
      return next;
    }

    return next;
  }

  private readStoredScore(gameId: GameId): number | null {
    try {
      const stored = this.storage?.getItem(`${PREFIX}${gameId}`);
      if (stored === undefined || stored === null) {
        return null;
      }

      const parsed = Number(stored);
      return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
    } catch {
      return null;
    }
  }
}
