import { useCallback, useEffect, useRef, useState } from "react";

export function stopTracks(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

export function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission denied. Allow access in your browser and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Camera unavailable. Connect a camera or select another device.";
  return "Camera could not start. Check whether another application is using it.";
}

export function useCamera() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const supported = Boolean(navigator.mediaDevices?.getUserMedia);
  const release = useCallback(() => {
    generation.current++;
    stopTracks(stream.current);
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  const stop = useCallback(() => {
    release();
    setActive(false);
    setStarting(false);
  }, [release]);

  useEffect(() => release, [release]);

  const start = async (deviceId: string) => {
    stop();
    setError("");
    if (!supported) return;
    const request = generation.current;
    setStarting(true);
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        width: { ideal: 640 }, height: { ideal: 480 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
      } });
      if (request !== generation.current || !video.current) {
        stopTracks(next);
        return;
      }
      stream.current = next;
      next.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (request !== generation.current) return;
        stop();
        setError("Camera disconnected. Reconnect it or select another device.");
      }, { once: true });
      video.current.srcObject = next;
      await video.current.play();
      if (request !== generation.current) return;
      setActive(true);
      void navigator.mediaDevices.enumerateDevices().then(list => {
        if (request === generation.current) setDevices(list.filter(device => device.kind === "videoinput"));
      }).catch(() => {});
    } catch (failure) {
      if (request !== generation.current) return;
      stop();
      setError(cameraError(failure));
    } finally {
      if (request === generation.current) setStarting(false);
    }
  };
  return { video, active, starting, error, devices, supported, start, stop };
}
