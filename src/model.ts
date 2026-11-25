import type { Scores } from "./metrics";

export interface Face {
  scores: Scores;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  points: ReadonlyArray<{ x: number; y: number }>;
}

export function retryable<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () => pending ??= load().catch(error => {
    pending = undefined;
    throw error;
  });
}

async function withLoadDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Expression model loading timed out.")), 20_000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

async function initializeModel() {
  const api = await import("@vladmandic/face-api");
  const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (appleMobile && !(await api.tf.setBackend("cpu"))) {
    throw new Error("The CPU inference backend could not be initialized.");
  }

  const path = import.meta.env.BASE_URL + "models";
  await Promise.all([
    api.nets.tinyFaceDetector.loadFromUri(path),
    api.nets.faceLandmark68TinyNet.loadFromUri(path),
    api.nets.faceExpressionNet.loadFromUri(path),
  ]);
  const detector = new api.TinyFaceDetectorOptions({ inputSize: appleMobile ? 160 : 224, scoreThreshold: 0.5 });
  return async (video: HTMLVideoElement): Promise<Face | null> => {
    const result = await api.detectSingleFace(video, detector).withFaceLandmarks(true).withFaceExpressions();
    return result ? {
      scores: result.expressions,
      box: result.detection.box,
      confidence: result.detection.score,
      points: result.landmarks.positions,
    } : null;
  };
}

export const loadModel = retryable(() => withLoadDeadline(initializeModel()));
