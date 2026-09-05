'use strict';

/**
 * @file tests/auth.test.js
 * @description Integration tests for the authentication endpoints.
 *              Uses supertest to make real HTTP requests against the Express app
 *              connected to an in-memory MongoDB replica (via mongoose).
 *
 *  Run with: npm test
 */

const request   = require('supertest');
const mongoose  = require('mongoose');
const app       = require('../src/app');
const User      = require('../src/models/User');

// ── Test data ─────────────────────────────────────────────────────────────────

const testUser = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  password: 'StrongPass@1',
  passwordConfirm: 'StrongPass@1',
};

let accessToken;
let refreshToken;

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Connect to the test database defined in MONGO_URI (or use a local test DB)
  const testUri = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_auth_test';
  await mongoose.connect(testUri);
});

afterAll(async () => {
  await User.deleteMany({});    // Clean up test data
  await mongoose.connection.close();
});

// ── Registration ──────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('should register a new user and return 201 with tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).not.toHaveProperty('password');

    accessToken  = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should return 409 when email is already registered', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.status).toBe('fail');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bad@example.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should return 400 when passwords do not match', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, email: 'other@example.com', passwordConfirm: 'WrongPass@1' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for a weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, email: 'other2@example.com', password: 'weak', passwordConfirm: 'weak' });

    expect(res.statusCode).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('should login successfully and return tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).not.toHaveProperty('password');

    accessToken  = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPass@1' });

    expect(res.statusCode).toBe(401);
    // Generic message — no enumeration hint
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('should return 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'StrongPass@1' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'StrongPass@1' });

    expect(res.statusCode).toBe(400);
  });
});

// ── Protected route ───────────────────────────────────────────────────────────

describe('GET /api/v1/users/me  (protected)', () => {
  it('should return the user profile with a valid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('should return 401 with no token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer this.is.not.valid');

    expect(res.statusCode).toBe(401);
  });
});

// ── Token refresh ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('should issue a new access token from a valid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('should return 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'fake.refresh.token' });

    expect(res.statusCode).toBe(401);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout  (protected)', () => {
  it('should logout successfully with a valid token', async () => {
    // Re-login first to get a fresh token after the refresh rotation above
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Logged out successfully. Please discard your tokens.');
  });

  it('should return 401 when logging out without a token', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.statusCode).toBe(401);
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('should return 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/v1/this-does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});
