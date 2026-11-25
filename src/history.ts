import { useCallback, useEffect, useRef, useState } from "react";
import type { Reading } from "./inference";
import { retain, scoreMap, type Sample } from "./metrics";

export function useHistory(reading: Reading | null, active: boolean) {
  const origin = useRef(performance.now());
  const totals = useRef({ scores: scoreMap(() => 0), count: 0 });
  const consumed = useRef<Reading | null>(null);
  const [duration, setDuration] = useState(0);
  const [samples, setSamples] = useState<Sample[]>([]);
  const reset = useCallback(() => {
    origin.current = performance.now();
    totals.current = { scores: scoreMap(() => 0), count: 0 };
    setSamples([]);
    setDuration(0);
  }, []);

  useEffect(() => {
    if (!active) return;
    reset();
    const timer = setInterval(() => {
      const time = (performance.now() - origin.current) / 1000;
      setDuration(time);
      setSamples(old => old[0]?.time < time - 60 ? old.filter(sample => sample.time >= time - 60) : old);
    }, 500);
    return () => clearInterval(timer);
  }, [active, reset]);

  useEffect(() => {
    if (!active || !reading || consumed.current === reading || reading.time < origin.current) return;
    consumed.current = reading;
    const scores = reading.face?.scores ?? null;
    if (scores) totals.current = {
      count: totals.current.count + 1,
      scores: scoreMap(key => totals.current.scores[key] + scores[key]),
    };
    const sample = { time: (reading.time - origin.current) / 1000, scores };
    setSamples(old => retain(old, sample));
  }, [reading, active]);

  const average = totals.current.count ? scoreMap(key => totals.current.scores[key] / totals.current.count) : null;
  return { samples, duration, average, reset };
}
