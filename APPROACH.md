# APPROACH.md – Real-time Polling Application

## 1. Problem Approach

**Timeline (60-minute mindset):** The work was broken into: (1) backend API + WebSocket and in-memory store, (2) frontend UI with create/vote/results and charts, (3) Docker and docker-compose so everything runs in Docker Desktop, (4) CI/CD and docs.

**Priorities:**  
- **Docker first:** The requirement that the app must run entirely in Docker Desktop drove the design: multi-container (frontend + backend), no external DB (in-memory), and nginx in the frontend container to proxy `/api` and `/ws` so the app is reachable at a single URL on port 3000.  
- **Core features first:** Create poll (question + 2–4 options), list polls, vote, and live results.  
- **Then bonuses:** WebSocket for real-time updates and Recharts for bar/pie visualization.  
- **Stability:** Simple error handling (invalid poll data, voting on closed polls) and validation on both client and server.

## 2. Docker Architecture

**Why this structure:**  
- **Two containers:** Frontend (React build + nginx) and backend (Node/Express + WebSocket). This keeps frontend and API clearly separated and makes it easy to scale or replace either side later.  
- **Single host port 3000:** Only the frontend is exposed. Nginx serves the SPA and proxies `/api/` and `/ws` to the backend. Users and CI only need to use `http://localhost:3000`.  
- **No DB container:** In-memory store keeps the app self-contained and avoids external services; it fits the “everything in Docker Desktop” constraint and the “keep it simple” guideline.

**Dockerfiles:**  
- **Backend:** Single-stage `node:20-alpine`; install deps, copy `server.js`, run `node server.js`.  
- **Frontend:** Multi-stage: Node stage runs `npm run build`; final stage uses `nginx:alpine` to serve the built static files and a custom `nginx.conf` that proxies `/api/` and `/ws` to the backend service.

**Optimization:** Alpine base images for smaller builds; frontend build stage is discarded so the final image only contains nginx and static assets.

## 3. Technical Decisions

**Framework/language:**  
- **Backend:** Node.js with Express. Fast to implement, good fit for REST + WebSocket in one process, and no extra runtime in the image.  
- **Frontend:** React with Vite for fast dev and a small production build. Recharts was chosen for bar and pie charts with minimal setup.

**Structure:**  
- Backend: single `server.js` with routes, in-memory store, and WebSocket broadcast; validation and error responses for invalid payloads and closed polls.  
- Frontend: one main `App` with hooks for polls list and WebSocket; components for create form, poll cards, vote buttons, and results (list + charts).  
- Real-time: WebSocket server on `/ws`; after create/vote/close, backend broadcasts a message so all clients refetch polls/results, giving live updates without page refresh.

**Real-time:** WebSockets (bonus) instead of HTTP polling so results update as soon as someone votes.

## 4. CI/CD Implementation

**GitHub Actions (`.github/workflows/ci.yml`):**  
- **Trigger:** Push to `main`.  
- **Steps:** Checkout → `docker-compose build` → `docker-compose up -d` → wait for `http://localhost:3000/` to respond → run validation (health, create poll, get results) → `docker-compose down` (always, so containers are cleaned up).

**Validation:**  
- GET `/api/health` and check for `"status":"ok"`.  
- POST a test poll, then GET its results to ensure the full flow works.

**With more time:** Add lint/test steps (e.g. ESLint, backend unit tests), security scan of images, and optional deploy step to a test environment.

## 5. AI Tool Usage

AI (Cursor) was used to:  
- Generate initial backend routes and WebSocket wiring, and frontend structure (create form, poll list, vote, results).  
- Propose Docker and nginx config (multi-stage frontend, proxy for `/api` and `/ws`).  
- Draft GitHub Actions workflow and README/APPROACH content.

Validation: logic was reviewed against the problem statement (2–4 options, error cases, port 3000, no external services). Commands and paths were checked (e.g. `docker-compose`, proxy paths, API base URL). Code was run locally via Docker to confirm create, vote, and live results.

## 6. Challenges & Decisions

**Hardest part:** Making the same frontend work in dev (Vite proxy) and in Docker (nginx proxy) with one set of relative URLs (`/api`, `/ws`). Solved by using no API base URL in the frontend (relative only) and configuring both Vite and nginx to proxy those paths to the backend.

**Trade-offs:**  
- In-memory store: simple and no extra services, but polls are lost on backend restart; acceptable for the assessment.  
- Single backend file: fine for this scope; would split into modules for a larger codebase.

**With more time:** Add a proper database (e.g. SQLite in a volume or a DB container), optional Kubernetes deployment, and more tests (API and UI).
