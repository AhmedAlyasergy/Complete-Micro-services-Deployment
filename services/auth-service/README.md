# Auth Service

Handles accounts for the shop: sign up, log in, and JWT issuing.
Owner: **Nour** (Backend & Microservices)

## What it does
- Create an account with name, email and password
- Log in and check the password is correct
- Store passwords as bcrypt hashes
- Issue a JWT on login (valid for 1 hour)
- Know who is a normal `user` and who is an `admin`

## Endpoints

| Method | URL | Who | What it does |
|---|---|---|---|
| GET | `/health` | anyone | Liveness check |
| GET | `/ready` | anyone | Is the database reachable? |
| POST | `/api/auth/register` | anyone | Create an account (always as `user`) |
| POST | `/api/auth/login` | anyone | Returns `{ token, user }` |
| GET | `/api/auth/me` | logged in | Returns the current user |
| GET | `/api/auth/users` | admin | List all users |
| PATCH | `/api/auth/users/:id/role` | admin | Set role to `user` or `admin` |

Protected endpoints need this header: `Authorization: Bearer <token>`

Errors always look like: `{ "error": "message" }`
Status codes: 200/201 ok · 400 bad input · 401 no/invalid token or wrong password · 403 not allowed · 404 not found · 409 email already used · 500 server error

## Settings (environment variables)

| Variable | Example | Secret? |
|---|---|---|
| `PORT` | `3001` | no |
| `DB_HOST` | `localhost` | no |
| `DB_PORT` | `5432` | no |
| `DB_NAME` | `auth_db` | no |
| `DB_USER` | `postgres` | no |
| `DB_PASSWORD` | — | **yes** |
| `JWT_SECRET` | — | **yes** (Products & Orders must use the same value) |
| `JWT_EXPIRES_IN` | `1h` | no |
| `ADMIN_EMAIL` | `admin@shop.com` | no |
| `ADMIN_PASSWORD` | — | **yes** |

The `users` table is created automatically on startup (`migrations/001_create_users.sql`).

## Run it on your laptop
```bash
# 1. Start PostgreSQL (with Docker)
docker run -d --name auth-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auth_db -p 5432:5432 postgres:16-alpine

# 2. Install and start
cp .env.example .env
npm install
npm run dev          # → auth-service running on port 3001
```

## Tests
```bash
# needs a database called auth_db_test
docker exec auth-db createdb -U postgres auth_db_test

npm test                 # all tests
npm run test:unit        # small pieces only (no database needed)
npm run test:integration # full journeys with the database
```

## Docker
```bash
docker build -t auth-service .
docker run -p 3001:3001 --env-file .env -e DB_HOST=host.docker.internal auth-service
```
