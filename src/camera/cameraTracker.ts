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
      this.latestFrame = { point: null, status: "loading", errorMessage: null };
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

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
      this.latestFrame = { point: null, status: "searching", errorMessage: null };
    } catch (error) {
      this.latestFrame = {
        point: null,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unable to start camera tracking",
      };
    }
  }

  detect(timestampMs: number): TrackingFrame {
    if (!this.landmarker || this.latestFrame.status === "error") {
      return this.latestFrame;
    }

    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return { point: null, status: "searching", errorMessage: null };
    }

    if (this.video.currentTime === this.lastVideoTime) {
      return this.latestFrame;
    }

    this.lastVideoTime = this.video.currentTime;
    const result = this.landmarker.detectForVideo(this.video, timestampMs);
    const point = extractIndexFingerTip(result);

    this.latestFrame = {
      point,
      status: point ? "tracking" : "searching",
      errorMessage: null,
    };

    return this.latestFrame;
  }

  dispose(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
  }
}
