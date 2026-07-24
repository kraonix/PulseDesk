import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/client';

const app = createApp();

beforeAll(async () => {
  // Clean up test users before running
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.pulsedesk' } } });
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.pulsedesk' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'register@test.pulsedesk',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('register@test.pulsedesk');
    // Password hash must never be returned
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 409 when email is already registered', async () => {
    const payload = {
      name: 'Duplicate',
      email: 'duplicate@test.pulsedesk',
      password: 'Password123!',
    };
    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 for weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak',
      email: 'weak@test.pulsedesk',
      password: 'short',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  const credentials = {
    email: 'login@test.pulsedesk',
    password: 'Password123!',
  };

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Login Test', ...credentials });
  });

  it('returns tokens on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ ...credentials, password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    // Register then immediately get profile
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Me Test',
      email: 'me@test.pulsedesk',
      password: 'Password123!',
    });

    const { accessToken } = registerRes.body.data.tokens;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('me@test.pulsedesk');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
