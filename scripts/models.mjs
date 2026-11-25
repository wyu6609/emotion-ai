import { cp, mkdir, readFile } from "node:fs/promises";

const source = new URL("../node_modules/@vladmandic/face-api/model/", import.meta.url);
const output = new URL("../public/models/", import.meta.url);
await mkdir(output, { recursive: true });
for (const model of ["tiny_face_detector", "face_landmark_68_tiny", "face_expression"]) {
  const manifest = model + "_model-weights_manifest.json";
  const groups = JSON.parse(await readFile(new URL(manifest, source), "utf8"));
  for (const file of [manifest, ...groups.flatMap(group => group.paths)]) {
    await cp(new URL(file, source), new URL(file, output));
  }
}
