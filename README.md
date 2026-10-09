# ProofPixel AI

ProofPixel AI is a digital-authenticity and media-forensics platform prototype built for hackathon presentation.

## Features
- Premium landing page and navigation
- Dashboard with sample investigations and reports
- Image, video, certificate, URL, and message analysis flows
- Certificate warning-pattern review for explicit demo/fake markers, missing text-field patterns, and insecure verification links; it does not claim to prove authenticity
- Local image visual diagnostics and three-point video frame sampling, with brightness, contrast, clipping, tonal-range, and transparency measurements
- Searchable and filterable investigation history with CSV export for the visible results
- Backend-persisted helpful/not-helpful feedback for scan results, scoped to the signed-in account
- Clear result context explaining that original, fake/manipulated, and AI-generated labels are not confirmed by the configured heuristic checks
- Account-scoped JSON workspace backup with profile, investigation history, and reports (media files are excluded)
- Sign-in-first workspace with protected application routes
- On-demand Instagram/Facebook post checking through a minimal-permission Chrome extension
- Explainable social-scam triage with protective actions and a privacy-safe downloadable summary
- Scam Rescue Mode with a tailored, session-only recovery checklist and copyable safe summary
- Real SHA-256 hashing endpoint
- JSON-based backend API with health and config routes
- Demo-data mode with transparent labeling for presentation

## Run locally

1. Install dependencies:
   npm install
2. Start the app:
   npm run dev
   The development command creates a private `.env` with a random `JWT_SECRET` on first run and reuses it on restarts.
3. Open the frontend at http://localhost:5173
4. Backend API is available at http://localhost:3001; verify it at http://localhost:3001/api/health
5. Sign in with the demo account: `demo@proofpixel.ai` / `demo123`

## Deploy to Render

This repository includes a Render Blueprint in `render.yaml`. It deploys the built React app and Express API together as one web service and mounts SQLite on a persistent disk.

1. Push this repository to GitHub.
2. In Render, choose **New** → **Blueprint**, select the repository, and apply the `render.yaml` configuration.
3. Wait for the build and health check to finish, then open the Render service URL and sign in.

Render generates a unique `JWT_SECRET` for the service. The SQLite database is stored at `/var/data/proofpixel.db` on the mounted persistent disk, so it survives service restarts and deploys. Production mode does not seed the public demo administrator account; create your own account using the **Create an account** link. The Blueprint uses a paid Starter web service because Render persistent disks require a paid instance. Keep the disk attached; replacing or deleting it can remove stored user data. Uploaded media is not persisted by this app.

For deployments where the web frontend is hosted on a different origin, set `CORS_ORIGIN` to that exact frontend origin (for example, `https://proofpixel.example.com`). The default deployment serves the API and frontend from one origin and does not enable cross-origin API access.

## Check Instagram/Facebook posts

1. Start ProofPixel with `npm run dev` and sign in at http://localhost:5173.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select this project's `extension` folder.
3. On Instagram or Facebook, select the post text or a link you want to review, then click the ProofPixel extension and choose **Review selected content**.
4. ProofPixel opens the social safety tool with only your selection. Review the result before acting.

The extension requires a click to run and uses the browser's temporary active-tab permission. It does not monitor pages in the background, access private messages, or send content anywhere except the ProofPixel app URL configured in `extension/popup.js` (localhost by default). Its text and URL checks are basic heuristics, not a guarantee that a post, person, or link is safe.

Social Scam Triage produces an explainable 0–100 indicator score from transparent text and link heuristics, with specific protective actions. Its downloadable summary omits the original post text and full URL. It does not query Instagram/Facebook or external threat-intelligence services, and the score is not a probability or a factual verdict.

Every scan result explicitly states whether originality, fakery/manipulation, or AI generation was confirmed. The current checks do not confirm any of these: image/video AI detectors and external issuer/source verification are not configured.

Scam Rescue Mode adds response steps based on the detected signal categories. Checklist progress stays in the current page session only and is not submitted to the backend. The copyable/downloadable summary excludes the original post text and full URL.

## Try certificate OCR

Use the clearly labeled [sample certificate image](./examples/sample-certificate.png) to test OCR and the certificate text-field review. It is fictional demo content, not a real credential or institution.

## Production build

npm run build

## Testing

npm run test

## Environment

Copy `.env.example` to `.env` and customize values before plugging in external services. The API refuses to start unless `JWT_SECRET` is set to at least 32 bytes; never commit `.env` or share the secret. SQLite stores its database in `server/proofpixel.db` by default; set `SQLITE_DB_PATH` to a persistent location for deployments. Protect that file and its backups with the operating-system permissions appropriate for your deployment. The database uses SQLite journal, locking, foreign-key, and secure-delete settings, but SQLite does not encrypt database files at rest.

## Important limitation

This project uses demo-safe logic and sample data to showcase the full workflow without fabricating real forensic conclusions. When external AI or registry integrations are configured, update the backend to use those trusted services carefully.
