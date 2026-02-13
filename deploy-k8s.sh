#!/usr/bin/env bash
# Deploy poll app to Kubernetes (Docker Desktop)
# Run from project root: ./deploy-k8s.sh

set -e

echo "Building images..."
docker compose build

echo "Tagging images for Kubernetes..."
docker tag poll_app_word-backend:latest poll-app-backend:latest
docker tag poll_app_word-frontend:latest poll-app-frontend:latest

echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=Ready pod -l app=poll-backend --timeout=60s
kubectl wait --for=condition=Ready pod -l app=poll-frontend --timeout=60s

echo ""
echo "Pods:"
kubectl get pods -l 'app in (poll-backend, poll-frontend)'

echo ""
echo "Starting port-forward so you can open http://localhost:3000 (Ctrl+C to stop)..."
kubectl port-forward svc/poll-frontend 3000:3000
