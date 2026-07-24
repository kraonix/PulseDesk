import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../database/client';

const app = createApp();

let memberToken: string;
let adminToken: string;
let createdLeadId: string;

async function registerAndLogin(email: string, role = 'MEMBER') {
  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Lead Test User',
    email,
    password: 'Password123!',
    organizationName: 'Lead Test Org',
  });

  if (role === 'ADMIN') {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' });
    return loginRes.body.data.tokens.accessToken as string;
  }

  return regRes.body.data.tokens.accessToken as string;
}

beforeAll(async () => {
  await prisma.leadActivity.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.leadTag.deleteMany({});
  await prisma.lead.deleteMany({ where: { createdBy: { email: { endsWith: '@leads.test' } } } });
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@leads.test' } } });

  memberToken = await registerAndLogin('member@leads.test', 'MEMBER');
  adminToken  = await registerAndLogin('admin@leads.test',  'ADMIN');
});

afterAll(async () => {
  await prisma.leadActivity.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.leadTag.deleteMany({});
  await prisma.lead.deleteMany({ where: { createdBy: { email: { endsWith: '@leads.test' } } } });
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@leads.test' } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Lead CRUD
// ---------------------------------------------------------------------------

describe('POST /api/leads', () => {
  it('creates a lead and returns 201', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name:    'Jane Doe',
        company: 'Test Corp',
        email:   'jane@testcorp.com',
        source:  'WEBSITE',
        value:   5000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Jane Doe');
    expect(res.body.data.source).toBe('WEBSITE');
    createdLeadId = res.body.data.id;
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/leads').send({ name: 'Ghost Lead' });
    expect(res.status).toBe(401);
  });

  it('returns 422 for missing name', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ company: 'No Name Corp' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/leads', () => {
  it('returns paginated results', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/leads?status=NEW')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    res.body.data.items.forEach((lead: any) => {
      expect(lead.status).toBe('NEW');
    });
  });
});

describe('GET /api/leads/:id', () => {
  it('returns the lead with activities array', async () => {
    const res = await request(app)
      .get(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdLeadId);
    expect(Array.isArray(res.body.data.activities)).toBe(true);
    expect(Array.isArray(res.body.data.notes)).toBe(true);
  });
});

describe('PATCH /api/leads/:id', () => {
  it('updates lead status to CONTACTED', async () => {
    const res = await request(app)
      .patch(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONTACTED');
  });

  it('sets closedAt when transitioning to WON', async () => {
    const res = await request(app)
      .patch(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'WON' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('WON');
    expect(res.body.data.closedAt).not.toBeNull();
  });

  it('clears closedAt when reopening a WON lead', async () => {
    const res = await request(app)
      .patch(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.data.closedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

describe('POST /api/leads/:id/notes', () => {
  it('adds a note to the lead', async () => {
    const res = await request(app)
      .post(`/api/leads/${createdLeadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'Had a great call, very interested.' });

    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe('Had a great call, very interested.');
  });

  it('returns 422 for empty note body', async () => {
    const res = await request(app)
      .post(`/api/leads/${createdLeadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: '' });

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// Activity tracking
// ---------------------------------------------------------------------------

describe('Activity tracking', () => {
  let activityLeadId: string;

  beforeAll(async () => {
    // Create a fresh lead so activity assertions start from a known state
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Activity Test Lead', source: 'OTHER' });
    activityLeadId = res.body.data.id;
  });

  it('records LEAD_CREATED when a lead is created', async () => {
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: activityLeadId, action: 'LEAD_CREATED' },
    });
    expect(activities).toHaveLength(1);
  });

  it('records STATUS_CHANGED with old and new values', async () => {
    await request(app)
      .patch(`/api/leads/${activityLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'QUALIFIED' });

    const activity = await prisma.leadActivity.findFirst({
      where: { leadId: activityLeadId, action: 'STATUS_CHANGED' },
    });

    expect(activity).not.toBeNull();
    const meta = activity!.metadata as any;
    expect(meta.oldValue).toBe('NEW');
    expect(meta.newValue).toBe('QUALIFIED');
  });

  it('records NOTE_ADDED with a snippet of the note body', async () => {
    await request(app)
      .post(`/api/leads/${activityLeadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'Called and left a voicemail.' });

    const activity = await prisma.leadActivity.findFirst({
      where: { leadId: activityLeadId, action: 'NOTE_ADDED' },
    });

    expect(activity).not.toBeNull();
    const meta = activity!.metadata as any;
    expect(meta.newValue).toContain('Called and left');
  });

  it('records ASSIGNED_MEMBER_CHANGED when assignedToId changes', async () => {
    // Find the admin user id
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', email: { endsWith: '@leads.test' } } });
    expect(admin).not.toBeNull();

    await request(app)
      .patch(`/api/leads/${activityLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ assignedToId: admin!.id });

    const activity = await prisma.leadActivity.findFirst({
      where: { leadId: activityLeadId, action: 'ASSIGNED_MEMBER_CHANGED' },
    });

    expect(activity).not.toBeNull();
    const meta = activity!.metadata as any;
    expect(meta.newValue).toBeTruthy();
  });

  it('records FOLLOW_UP_DATE_CHANGED when followUpDate is set', async () => {
    const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString();

    await request(app)
      .patch(`/api/leads/${activityLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ followUpDate: futureDate });

    const activity = await prisma.leadActivity.findFirst({
      where: { leadId: activityLeadId, action: 'FOLLOW_UP_DATE_CHANGED' },
    });

    expect(activity).not.toBeNull();
    const meta = activity!.metadata as any;
    expect(meta.newValue).toBeTruthy();
  });

  it('GET /api/leads/:id returns activities in the response', async () => {
    const res = await request(app)
      .get(`/api/leads/${activityLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    const activities = res.body.data.activities;
    expect(Array.isArray(activities)).toBe(true);
    // Should have at least LEAD_CREATED, STATUS_CHANGED, NOTE_ADDED, ASSIGNED, FOLLOW_UP
    expect(activities.length).toBeGreaterThanOrEqual(5);
    // Newest first
    for (let i = 1; i < activities.length; i++) {
      expect(new Date(activities[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(activities[i].createdAt).getTime(),
      );
    }
    // Each entry has expected shape
    activities.forEach((a: any) => {
      expect(a.id).toBeDefined();
      expect(a.action).toBeDefined();
      expect(a.createdAt).toBeDefined();
      expect(a.user?.name).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Lead deletion (admin only)
// ---------------------------------------------------------------------------

describe('DELETE /api/leads/:id', () => {
  it('blocks members from deleting leads', async () => {
    const res = await request(app)
      .delete(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it('allows admins to delete leads', async () => {
    // Create a disposable lead to delete
    const createRes = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Delete Me', source: 'OTHER' });

    const deleteId = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/leads/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Confirm it's gone
    const getRes = await request(app)
      .get(`/api/leads/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });
});
