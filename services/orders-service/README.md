# Orders Service

Lets logged-in customers place, see and cancel orders.
Owner: **Nour** (Backend & Microservices)

## What it does
- A logged-in customer places an order with a list of products and quantities
- Gets the **real** names and prices from Products (prices sent by the user are ignored)
- Takes the stock from Products; if any product is short, the order is refused and any stock already taken is given back
- Calculates the total and saves the order + its items together (all or nothing)
- Customers see only their own orders; admins see everyone's
- Customers can cancel their order (stock goes back to Products)
- Admins move orders along: `pending → paid → shipped` (or cancel)

## Endpoints (all need `Authorization: Bearer <token>`)

| Method | URL | Who | What it does |
|---|---|---|---|
| GET | `/health` | anyone (no token) | Liveness check |
| GET | `/ready` | anyone (no token) | Database **and** Products reachable? |
| POST | `/api/orders` | logged in | Body: `{ "items": [{ "productId": 1, "quantity": 2 }] }` |
| GET | `/api/orders` | logged in | My orders (admin: all orders) |
| GET | `/api/orders/:id` | owner or admin | One order with its items |
| PATCH | `/api/orders/:id/cancel` | owner or admin | Cancel; stock is returned |
| PATCH | `/api/orders/:id/status` | admin | Body: `{ "status": "paid" \| "shipped" \| "cancelled" }` |

Allowed status changes: `pending → paid / cancelled`, `paid → shipped / cancelled`. Shipped and cancelled orders are final.

Errors: `{ "error": "message" }` · 400 bad list or unknown product · 401 no/invalid pass · 403 not admin · 404 not found (or not yours) · 409 not enough stock / status change not allowed · 503 Products unavailable

## Settings (environment variables)

| Variable | Example | Secret? |
|---|---|---|
| `PORT` | `3003` | no |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | no |
| `DB_NAME` | `orders_db` | no |
| `DB_USER` | `postgres` | no |
| `DB_PASSWORD` | — | **yes** |
| `JWT_SECRET` | — | **yes**, must equal auth-service's |
| `PRODUCTS_URL` | `http://localhost:3002` (Kubernetes: `http://products-service:3002`) | no |
| `INTERNAL_API_KEY` | — | **yes**, must equal products-service's |
| `PRODUCTS_TIMEOUT_MS` | `3000` | no |

Tables `orders` and `order_items` are created automatically on startup.

## Run, test, Docker
```bash
cp .env.example .env
npm install
npm run dev              # → orders-service running on port 3003 (start products-service first)
npm test                 # needs a database called orders_db_test (Products is faked in tests)
docker build -t orders-service .
```
