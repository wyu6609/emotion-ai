export const expressions = {
  happy: ["Happy", "#53e2aa"],
  sad: ["Sad", "#79adff"],
  angry: ["Angry", "#ff8d90"],
  surprised: ["Surprised", "#ffd27e"],
  fearful: ["Fearful", "#c4a1fa"],
  disgusted: ["Disgusted", "#9dd184"],
  neutral: ["Neutral", "#a5b4c4"],
} as const;

export type Expression = keyof typeof expressions;
export type Scores = Record<Expression, number>;
export const labels = Object.keys(expressions) as Expression[];
export const scoreMap = (value: (key: Expression) => number) =>
  Object.fromEntries(labels.map(key => [key, value(key)])) as Scores;
export const percent = (score: number) => Math.round(score * 100) + "%";
export const dominant = (scores: Scores) =>
  labels.reduce((best, key) => scores[key] > scores[best] ? key : best);
export const smooth = (previous: Scores | null, current: Scores | null) =>
  previous && current ? scoreMap(key => previous[key] * 0.6 + current[key] * 0.4) : current;

export interface Sample { time: number; scores: Scores | null }
export const retain = (samples: Sample[], sample: Sample) =>
  [...samples.filter(old => old.time >= sample.time - 60), sample].slice(-610);

export const formatTime = (seconds: number) =>
  Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");

export function overlayPoint(x: number, y: number, scale: number, width: number, mirror: boolean) {
  return { x: mirror ? width - x * scale : x * scale, y: y * scale };
}
