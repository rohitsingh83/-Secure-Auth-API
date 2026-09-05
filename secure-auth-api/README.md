# 🔐 Secure Auth API




A **production-ready** REST authentication service built with **Node.js · Express 5 · MongoDB**.

🚀 **Live Production Deployment**:  
**Base URL**: [`https://api-production-6a66.up.railway.app`](https://api-production-6a66.up.railway.app)  
**Health Check**: [`https://api-production-6a66.up.railway.app/health`](https://api-production-6a66.up.railway.app/health)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | MongoDB via Mongoose 8 |
| Password hashing | bcryptjs (12 rounds) |
| Token strategy | JWT access token (15 min) + Refresh token (7 days) |
| Validation | express-validator |
| Security headers | Helmet |
| Rate limiting | express-rate-limit |
| NoSQL sanitization | express-mongo-sanitize |
| Logging | Winston + Morgan |
| Testing | Jest + Supertest |

---

## Project Structure

```
secure-auth-api/
├── src/
│   ├── app.js                  # Express app factory (middleware + routes)
│   ├── server.js               # HTTP server + graceful shutdown
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js  # register · login · refresh · logout
│   │   └── user.controller.js  # getMe · updateMe · getAllUsers · getUserById
│   ├── middleware/
│   │   ├── authenticate.js     # JWT Bearer guard
│   │   ├── authorize.js        # Role-based access control (RBAC)
│   │   ├── catchAsync.js       # Async error forwarder
│   │   ├── errorHandler.js     # Global 404 + error handler
│   │   ├── rateLimiter.js      # Global + auth-specific rate limits
│   │   └── validate.js         # express-validator result checker
│   ├── models/
│   │   └── User.js             # Mongoose schema + bcrypt pre-save hook
│   ├── routes/
│   │   ├── auth.routes.js      # Public auth routes
│   │   └── user.routes.js      # Protected user routes
│   ├── utils/
│   │   ├── ApiError.js         # Custom operational error class
│   │   ├── jwtHelper.js        # Sign / verify access & refresh tokens
│   │   └── logger.js           # Winston structured logger
│   └── validators/
│       └── auth.validators.js  # Input validation chains
├── tests/
│   ├── setup.js                # Jest env overrides
│   └── auth.test.js            # Integration test suite
├── .env.example                # Environment variable template
├── .gitignore
├── jest.config.json
└── package.json
```

---

## Quick Start

### 1 — Clone & install

```bash
git clone <repo-url>
cd secure-auth-api
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env and set your own MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET
```

### 3 — Run

```bash
# Development (auto-restart)
npm run dev

# Production
NODE_ENV=production npm start
```

### 4 — Test

```bash
npm test
```

---

## API Reference

**Base URL:** `http://localhost:5000/api/v1`

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Service liveness check |

---

### Auth Routes  `/api/v1/auth`

> All auth routes are rate-limited to **10 requests / 15 min per IP**.

#### `POST /auth/register`

Creates a new user account and returns a token pair.

**Request body:**
```json
{
  "name":            "Jane Doe",
  "email":           "jane@example.com",
  "password":        "StrongPass@1",
  "passwordConfirm": "StrongPass@1"
}
```

**Password rules:** ≥ 8 chars · uppercase · lowercase · digit · special character

**Success `201`:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id":       "665f1a2b3c4d5e6f7a8b9c0d",
      "name":      "Jane Doe",
      "email":     "jane@example.com",
      "role":      "user",
      "createdAt": "2026-09-05T07:19:25.000Z",
      "updatedAt": "2026-09-05T07:19:25.000Z"
    },
    "accessToken":  "<JWT>",
    "refreshToken": "<JWT>",
    "expiresIn":    "15m"
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400`  | Missing / invalid fields, weak password, passwords don't match |
| `409`  | Email already registered |

---

#### `POST /auth/login`

Authenticates credentials and returns a new token pair.

**Request body:**
```json
{
  "email":    "jane@example.com",
  "password": "StrongPass@1"
}
```

**Success `200`:** Same shape as `/register` response.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400`  | Missing fields |
| `401`  | Invalid email or password (generic — prevents user enumeration) |
| `403`  | Account deactivated |

---

#### `POST /auth/refresh`

Issues a new access token from a valid refresh token. **Rotates** the refresh token (the old one is invalidated).

**Request body:**
```json
{
  "refreshToken": "<refresh JWT>"
}
```

**Success `200`:**
```json
{
  "status": "success",
  "data": {
    "accessToken":  "<new JWT>",
    "refreshToken": "<new rotated JWT>",
    "expiresIn":    "15m"
  }
}
```

---

#### `POST /auth/logout` 🔒

Invalidates the server-side refresh token. The client should discard both tokens.

**Request header:**
```
Authorization: Bearer <accessToken>
```

**Success `200`:**
```json
{
  "status":  "success",
  "message": "Logged out successfully. Please discard your tokens."
}
```

---

### User Routes  `/api/v1/users`  🔒

> All user routes require `Authorization: Bearer <accessToken>`.

#### `GET /users/me`

Returns the authenticated user's own profile.

**Sample authenticated request:**
```bash
curl -X GET http://localhost:5000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success `200`:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id":       "665f1a2b3c4d5e6f7a8b9c0d",
      "name":      "Jane Doe",
      "email":     "jane@example.com",
      "role":      "user",
      "createdAt": "2026-09-05T07:19:25.000Z",
      "updatedAt": "2026-09-05T07:19:25.000Z"
    }
  }
}
```

---

#### `PATCH /users/me`

Updates the authenticated user's name.

**Request body:**
```json
{
  "name": "Jane Smith"
}
```

> ⚠️ Attempting to update `password`, `role`, or `email` via this endpoint returns `400`.

---

#### `GET /users` *(admin only)*

Returns a paginated list of all users.

**Query params:** `?page=1&limit=20`

**Success `200`:**
```json
{
  "status":  "success",
  "results": 20,
  "pagination": {
    "total": 142,
    "page":  1,
    "pages": 8,
    "limit": 20
  },
  "data": { "users": [ /* ... */ ] }
}
```

---

#### `GET /users/:id` *(admin only)*

Returns a single user by MongoDB ObjectId.

---

## Security Implementation Summary

| Concern | Implementation |
|---------|----------------|
| Plain-text passwords | **Never stored** — bcrypt (12 rounds) pre-save hook |
| Token strategy | Short-lived access JWT (15 min) + rotated refresh JWT (7 d) |
| Token claims | `iss`, `aud`, `iat`, `exp` — prevents cross-service token reuse |
| Stale token detection | `passwordChangedAt` compared against JWT `iat` |
| User enumeration | Login always returns the same 401 message regardless of failure reason |
| Brute force | Auth endpoints rate-limited to 10 req / 15 min per IP |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` from request bodies |
| Oversized payloads | Body parser capped at 10 kb |
| Security headers | `helmet` sets CSP, HSTS, X-Frame-Options, etc. |
| Error leakage | Stack traces never exposed in production (`NODE_ENV=production`) |
| Sensitive fields | `password`, `refreshToken` excluded from all DB queries by default (`select: false`) |
| Response sanitization | `toJSON` transform strips all sensitive fields before serialisation |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | — |
| `JWT_SECRET` | Access token signing secret (≥ 32 chars) | — |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `12` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Global requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Auth requests per window | `10` |

---

## HTTP Status Code Reference

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad Request — validation failed |
| `401` | Unauthorized — missing, invalid, or expired token / bad credentials |
| `403` | Forbidden — authenticated but insufficient role |
| `404` | Not Found |
| `409` | Conflict — duplicate email |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |
