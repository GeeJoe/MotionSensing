import type { GameId, Point } from "../domain/types";
import { containsPoint, type Rect, type Size } from "../domain/geometry";
import type { MenuView } from "../render/renderer";
import type { Scene, SceneRenderContext, SceneTransition, SceneUpdateContext } from "./scene";
import { NO_TRANSITION } from "./scene";

interface MenuSceneOptions {
  bounds: Size;
  bestScores: Record<GameId, number>;
  render: (view: MenuView) => void;
}

interface MenuCard {
  id: `menu:${GameId}`;
  gameId: GameId;
  title: string;
  description: string;
  rect: Rect;
}

export class MenuScene implements Scene {
  readonly id = "menu";
  private readonly cards: MenuCard[];

  constructor(private readonly options: MenuSceneOptions) {
    const cardWidth = 340;
    const cardHeight = 240;
    const gap = 40;
    const startX = (options.bounds.width - cardWidth * 2 - gap) / 2;
    const y = 190;

    this.cards = [
      {
        id: "menu:snake",
        gameId: "snake",
        title: "Snake",
        description: "Move from the center joystick.",
        rect: { x: startX, y, width: cardWidth, height: cardHeight },
      },
      {
        id: "menu:fruit-slice",
        gameId: "fruit-slice",
        title: "Fruit Slice",
        description: "Swipe through fruit, avoid bombs.",
        rect: { x: startX + cardWidth + gap, y, width: cardWidth, height: cardHeight },
      },
    ];
  }

  hitTest(point: Point | null): string | null {
    if (!point) {
      return null;
    }

    return this.cards.find((card) => containsPoint(card.rect, point))?.id ?? null;
  }

  update(context: SceneUpdateContext): SceneTransition {
    const clickedCard = this.cards.find((card) => card.id === context.input.click?.id);
    return clickedCard ? { type: "switch", scene: clickedCard.gameId } : NO_TRANSITION;
  }

  render(context: SceneRenderContext): void {
    this.options.render({
      cards: this.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        bestScore: this.options.bestScores[card.gameId],
        rect: card.rect,
        hovered: context.input.hover.targetId === card.id,
      })),
    });
  }
}
