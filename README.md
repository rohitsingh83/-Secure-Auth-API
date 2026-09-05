# 🔐 Secure User Authentication API

A production-ready RESTful authentication service built with **Node.js**, **Express 5**, and **MongoDB**. Features secure password hashing with bcrypt, JWT route protection, refresh token rotation, input validation, and rate limiting.

---

## 🚀 Live Production Deployment

- **Live Base URL:** https://api-production-6a66.up.railway.app
- **Health Check:** https://api-production-6a66.up.railway.app/health

---

## 🌟 Key Features

- **User Registration & Login:** Complete signup and signin with email uniqueness.
- **Bcrypt Password Hashing:** 12 salt rounds before database persistence. Plain-text passwords are never stored.
- **JWT Route Protection:** Stateless Bearer tokens (15m access token + 7d refresh token).
- **Protected Endpoints:** Strict authentication guard restricting data access to verified users.
- **Refresh Token Rotation:** Single-use refresh tokens prevent replay attacks.
- **Input Validation:** Validation on all incoming fields using express-validator.
- **Security Headers & Rate Limiting:** Helmet headers and 10 req/15 min limit on auth endpoints.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (>= 18.0.0)
- **Framework:** Express 5
- **Database:** MongoDB via Mongoose
- **Hashing:** bcryptjs (12 rounds)
- **Token Auth:** jsonwebtoken (JWT)
- **Validation:** express-validator
- **Security:** helmet, express-rate-limit
- **Deployment:** Docker & Railway

---

## 📁 Project Structure

```text
secure-auth-api/
├── src/
│   ├── app.js                  # Express application setup
│   ├── server.js               # Server entry point
│   ├── config/db.js            # MongoDB database connection
│   ├── controllers/
│   │   ├── auth.controller.js  # Registration, login, refresh, logout
│   │   └── user.controller.js  # User profile endpoints
│   ├── middleware/
│   │   ├── authenticate.js     # JWT Bearer verification guard
│   │   ├── authorize.js        # Role-based access control
│   │   ├── catchAsync.js       # Async error wrapper
│   │   ├── errorHandler.js     # Centralized error handler
│   │   ├── rateLimiter.js      # Global & auth rate limits
│   │   └── validate.js         # Validation result checker
│   ├── models/User.js          # User schema + bcrypt pre-save hook
│   ├── routes/
│   │   ├── auth.routes.js      # Public auth routes
│   │   └── user.routes.js      # Protected user routes
│   ├── utils/
│   │   ├── ApiError.js         # Custom error class
│   │   ├── jwtHelper.js        # Token signing & verification
│   │   └── logger.js           # Winston logger
│   └── validators/
│       └── auth.validators.js  # Input validation rules
├── tests/auth.test.js          # Integration test suite
├── Dockerfile                  # Container build
├── docker-compose.yml          # Docker composition with MongoDB
├── .env.example                # Environment variables template
├── package.json
└── README.md
🏁 Quick Start (Local Setup)
1. Install dependencies
bash


npm install
2. Configure environment
bash


cp .env.example .env
3. Run development server
bash


npm run dev
4. Run tests
bash


npm test
📖 API Endpoints Reference
Base Path: https://api-production-6a66.up.railway.app/api/v1

Method	Endpoint	Access	Description
GET	/health	Public	Service health & liveness check
POST	/api/v1/auth/register	Public	Register a new user
POST	/api/v1/auth/login	Public	Login with email and password
POST	/api/v1/auth/refresh	Public	Issue new access token using refresh token
POST	/api/v1/auth/logout	Protected	Logout user & invalidate refresh token
GET	/api/v1/users/me	Protected	Get authenticated user profile
PATCH	/api/v1/users/me	Protected	Update profile name
📡 Sample Requests & Payloads
1. Register User
Request:

POST /api/v1/auth/register
Headers: Content-Type: application/json
json


{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPassword@123",
  "passwordConfirm": "StrongPassword@123"
}
Response (201 Created):

json


{
  "status": "success",
  "data": {
    "user": {
      "_id": "66da9bc7a1b32d0012f4581a",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "expiresIn": "15m"
  }
}
2. Login User
Request:

POST /api/v1/auth/login
Headers: Content-Type: application/json
json


{
  "email": "jane@example.com",
  "password": "StrongPassword@123"
}
Response (200 OK): Returns user details, accessToken, and refreshToken.

3. Access Protected Route
Request:

GET /api/v1/users/me
Headers: Authorization: Bearer <YOUR_ACCESS_TOKEN>
Response (200 OK):

json


{
  "status": "success",
  "data": {
    "user": {
      "_id": "66da9bc7a1b32d0012f4581a",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user"
    }
  }
}
Unauthenticated Attempt (401 Unauthorized):

json


{
  "status": "fail",
  "message": "No token provided. Please log in to access this resource."
}

📄 License
This project is licensed under the MIT License.

