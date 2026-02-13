# eQuip Poll – Real-time Polling Application

A containerized real-time polling app: create polls, vote anonymously, see live results. Runs entirely in Docker Desktop.

## Quick start (Docker)

**Prerequisites:** Docker Desktop installed and running. Ensure **port 3000** is not in use by another app.

```bash
# From the project root
docker compose up
```

Then open **http://localhost:3000** in your browser. (If you see a different app, stop any other process using port 3000 and run `docker compose up` again.)

- Create polls (question + 2–4 options)
- View active polls and vote
- See results update in real time (WebSocket) with bar and pie charts

To stop:

```bash
docker-compose down
```

## Docker setup details

- **Port:** The app is served at **http://localhost:3000** (frontend only; backend is internal).
- **Containers:**
  - `frontend`: React app built and served by nginx; proxies `/api` and `/ws` to the backend.
  - `backend`: Node.js (Express) API + WebSocket server; in-memory store (no external DB).
- **Networks:** Both services use a single bridge network; no external services required.

## API (via http://localhost:3000/api when running in Docker)

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/polls` | Create poll (`question`, `options` array) |
| GET    | `/polls` | List all polls |
| GET    | `/polls/:id` | Get one poll |
| GET    | `/polls/:id/results` | Get results |
| POST   | `/polls/:id/vote` | Vote (`optionIndex` in body) |
| POST   | `/polls/:id/close` | Close poll (optional) |
| GET    | `/health` | Health check |

## Tech stack

- **Frontend:** React (Vite), Recharts (bar + pie)
- **Backend:** Node.js, Express, `ws` (WebSocket)
- **Real-time:** WebSocket for live updates
- **Deployment:** Docker Compose; optional Kubernetes manifests in `k8s/`

## Optional: run with Kubernetes (Docker Desktop)

To see **Pods** in Docker Desktop, deploy to Kubernetes:

**Windows:** `.\deploy-k8s.ps1`  
**Mac/Linux:** `./deploy-k8s.sh`

Then open http://localhost:3000. See `k8s/README.md` for details.

## Documentation

- **APPROACH.md** – Problem approach, Docker design, technical decisions, CI/CD, and challenges.
