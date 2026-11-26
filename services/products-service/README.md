# Products Service

The shop's catalog: products, prices and stock.
Owner: **Nour** (Backend & Microservices)

## What it does
- Anyone can browse products (page by page) and see one product
- Only admins can add, edit and delete products
- Stock can never go below zero, even if two people buy the last item at the same moment
- Orders lowers stock when someone buys, using a shared internal key
- Verifies JWTs locally with the shared `JWT_SECRET` (no call to auth-service)

## Endpoints

| Method | URL | Who | What it does |
|---|---|---|---|
| GET | `/health` | anyone | Liveness check |
| GET | `/ready` | anyone | Is the database reachable? |
| GET | `/api/products?page=1&limit=10` | anyone | List products (newest first, max 100 per page) |
| GET | `/api/products/:id` | anyone | One product |
| POST | `/api/products` | admin | Add `{ name, price, description?, stock? }` |
| PUT | `/api/products/:id` | admin | Change any of `name, description, price, stock` |
| DELETE | `/api/products/:id` | admin | Remove a product |
| PATCH | `/api/products/:id/stock` | Orders service (`x-internal-key`) or admin | `{ "change": -2 }` lowers stock by 2; `{ "change": 3 }` adds 3 |

Admin endpoints need: `Authorization: Bearer <token from auth-service login>`

Errors: `{ "error": "message" }` · 400 bad input · 401 no/invalid pass · 403 not admin · 404 not found · 409 not enough stock

## Settings (environment variables)

| Variable | Example | Secret? |
|---|---|---|
| `PORT` | `3002` | no |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | no |
| `DB_NAME` | `products_db` | no |
| `DB_USER` | `postgres` | no |
| `DB_PASSWORD` | — | **yes** |
| `JWT_SECRET` | — | **yes**, must equal auth-service's |
| `INTERNAL_API_KEY` | — | **yes**, shared with orders-service |

The `products` table is created automatically on startup (`migrations/001_create_products.sql`).

## Run, test, Docker
```bash
cp .env.example .env
npm install
npm run dev              # → products-service running on port 3002
npm test                 # needs a database called products_db_test
docker build -t products-service .
```
