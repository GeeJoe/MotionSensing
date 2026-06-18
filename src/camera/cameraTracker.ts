import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { Point, TrackingFrame } from "../domain/types";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

interface LandmarkLike {
  x: number;
  y: number;
}

type LandmarkResultLike = Pick<HandLandmarkerResult, "landmarks"> | { landmarks: LandmarkLike[][] };
type HandLandmarkerOptions = Parameters<typeof HandLandmarker.createFromOptions>[1];
type LandmarkerDelegate = NonNullable<NonNullable<HandLandmarkerOptions["baseOptions"]>["delegate"]>;
type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

export function extractIndexFingerTip(result: LandmarkResultLike): Point | null {
  const firstHand = result.landmarks[0] as LandmarkLike[] | undefined;
  const indexTip = firstHand?.[8];

  if (!indexTip) {
    return null;
  }

  return { x: indexTip.x, y: indexTip.y };
}

export class CameraTracker {
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private lastVideoTime = -1;
  private latestFrame: TrackingFrame = {
    point: null,
    status: "loading",
    errorMessage: null,
  };

  constructor(private readonly video: HTMLVideoElement) {}

  async start(): Promise<void> {
    try {
      this.setNoPointFrame("loading");
      this.landmarker = await this.createLandmarker();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      this.video.srcObject = this.stream;
      await this.video.play();
      this.setNoPointFrame("searching");
    } catch (error) {
      this.releaseResources();
      this.setNoPointFrame("error", error instanceof Error ? error.message : "Unable to start camera tracking");
    }
  }

  detect(timestampMs: number): TrackingFrame {
    if (!this.landmarker || this.latestFrame.status === "error") {
      return this.latestFrame;
    }

    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.lastVideoTime = -1;
      return this.setNoPointFrame("searching");
    }

    if (this.video.currentTime === this.lastVideoTime) {
      return this.latestFrame;
    }

    this.lastVideoTime = this.video.currentTime;
    let point: Point | null = null;

    try {
      const result = this.landmarker.detectForVideo(this.video, timestampMs);
      point = extractIndexFingerTip(result);
    } catch (error) {
      return this.setNoPointFrame("error", error instanceof Error ? error.message : "Unable to detect hand position");
    }

    this.latestFrame = {
      point,
      status: point ? "tracking" : "searching",
      errorMessage: null,
    };

    return this.latestFrame;
  }

  dispose(): void {
    this.releaseResources();
    this.setNoPointFrame("searching");
  }

  private releaseResources(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.lastVideoTime = -1;
  }

  private async createLandmarker(): Promise<HandLandmarker> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    try {
      return await this.createLandmarkerWithDelegate(vision, "GPU");
    } catch {
      return this.createLandmarkerWithDelegate(vision, "CPU");
    }
  }

  private createLandmarkerWithDelegate(vision: VisionFileset, delegate: LandmarkerDelegate): Promise<HandLandmarker> {
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate,
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  private setNoPointFrame(status: TrackingFrame["status"], errorMessage: string | null = null): TrackingFrame {
    this.latestFrame = {
      point: null,
      status,
      errorMessage,
    };

    return this.latestFrame;
  }
}
