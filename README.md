# EmotionAI

EmotionAI demonstrates real-time expression classification from a voluntary webcam session. It runs inference on the device, draws face landmarks and a bounding box, and displays seven model scores with a rolling 60-second chart and session averages.

## Run locally

Use Node.js 22 and a modern browser.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Click **Start camera** and grant browser permission. Open camera settings to control mirroring, landmarks, and the bounding box. Toggle chart series using their labels.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

## Architecture

- React and strict TypeScript manage the dashboard. CSS handles responsive layout, Lucide supplies icons, and Recharts renders analytics.
- The camera hook owns permission, stream cleanup, device selection, and disconnection handling.
- The inference hook lazily loads the FaceAPI TensorFlow.js runtime and schedules one pass at a time, targeting about eight readings per second. The model adapter loads only the tiny face detector, tiny 68-point landmark model, and expression classifier. Build and development scripts copy their assets from the pinned package to the site's own origin.
- The overlay maps the source frame to the fitted video rectangle. It applies mirroring to landmark and box coordinates.
- Prediction smoothing resets when a frame has no face. Chart samples and session aggregates live in memory. Starting a new camera session or resetting clears session history.

## Privacy and limitations

The app requests video after an explicit click and does not request audio. It has no backend, user tracking, identity recognition, frame uploads, or image storage. Camera access requires a secure context such as HTTPS or localhost.

EmotionAI classifies visible facial expressions using machine learning. These scores represent model predictions and do not establish a person's actual emotions, intentions, or psychological state. Lighting, occlusion, camera angle, demographic bias, training data coverage, and ambiguity can affect results. Use it for personal experimentation and education. Avoid using it for surveillance, employment, medical assessment, or other consequential decisions.

## Model attribution

The pinned [FaceAPI distribution](https://github.com/vladmandic/face-api/tree/v1.7.15) is MIT licensed and bundles TensorFlow.js (Apache 2.0). FaceAPI builds on [face-api.js](https://github.com/justadudewhohacks/face-api.js). The published FaceAPI repository is archived. This version was selected for its single-face pipeline and seven pretrained categories. A future model migration should start in `src/model.ts` and preserve the visible-expression score semantics.

## GitHub Pages

The Vite base path is `/emotion-ai/`. In the GitHub repository, select **Settings > Pages > Build and deployment > Source > GitHub Actions**. The workflow checks lint, types, tests, and production build, then publishes on pushes to `main`. Commit the npm-generated lockfile once dependencies are resolved locally so CI uses the same transitive dependencies. If the lockfile is absent, the workflow bootstraps it before running `npm ci`.

After deployment, use the browser network panel to verify the app and the model manifests and shards load from the Pages origin. Test permission, stop, device switching, and responsive layout on the actual target devices.
