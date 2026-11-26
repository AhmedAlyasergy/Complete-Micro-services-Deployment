# Run everything on a local Kubernetes cluster (Windows)

Two ways to deploy the same system. Pick **one** at a time:

- **A. Plain manifests** (`kubernetes/`): applied with `kubectl`. Shows each resource clearly.
- **B. Helm chart** (`helm/ecommerce/`): one command. This is what the CI/CD pipeline uses.

What gets created in the `ecommerce` namespace:

| Per service (auth, products, orders) | Shared |
|---|---|
| ConfigMap (settings) | Secret `ecommerce-secrets` |
| PostgreSQL StatefulSet + 1Gi volume | Ingress `api-gateway` (`/api/auth`, `/api/products`, `/api/orders`) |
| Deployment with startup / liveness / readiness probes | |
| ClusterIP Service | |
| HorizontalPodAutoscaler (1 to 5 pods at 70% CPU) | |

---

## 0. Install once

Run in a terminal (Docker Desktop must already be installed):

```bat
winget install Kubernetes.minikube
winget install Kubernetes.kubectl
winget install Helm.Helm
```

Close and reopen the terminal afterwards so the new commands are found.

## 1. Start the cluster

```bat
minikube start --driver=docker --cpus=4 --memory=4096
minikube addons enable ingress
minikube addons enable metrics-server
```

## 2. Put the images inside the cluster

Minikube has its own Docker, so it can't see the images Docker Desktop built.
From the repo folder:

```bat
cd C:\Users\ahmed\Complete-Micro-services-Deployment
cd docker
docker compose build
cd ..
minikube image load ecommerce/auth-service:local
minikube image load ecommerce/products-service:local
minikube image load ecommerce/orders-service:local
minikube image load postgres:16-alpine
```

---

## 3A. Deploy with plain manifests

```bat
kubectl apply -f kubernetes\00-namespace.yaml
copy kubernetes\secrets.example.yaml kubernetes\secrets.yaml
notepad kubernetes\secrets.yaml
kubectl apply -f kubernetes\secrets.yaml
kubectl apply -f kubernetes\auth -f kubernetes\products -f kubernetes\orders -f kubernetes\ingress
```

`secrets.yaml` is git-ignored, so the real values never get committed.

## 3B. Or deploy with Helm

```bat
helm lint helm\ecommerce
helm upgrade --install ecommerce helm\ecommerce -n ecommerce --create-namespace
```

To switch from A to B (or back), remove the first one before installing the other:
`kubectl delete namespace ecommerce`

---

## 4. Watch it come up

```bat
kubectl get pods -n ecommerce -w
```

The databases start first. Each service waits for its database (the `wait-for-db`
init container), runs its migrations, then turns **Ready 1/1**.
Press Ctrl+C once all 6 pods are Running and 1/1.

## 5. Call the API through the Ingress

In a **second terminal** (leave it open):

```bat
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8082:80
```

Then open http://localhost:8082/api/products, or follow the Postman steps in
`services/RUN_LOCALLY.md` with `http://localhost:8082` as the address.

## 6. Demo: auto scaling

```bat
kubectl get hpa -n ecommerce
```

Send heavy traffic to products-service from inside the cluster (third terminal):

```bat
kubectl run load-generator -n ecommerce --image=busybox:1.36 --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://products-service:3002/api/products > /dev/null; done"
kubectl get hpa products-service -n ecommerce -w
```

Within a minute or two CPU passes 70% and REPLICAS goes up. If it stays low, start
`load-generator-2` and `load-generator-3` the same way. Stop the load:

```bat
kubectl delete pod load-generator -n ecommerce
```

About a minute after the load stops, the pods scale back down to 1.

## 7. Demo: self-healing

```bat
kubectl delete pod -n ecommerce -l app=orders-service
kubectl get pods -n ecommerce -w
```

Kubernetes starts a replacement pod right away.

## Useful commands

```bat
kubectl logs -n ecommerce deploy/orders-service      # a service's logs
kubectl describe pod -n ecommerce <pod-name>         # why a pod isn't starting
kubectl delete namespace ecommerce                   # remove everything
minikube stop                                        # stop the cluster, keep it
```
