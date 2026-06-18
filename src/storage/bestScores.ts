import type { GameId } from "../domain/types";

const PREFIX = "motionArcade.bestScore.";

export class BestScores {
  private readonly fallback = new Map<GameId, number>();

  constructor(private readonly storage: Storage | null) {}

  get(gameId: GameId): number {
    const fallbackValue = this.fallback.get(gameId) ?? 0;

    try {
      const stored = this.storage?.getItem(`${PREFIX}${gameId}`);
      if (!stored) {
        return fallbackValue;
      }

      const parsed = Number(stored);
      return Number.isFinite(parsed) ? Math.max(fallbackValue, parsed) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  record(gameId: GameId, score: number): number {
    const next = Math.max(this.get(gameId), Math.floor(score));
    this.fallback.set(gameId, next);

    try {
      this.storage?.setItem(`${PREFIX}${gameId}`, String(next));
    } catch {
      return next;
    }

    return next;
  }
}
