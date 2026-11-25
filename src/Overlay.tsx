import { useEffect, useRef, type RefObject } from "react";
import { overlayPoint } from "./metrics";
import type { Face } from "./model";

export function Overlay({ video, face, mirror, box, points }: {
  video: RefObject<HTMLVideoElement | null>;
  face: Face | null;
  mirror: boolean;
  box: boolean;
  points: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const source = video.current;
    const context = element?.getContext("2d");
    if (!element || !source || !context) return;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = element.clientWidth;
      const height = element.clientHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      if (!face || !source.videoWidth || !source.videoHeight) return;
      const scale = Math.min(width / source.videoWidth, height / source.videoHeight);
      const insetX = (width - source.videoWidth * scale) / 2;
      const insetY = (height - source.videoHeight * scale) / 2;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.strokeStyle = context.fillStyle = "#53e2aa";
      context.lineWidth = 2;
      const map = (x: number, y: number) => overlayPoint(x, y, scale, source.videoWidth * scale, mirror);
      if (box) {
        const bounds = face.box;
        const corner = map(mirror ? bounds.x + bounds.width : bounds.x, bounds.y);
        context.strokeRect(insetX + corner.x, insetY + corner.y, bounds.width * scale, bounds.height * scale);
      }
      if (points) {
        context.beginPath();
        for (const point of face.points) {
          const position = map(point.x, point.y);
          context.moveTo(insetX + position.x + 1.4, insetY + position.y);
          context.arc(insetX + position.x, insetY + position.y, 1.4, 0, 2 * Math.PI);
        }
        context.fill();
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => observer.disconnect();
  }, [video, face, mirror, box, points]);
  return <canvas ref={canvas} aria-hidden="true" />;
}
