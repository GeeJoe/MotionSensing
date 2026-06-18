import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackingFrame } from "../domain/types";
import { CameraTracker, extractIndexFingerTip } from "./cameraTracker";

const mediaPipeMocks = vi.hoisted(() => ({
  createFromOptions: vi.fn(),
  forVisionTasks: vi.fn(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: mediaPipeMocks.forVisionTasks,
  },
  HandLandmarker: {
    createFromOptions: mediaPipeMocks.createFromOptions,
  },
}));

const HAVE_CURRENT_DATA = 2;

interface FakeVideo {
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
  readyState: number;
  srcObject: MediaStream | null;
}

interface TrackerInternals {
  landmarker: {
    close: () => void;
    detectForVideo: (video: HTMLVideoElement, timestampMs: number) => { landmarks: Array<Array<{ x: number; y: number }>> };
  } | null;
  lastVideoTime: number;
  latestFrame: TrackingFrame;
}

function createVideo(overrides: Partial<FakeVideo> = {}): FakeVideo {
  return {
    currentTime: 1,
    play: vi.fn().mockResolvedValue(undefined),
    readyState: HAVE_CURRENT_DATA,
    srcObject: null,
    ...overrides,
  };
}

function createStream(...tracks: Array<{ stop: () => void }>): MediaStream {
  return {
    getTracks: () => tracks,
  } as unknown as MediaStream;
}

function setGetUserMedia(getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia,
      },
    },
  });
}

beforeEach(() => {
  Object.defineProperty(globalThis, "HTMLMediaElement", {
    configurable: true,
    value: {
      HAVE_CURRENT_DATA,
    },
  });

  mediaPipeMocks.createFromOptions.mockReset();
  mediaPipeMocks.forVisionTasks.mockReset();
  mediaPipeMocks.forVisionTasks.mockResolvedValue({});
});

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

  it("returns null when the first detected hand is incomplete", () => {
    const incompleteHand = Array.from({ length: 8 }, (_, index) => ({
      x: index / 100,
      y: index / 200,
    }));

    expect(extractIndexFingerTip({ landmarks: [incompleteHand] })).toBeNull();
  });
});

describe("CameraTracker", () => {
  it("falls back to CPU hand tracking when GPU initialization fails", async () => {
    const getUserMedia = vi.fn().mockResolvedValue(createStream());
    const video = createVideo();
    const detectForVideo = vi.fn().mockReturnValue({ landmarks: [] });

    mediaPipeMocks.createFromOptions
      .mockRejectedValueOnce(new Error("GPU unavailable"))
      .mockResolvedValueOnce({
        close: vi.fn(),
        detectForVideo,
      });
    setGetUserMedia(getUserMedia);

    const tracker = new CameraTracker(video as unknown as HTMLVideoElement);

    await tracker.start();

    expect(mediaPipeMocks.createFromOptions).toHaveBeenCalledTimes(2);
    expect(mediaPipeMocks.createFromOptions).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        baseOptions: expect.objectContaining({
          delegate: "GPU",
        }),
      }),
    );
    expect(mediaPipeMocks.createFromOptions).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        baseOptions: expect.objectContaining({
          delegate: "CPU",
        }),
      }),
    );
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(tracker.detect(100)).toEqual({
      point: null,
      status: "searching",
      errorMessage: null,
    });
  });

  it("closes a created landmarker when camera access is rejected", async () => {
    const close = vi.fn();
    const getUserMedia = vi.fn().mockRejectedValue(new Error("Permission denied"));
    const video = createVideo();

    mediaPipeMocks.createFromOptions.mockResolvedValue({
      close,
      detectForVideo: vi.fn(),
    });
    setGetUserMedia(getUserMedia);

    const tracker = new CameraTracker(video as unknown as HTMLVideoElement);

    await tracker.start();

    expect(close).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
  });

  it("stops the camera stream and clears the video when playback fails", async () => {
    const close = vi.fn();
    const stop = vi.fn();
    const stream = createStream({ stop });
    const video = createVideo({
      play: vi.fn().mockRejectedValue(new Error("Playback blocked")),
    });

    mediaPipeMocks.createFromOptions.mockResolvedValue({
      close,
      detectForVideo: vi.fn(),
    });
    setGetUserMedia(vi.fn().mockResolvedValue(stream));

    const tracker = new CameraTracker(video as unknown as HTMLVideoElement);

    await tracker.start();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
  });

  it("clears stale tracking state while the video is not ready", () => {
    const detectForVideo = vi.fn().mockReturnValue({ landmarks: [] });
    const video = createVideo({ currentTime: 7, readyState: 0 });
    const tracker = new CameraTracker(video as unknown as HTMLVideoElement);
    const internals = tracker as unknown as TrackerInternals;

    internals.landmarker = {
      close: vi.fn(),
      detectForVideo,
    };
    internals.lastVideoTime = 7;
    internals.latestFrame = {
      point: { x: 0.4, y: 0.6 },
      status: "tracking",
      errorMessage: null,
    };

    expect(tracker.detect(100)).toEqual({
      point: null,
      status: "searching",
      errorMessage: null,
    });

    video.readyState = HAVE_CURRENT_DATA;

    expect(tracker.detect(116)).toEqual({
      point: null,
      status: "searching",
      errorMessage: null,
    });
    expect(detectForVideo).toHaveBeenCalledTimes(1);
  });

  it("returns an error frame when hand detection throws", () => {
    const video = createVideo();
    const tracker = new CameraTracker(video as unknown as HTMLVideoElement);
    const internals = tracker as unknown as TrackerInternals;

    internals.landmarker = {
      close: vi.fn(),
      detectForVideo: vi.fn(() => {
        throw new Error("Detector failed");
      }),
    };

    expect(tracker.detect(100)).toEqual({
      point: null,
      status: "error",
      errorMessage: "Detector failed",
    });
  });

  it("does not return a stale tracking point after dispose", () => {
    const video = createVideo();
    const tracker = new CameraTracker(video as unknown as HTMLVideoElement);
    const internals = tracker as unknown as TrackerInternals;

    internals.landmarker = {
      close: vi.fn(),
      detectForVideo: vi.fn(),
    };
    internals.lastVideoTime = 4;
    internals.latestFrame = {
      point: { x: 0.2, y: 0.3 },
      status: "tracking",
      errorMessage: null,
    };

    tracker.dispose();

    expect(internals.lastVideoTime).toBe(-1);
    expect(tracker.detect(100)).toEqual({
      point: null,
      status: "searching",
      errorMessage: null,
    });
  });
});
