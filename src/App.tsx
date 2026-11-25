import { useState } from "react";
import { Activity, Camera, Github, ScanFace, Settings2, ShieldCheck, Square } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useCamera } from "./camera";
import { useInference } from "./inference";
import { useHistory } from "./history";
import { Overlay } from "./Overlay";
import { dominant, expressions, formatTime, labels, percent, type Expression } from "./metrics";

export default function App() {
  const camera = useCamera();
  const [device, setDevice] = useState("");
  const [mirror, setMirror] = useState(true);
  const [box, setBox] = useState(true);
  const [points, setPoints] = useState(true);
  const [settings, setSettings] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState<Expression[]>(labels);
  const { status, reading } = useInference(camera.video, camera.active, attempt);
  const history = useHistory(reading, camera.active);
  const face = reading?.face ?? null;
  const current = face ? dominant(face.scores) : null;
  const cameraStatus = camera.active ? "Camera live" : camera.starting ? "Connecting" : "Camera off";
  const faceStatus = face ? "Detected" : reading ? "No face detected" : "Awaiting input";
  const empty = !camera.supported ? "Use HTTPS or localhost in a browser with camera support."
    : camera.error || (camera.starting ? "Waiting for camera permission…" : "Start the camera to begin expression analysis.");
  const data = history.samples.map(sample => ({
    time: sample.time,
    ...Object.fromEntries(labels.map(key => [key, sample.scores ? sample.scores[key] * 100 : null])),
  }));
  return <>
    <header>
      <div className="shell top">
        <a className="brand" href={import.meta.env.BASE_URL}><ScanFace size={23} /> EmotionAI</a>
        <div className="topActions">
          <span className="status"><i className={camera.active ? "live" : ""} />{cameraStatus}</span>
          <span className="status">Model {status.toLowerCase()}</span>
          <button className="icon" aria-label="Camera settings" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 size={18} /></button>
        </div>
      </div>
    </header>
    <main className="shell">
      <div className="intro"><h1>Expression Lab</h1><p>Explore facial expression classification in real time.</p></div>
      {settings && <section className="card settings" aria-label="Camera settings">
        <label><input type="checkbox" checked={mirror} onChange={event => setMirror(event.target.checked)} /> Mirror preview</label>
        <label><input type="checkbox" checked={box} onChange={event => setBox(event.target.checked)} /> Bounding box</label>
        <label><input type="checkbox" checked={points} onChange={event => setPoints(event.target.checked)} /> Facial landmarks</label>
      </section>}
      <div className="columns">
        <section className="card">
          <div className="heading"><h2><Camera size={17} /> Camera feed</h2><span className="status">{cameraStatus}</span></div>
          <div className="preview">
            <video aria-label="Live camera preview" ref={camera.video} muted playsInline className={mirror ? "mirrored" : ""} />
            {camera.active && <Overlay video={camera.video} face={face} mirror={mirror} box={box} points={points} />}
            {!camera.active && <div className="empty"><div className="cameraIcon"><Camera size={30} /></div><strong>{camera.starting ? "Connecting camera" : "Camera offline"}</strong><p role="status">{empty}</p></div>}
            {camera.active && !face && <div className="videoBadge" role="status">{status === "Loading" ? "Loading expression model…" : status === "Unavailable" ? "Model unavailable" : faceStatus}</div>}
            {current && <div className="videoBadge" style={{color: expressions[current][1]}}>{expressions[current][0]} · {percent(face!.scores[current])}</div>}
          </div>
          <div className="controls">
            {camera.active || camera.starting
              ? <button onClick={camera.stop}><Square size={15} /> Stop camera</button>
              : <button className="primary" disabled={!camera.supported} onClick={() => void camera.start(device)}><Camera size={16} /> Start camera</button>}
            <label><span className="srOnly">Camera device</span><select value={device} disabled={camera.starting} onChange={event => {
              const id = event.target.value;
              setDevice(id);
              if (camera.active) void camera.start(id);
            }}><option value="">Default camera</option>{camera.devices.map((item, index) =>
              <option key={item.deviceId} value={item.deviceId}>{item.label || "Camera " + (index + 1)}</option>)}</select></label>
            {status === "Unavailable" && <button onClick={() => setAttempt(attempt + 1)}>Retry model</button>}
          </div>
        </section>
        <section className="card">
          <div className="heading"><h2><Activity size={17} /> Expression scores</h2><span className="status">Live inference</span></div>
          <div className="scores">
            <div className="dominant"><small>DOMINANT EXPRESSION</small><strong style={{color: current ? expressions[current][1] : undefined}}>{current ? expressions[current][0] : "Awaiting a face"}</strong></div>
            {labels.map(key => <div className="score" key={key}>
              <div><span><i style={{ background: expressions[key][1] }} />{expressions[key][0]}</span><span>{face ? percent(face.scores[key]) : "···"}</span></div>
              <div className="track"><div style={{ width: face ? percent(face.scores[key]) : 0, background: expressions[key][1] }} /></div>
            </div>)}
            <dl className="metrics">
              <div><dt>Inference rate</dt><dd>{reading ? reading.fps.toFixed(1) + " FPS" : "···"}</dd></div>
              <div><dt>Latency</dt><dd>{reading ? Math.round(reading.latency) + " ms" : "···"}</dd></div>
              <div><dt>Face</dt><dd>{face ? percent(face.confidence) + " detected" : faceStatus}</dd></div>
            </dl>
          </div>
        </section>
      </div>
      <section className="card history">
        <div className="heading"><h2><Activity size={17} /> Expression history</h2><button onClick={history.reset}>Reset session</button></div>
        <div className="historyBody">
          <div className="historyMeta"><span>Last 60 seconds</span><span>Session {formatTime(history.duration)}</span></div>
          <div className="chart" aria-label="Expression model scores over time">
            {data.length < 2 ? <div className="chartEmpty">Session readings will appear here.</div> :
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{top: 12, right: 16, bottom: 6, left: 0}}>
                  <CartesianGrid stroke="#25313b" vertical={false} />
                  <XAxis dataKey="time" type="number" domain={[Math.max(0, history.duration - 60), Math.max(60, history.duration, data.at(-1)?.time ?? 0)]} tickFormatter={value => Math.round(value) + "s"} stroke="#91a2b0" />
                  <YAxis domain={[0, 100]} tickFormatter={value => value + "%"} stroke="#91a2b0" width={52} />
                  <Tooltip contentStyle={{ background: "#121d25", borderColor: "#2d414f" }} labelFormatter={value => Number(value).toFixed(1) + "s"} formatter={value => value == null ? "" : Math.round(Number(value)) + "%"} />
                  {visible.map(key => <Line type="monotone" key={key} dataKey={key} name={expressions[key][0]} stroke={expressions[key][1]} isAnimationActive={false} dot={false} strokeWidth={2} />)}
                </LineChart>
              </ResponsiveContainer>}
          </div>
          <div className="filters" aria-label="Chart series and session averages">{labels.map(key => <button key={key} aria-pressed={visible.includes(key)} onClick={() => setVisible(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key])}><i style={{background: expressions[key][1]}} />{expressions[key][0]}{history.average ? " " + percent(history.average[key]) : ""}</button>)}</div>
        </div>
      </section>
      <footer>
        <div><span><ShieldCheck size={16} /> Video stays on this device</span><span>FaceAPI · TensorFlow.js</span><a href="https://github.com/wyu6609/emotion-ai"><Github size={16} /> GitHub</a></div>
        <p>EmotionAI classifies visible facial expressions using machine learning. These scores represent model predictions and do not establish a person's actual emotions, intentions, or psychological state.</p>
      </footer>
    </main>
  </>;
}
