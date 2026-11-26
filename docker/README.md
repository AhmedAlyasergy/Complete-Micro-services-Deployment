# Run the whole system with Docker Compose

Starts 3 services, 3 PostgreSQL databases (one per service) and the API gateway.

```bash
cd docker
cp .env.example .env          # then change the secrets inside
docker compose up --build -d
docker compose ps             # wait until every service shows "healthy"
```

Everything goes through the gateway at **http://localhost:8080**:

| Path | Goes to |
|---|---|
| `/api/auth/...` | auth-service (3001) |
| `/api/products...` | products-service (3002) |
| `/api/orders...` | orders-service (3003) |
| `/health` | the gateway itself |

The services' own ports aren't exposed on your machine. Only the gateway is.

## Startup order (handled automatically)

1. Each database starts and passes `pg_isready`.
2. auth and products start and become healthy (`/ready`).
3. orders starts, because it needs products to be up.
4. The gateway starts last.

Each service creates its own tables on startup, so no SQL scripts are needed.

## Useful commands

```bash
docker compose logs -f orders-service   # follow one service's logs
docker compose down                     # stop everything, keep data
docker compose down -v                  # stop and delete all data
```

To try the API, follow the Postman steps in `services/RUN_LOCALLY.md`, using
`http://localhost:8080` in place of `localhost:3001` / `3002` / `3003`.
