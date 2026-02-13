# Deploy poll app to Kubernetes (Docker Desktop)
# Run from project root: .\deploy-k8s.ps1

$ErrorActionPreference = "Stop"

Write-Host "Building images..." -ForegroundColor Cyan
docker compose build

Write-Host "Tagging images for Kubernetes..." -ForegroundColor Cyan
docker tag poll_app_word-backend:latest poll-app-backend:latest
docker tag poll_app_word-frontend:latest poll-app-frontend:latest

Write-Host "Applying Kubernetes manifests..." -ForegroundColor Cyan
kubectl apply -f k8s/

Write-Host "Waiting for pods to be ready..." -ForegroundColor Cyan
kubectl wait --for=condition=Ready pod -l app=poll-backend --timeout=60s
kubectl wait --for=condition=Ready pod -l app=poll-frontend --timeout=60s

Write-Host "`nPods:" -ForegroundColor Green
kubectl get pods -l 'app in (poll-backend, poll-frontend)'

Write-Host "`nStarting port-forward so you can open http://localhost:3000 (Ctrl+C to stop)..." -ForegroundColor Yellow
kubectl port-forward svc/poll-frontend 3000:3000
