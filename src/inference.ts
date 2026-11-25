import { useEffect, useRef, useState, type RefObject } from "react";
import { loadModel, type Face } from "./model";
import { smooth } from "./metrics";

export interface Reading {
  face: Face | null;
  latency: number;
  fps: number;
  time: number;
}
type Status = "Standby" | "Loading" | "Ready" | "Unavailable";

export function useInference(video: RefObject<HTMLVideoElement | null>, active: boolean, attempt: number) {
  const [status, setStatus] = useState<Status>("Standby");
  const [reading, setReading] = useState<Reading | null>(null);
  const inFlight = useRef<Promise<Face | null> | null>(null);

  useEffect(() => {
    setReading(null);
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous: Face | null = null;
    let lastStart = 0;
    setStatus("Loading");

    void loadModel().then(run => {
      if (cancelled) return;
      setStatus("Ready");
      const tick = async () => {
        if (cancelled) return;
        const element = video.current;
        const started = performance.now();
        if (!element || element.readyState < 2 || inFlight.current) {
          timer = setTimeout(tick, 120);
          return;
        }
        try {
          const pending = run(element);
          inFlight.current = pending;
          const face = await pending;
          if (cancelled) return;
          previous = face && { ...face, scores: smooth(previous?.scores ?? null, face.scores) ?? face.scores };
          const finished = performance.now();
          setReading({
            face: previous,
            time: finished,
            latency: finished - started,
            fps: lastStart ? 1000 / (started - lastStart) : 0,
          });
          lastStart = started;
          timer = setTimeout(tick, Math.max(16, 125 - (finished - started)));
        } catch {
          if (!cancelled) {
            setReading(null);
            setStatus("Unavailable");
          }
        } finally {
          inFlight.current = null;
        }
      };
      void tick();
    }).catch(() => {
      if (!cancelled) setStatus("Unavailable");
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [video, active, attempt]);
  return { status: active ? status : "Standby", reading: active ? reading : null };
}
