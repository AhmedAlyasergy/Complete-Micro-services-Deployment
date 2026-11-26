# Cloud-Native E-Commerce — Complete Microservices Deployment

An online shop backend built as microservices, deployed with Docker and Kubernetes, and delivered through a CI/CD pipeline with full monitoring.

## Architecture

```
                 USER
                   |
              API GATEWAY
                   |
       +-----------+-----------+
       |           |           |
     AUTH      PRODUCTS     ORDERS
       |           |           |
    auth_db   products_db   orders_db
```

| Service | Port | Responsibility |
|---|---|---|
| auth-service | 3001 | Registration, login, JWT issuing, user roles |
| products-service | 3002 | Product catalog, prices, stock |
| orders-service | 3003 | Placing, tracking and cancelling orders |

Each service owns its own PostgreSQL database and communicates only through REST APIs.

## Team

| Member | Area |
|---|---|
| Nour | Backend & microservices (`services/`) |
| Ahmed | Containerization & Kubernetes (`docker/`, `kubernetes/`, `helm/`) |
| Shahd | CI/CD, monitoring & automation (`.github/`, `monitoring/`) |

## Tech stack

- **Backend:** Node.js 20, Express, PostgreSQL 16, JWT, bcrypt
- **Testing:** Jest, Supertest
- **Containers:** Docker, Docker Compose
- **Orchestration:** Kubernetes, Helm
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus, Grafana, Loki

## Repository structure

```
services/        Auth, Products and Orders services (code, tests, Dockerfiles)
api-gateway/     Gateway routing
database/        Database setup
docker/          Docker Compose
kubernetes/      Kubernetes manifests
helm/            Helm charts
monitoring/      Prometheus and Grafana configuration
.github/         CI/CD workflows
terraform/       Infrastructure as code
```

## Running the services locally

See [services/RUN_LOCALLY.md](services/RUN_LOCALLY.md).
