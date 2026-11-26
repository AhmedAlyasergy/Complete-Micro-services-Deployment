# Run the full backend (Auth + Products + Orders) on your laptop

## 0. Install once
- **Node.js 20 LTS**: https://nodejs.org — check with `node -v`
- **Docker Desktop**: https://www.docker.com/products/docker-desktop — open it and leave it running
- **Postman** (to try the API): https://www.postman.com/downloads

## 1. Start the database (one container, 6 databases)
```bash
docker run -d --name shop-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
```
Wait ~5 seconds, then:
```bash
docker exec shop-db createdb -U postgres auth_db
docker exec shop-db createdb -U postgres auth_db_test
docker exec shop-db createdb -U postgres products_db
docker exec shop-db createdb -U postgres products_db_test
docker exec shop-db createdb -U postgres orders_db
docker exec shop-db createdb -U postgres orders_db_test
```
Next time you only need: `docker start shop-db`

## 2. Settings files
In each of the 3 service folders, copy `.env.example` to `.env`
(Windows: `copy .env.example .env` · Mac/Linux: `cp .env.example .env`).

Then check two things match:
- **`JWT_SECRET`** is the same in all **3** `.env` files
- **`INTERNAL_API_KEY`** is the same in **products** and **orders**

## 3. Install and run (three terminals, in this order)
```bash
# Terminal 1
cd services/auth-service && npm install && npm run dev       # port 3001
# Terminal 2
cd services/products-service && npm install && npm run dev   # port 3002
# Terminal 3
cd services/orders-service && npm install && npm run dev     # port 3003
```
Check in a browser:
- http://localhost:3001/health
- http://localhost:3002/health
- http://localhost:3003/ready  → should say `"database": true, "products": true`

## 4. Full shopping journey in Postman
For any request with a body: Body → raw → JSON. For any request with a token: Authorization → Bearer Token.

1. **Log in as admin** — POST `http://localhost:3001/api/auth/login`
   `{ "email": "admin@shop.com", "password": "change-me-admin-password" }` → copy `token` (= ADMIN TOKEN)
2. **Add products** (ADMIN TOKEN) — POST `http://localhost:3002/api/products`
   `{ "name": "Laptop", "price": 1200, "stock": 5 }` then `{ "name": "Mouse", "price": 15.5, "stock": 10 }`
3. **Sign up a customer** — POST `http://localhost:3001/api/auth/register`
   `{ "name": "Sara", "email": "sara@test.com", "password": "secret123" }`
4. **Log in as Sara** — POST `http://localhost:3001/api/auth/login` → copy `token` (= SARA TOKEN)
5. **Sara places an order** (SARA TOKEN) — POST `http://localhost:3003/api/orders`
   `{ "items": [ { "productId": 1, "quantity": 2 }, { "productId": 2, "quantity": 3 } ] }`
   → total **2446.5**, status **pending**
6. **Stock went down** — GET `http://localhost:3002/api/products` → Laptop 3, Mouse 7
7. **Too many** (SARA TOKEN) — order `{ "items": [ { "productId": 1, "quantity": 10 } ] }` → **409 Not enough stock**
8. **Sara's orders** (SARA TOKEN) — GET `http://localhost:3003/api/orders`
9. **Admin marks it paid** (ADMIN TOKEN) — PATCH `http://localhost:3003/api/orders/1/status`  `{ "status": "paid" }`
10. **Cancel** (SARA TOKEN) — PATCH `http://localhost:3003/api/orders/1/cancel` → stock goes back to Laptop 5, Mouse 10

## 5. Run the automatic checks
In each service folder: `npm test` (Auth 28 · Products 28 · Orders 37 checks)

## 6. Build the Docker images
```bash
cd services/auth-service     && docker build -t auth-service .
cd ../products-service       && docker build -t products-service .
cd ../orders-service         && docker build -t orders-service .
```

## If something goes wrong
| Problem | Fix |
|---|---|
| `JWT_SECRET is not set` / `INTERNAL_API_KEY is not set` | The `.env` file is missing (step 2) |
| `ECONNREFUSED ... 5432` | Database isn't running: `docker start shop-db` |
| `database "..." does not exist` | Run the `createdb` commands in step 1 |
| `port 5432 already in use` | PostgreSQL is already installed on your laptop: stop it, or use `-p 5433:5432` and set `DB_PORT=5433` in all `.env` files |
| `Invalid or expired token` | `JWT_SECRET` differs between `.env` files, or the token is older than 1 hour (log in again) |
| Orders says `Products service is unavailable` | Products isn't running, or `PRODUCTS_URL` is wrong in orders `.env` |
| Order fails with `401` from stock | `INTERNAL_API_KEY` differs between products and orders `.env` |
| Admin login fails | The admin is created only the **first** time Auth starts. If you changed `ADMIN_PASSWORD` later, use the old one, or reset: `docker exec shop-db psql -U postgres -d auth_db -c "DELETE FROM users WHERE email='admin@shop.com'"` and restart Auth |
