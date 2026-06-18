import type { ClickEvent, HandInputState, Point, SwipeSample, TrackedPoint3D } from "../domain/types";
import { pointFromNormalized, type Size } from "../domain/geometry";

export interface HandInputOptions {
  canvasSize: Size;
  hoverClickMs: number;
  pokeDepthDelta: number;
  clickAnimationMs: number;
  maxTrailAgeMs: number;
}

export interface HandInputUpdate {
  timestampMs: number;
  trackingPoint: TrackedPoint3D | null;
  hoverTargetId: string | null;
}

export class HandInputController {
  private readonly options: HandInputOptions;
  private trail: SwipeSample[] = [];
  private previousPoint: TrackedPoint3D | null = null;
  private hoverTargetId: string | null = null;
  private hoverStartedAt: number | null = null;
  private consumedHoverTargetId: string | null = null;
  private clickAnimationStartedAt: number | null = null;
  private clickAnimationPoint: Point | null = null;

  constructor(options: HandInputOptions) {
    this.options = options;
  }

  update(update: HandInputUpdate): HandInputState {
    if (!update.trackingPoint) {
      this.trail = [];
      this.previousPoint = null;
      this.hoverTargetId = null;
      this.hoverStartedAt = null;
      this.consumedHoverTargetId = null;
      return this.state(null, null, null, update.timestampMs);
    }

    const pointer = pointFromNormalized(update.trackingPoint, this.options.canvasSize);
    this.updateTrail(pointer, update.timestampMs);
    const click = this.detectClick(update, pointer);
    this.previousPoint = { ...update.trackingPoint };

    if (click) {
      this.clickAnimationStartedAt = update.timestampMs;
      this.clickAnimationPoint = { ...click.point };
    }

    return this.state(pointer, update.trackingPoint, click, update.timestampMs);
  }

  private updateTrail(pointer: Point, timestampMs: number): void {
    this.trail = [...this.trail, { point: { ...pointer }, timestampMs }].filter(
      (sample) => timestampMs - sample.timestampMs <= this.options.maxTrailAgeMs,
    );
  }

  private detectClick(update: HandInputUpdate, pointer: Point): ClickEvent | null {
    const pokeClick = this.detectPokeClick(update, pointer);
    if (pokeClick) {
      this.resetHover(update.hoverTargetId, update.timestampMs);
      return pokeClick;
    }

    return this.detectHoverClick(update, pointer);
  }

  private detectPokeClick(update: HandInputUpdate, pointer: Point): ClickEvent | null {
    if (!this.previousPoint || !update.hoverTargetId || !update.trackingPoint) {
      return null;
    }

    const zDelta = this.previousPoint.z - update.trackingPoint.z;
    if (zDelta < this.options.pokeDepthDelta) {
      return null;
    }

    return {
      id: update.hoverTargetId,
      point: { ...pointer },
      source: "poke",
    };
  }

  private detectHoverClick(update: HandInputUpdate, pointer: Point): ClickEvent | null {
    if (!update.hoverTargetId) {
      this.resetHover(null, update.timestampMs);
      return null;
    }

    if (this.hoverTargetId !== update.hoverTargetId) {
      this.resetHover(update.hoverTargetId, update.timestampMs);
      return null;
    }

    if (this.consumedHoverTargetId === update.hoverTargetId) {
      return null;
    }

    const startedAt = this.hoverStartedAt ?? update.timestampMs;
    if (update.timestampMs - startedAt < this.options.hoverClickMs) {
      return null;
    }

    this.consumedHoverTargetId = update.hoverTargetId;
    return {
      id: update.hoverTargetId,
      point: { ...pointer },
      source: "hover",
    };
  }

  private resetHover(targetId: string | null, timestampMs: number): void {
    this.hoverTargetId = targetId;
    this.hoverStartedAt = targetId ? timestampMs : null;
    this.consumedHoverTargetId = null;
  }

  private state(
    pointer: Point | null,
    normalizedPointer: TrackedPoint3D | null,
    click: ClickEvent | null,
    timestampMs: number,
  ): HandInputState {
    return {
      pointer,
      normalizedPointer: normalizedPointer ? { ...normalizedPointer } : null,
      pointerVisible: Boolean(pointer),
      trail: this.trail.map((sample) => ({ point: { ...sample.point }, timestampMs: sample.timestampMs })),
      click,
      hover: this.hoverState(timestampMs),
      clickAnimation: this.clickAnimationState(timestampMs),
    };
  }

  private hoverState(timestampMs: number): HandInputState["hover"] {
    if (!this.hoverTargetId || this.hoverStartedAt === null) {
      return { targetId: null, progress: 0 };
    }

    return {
      targetId: this.hoverTargetId,
      progress: Math.min(1, (timestampMs - this.hoverStartedAt) / this.options.hoverClickMs),
    };
  }

  private clickAnimationState(timestampMs: number): HandInputState["clickAnimation"] {
    if (this.clickAnimationStartedAt === null || !this.clickAnimationPoint) {
      return { active: false, point: null, progress: 0 };
    }

    const progress = (timestampMs - this.clickAnimationStartedAt) / this.options.clickAnimationMs;
    if (progress >= 1) {
      this.clickAnimationStartedAt = null;
      this.clickAnimationPoint = null;
      return { active: false, point: null, progress: 0 };
    }

    return {
      active: true,
      point: { ...this.clickAnimationPoint },
      progress: Math.max(0, progress),
    };
  }
}
