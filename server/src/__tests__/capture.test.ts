import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/client';

const app = createApp();

/**
 * The capture endpoint is public (no auth token required).
 * It requires at least one ADMIN user with an organizationId to exist in the DB.
 * We create one here and clean up after.
 */
const TEST_ORG_SLUG = 'capture-test-org';

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: 'Capture Test Org', slug: TEST_ORG_SLUG },
  });

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.default.hash('Password123!', 12);

  await prisma.user.create({
    data: {
      email: 'capture-admin@test.pulsedesk',
      name: 'Capture Admin',
      passwordHash,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });
});

afterAll(async () => {
  await prisma.leadActivity.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.lead.deleteMany({ where: { organization: { slug: TEST_ORG_SLUG } } });
  await prisma.user.deleteMany({ where: { email: 'capture-admin@test.pulsedesk' } });
  await prisma.organization.deleteMany({ where: { slug: TEST_ORG_SLUG } });
  await prisma.$disconnect();
});

describe('POST /api/leads/capture', () => {
  it('creates a lead without authentication', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({
        name:    'Prospect Pete',
        company: 'Startup Co',
        email:   'pete@startup.co',
        phone:   '+1 555 9999',
        message: 'I am interested in your product for a team of 10.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Prospect Pete');
    expect(res.body.message).toContain('touch');
  });

  it('creates a lead without optional fields', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({
        name:  'Minimal User',
        email: 'minimal@example.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Minimal User');
  });

  it('returns 422 for missing email', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({ name: 'No Email', company: 'Ghost Corp' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid email', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({ name: 'Bad Email', email: 'not-an-email' });

    expect(res.status).toBe(422);
  });

  it('returns 422 for name too short', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({ name: 'X', email: 'x@example.com' });

    expect(res.status).toBe(422);
  });

  it('stores the message as a note on the created lead', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({
        name:    'Message Test',
        email:   'msg@example.com',
        message: 'Please call me back.',
      });

    expect(res.status).toBe(201);

    const lead = await prisma.lead.findUnique({
      where: { id: res.body.data.id },
      include: { notes: true },
    });

    expect(lead?.notes.length).toBe(1);
    expect(lead?.notes[0].body).toContain('Please call me back.');
  });

  it('sets lead source to WEBSITE automatically', async () => {
    const res = await request(app)
      .post('/api/leads/capture')
      .send({ name: 'Source Test', email: 'src@example.com' });

    expect(res.status).toBe(201);

    const lead = await prisma.lead.findUnique({ where: { id: res.body.data.id } });
    expect(lead?.source).toBe('WEBSITE');
    expect(lead?.status).toBe('NEW');
  });
});
