# Kubernetes deployment (Docker Desktop)

Run the poll app on Kubernetes so you see **Pods** in Docker Desktop.

## Prerequisites

- Docker Desktop with **Kubernetes enabled** (Settings → Kubernetes → Enable Kubernetes).
- `kubectl` (included with Docker Desktop when Kubernetes is enabled).

## Deploy (one command)

From the project root:

**Windows (PowerShell):**
```powershell
.\deploy-k8s.ps1
```

**Mac / Linux / Git Bash:**
```bash
chmod +x deploy-k8s.sh
./deploy-k8s.sh
```

The script will:
1. Build the Docker images with `docker compose build`
2. Tag them as `poll-app-backend:latest` and `poll-app-frontend:latest`
3. Apply the manifests in `k8s/` (Deployments + Services)
4. Wait for Pods to be ready
5. Start **port-forward** so the app is at **http://localhost:3000**

Keep the terminal open while you use the app (port-forward runs in the foreground). Press Ctrl+C to stop it; Pods will keep running.

## See Pods in Docker Desktop

Open Docker Desktop → **Kubernetes** → **Pods**. You should see:

- `poll-backend-...`
- `poll-frontend-...`

## Manual steps (if you prefer)

```bash
docker compose build
docker tag poll_app_word-backend:latest poll-app-backend:latest
docker tag poll_app_word-frontend:latest poll-app-frontend:latest
kubectl apply -f k8s/
kubectl port-forward svc/poll-frontend 3000:3000
```

Then open http://localhost:3000.

## Stop Kubernetes deployment

```bash
kubectl delete -f k8s/
```

## Run with Docker Compose instead

To run without Kubernetes (containers only):

```bash
docker compose up
```

Then open http://localhost:3000. You’ll see containers under **Containers** in Docker Desktop, not Pods.
