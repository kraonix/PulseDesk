import { PrismaClient, UserRole, LeadStatus, LeadSource, LeadActivityType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helpers
const ago  = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
const from = (days: number) => new Date(Date.now() + days * 86_400_000);

async function main() {
  console.log('🌱 Seeding PulseDesk...');

  // ── Organisation ───────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: 'Acme Corp', slug: 'acme-corp' },
  });

  const hash = await bcrypt.hash('Password123!', 12);

  // ── Users ──────────────────────────────────────────────────────────
  const alice = await prisma.user.create({
    data: {
      email: 'admin@pulsedesk.dev',
      name: 'Alice Admin',
      passwordHash: hash,
      role: UserRole.ADMIN,
      organizationId: org.id,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'member@pulsedesk.dev',
      name: 'Bob Member',
      passwordHash: hash,
      role: UserRole.MEMBER,
      organizationId: org.id,
    },
  });

  // ── Lead helper ────────────────────────────────────────────────────
  // Creates a lead then immediately logs LEAD_CREATED activity
  async function createLead(data: Parameters<typeof prisma.lead.create>[0]['data']) {
    const lead = await prisma.lead.create({ data: data as any });
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: (data as any).createdById,
        action: LeadActivityType.LEAD_CREATED,
        createdAt: lead.createdAt,
      },
    });
    return lead;
  }

  async function addActivity(data: {
    leadId: string;
    userId: string;
    action: LeadActivityType;
    metadata?: Record<string, string | null>;
    createdAt: Date;
  }) {
    return prisma.leadActivity.create({ data });
  }

  async function addNote(data: {
    leadId: string;
    authorId: string;
    body: string;
    createdAt: Date;
  }) {
    const note = await prisma.leadNote.create({ data });
    await prisma.leadActivity.create({
      data: {
        leadId: data.leadId,
        userId: data.authorId,
        action: LeadActivityType.NOTE_ADDED,
        metadata: { newValue: data.body.slice(0, 120) },
        createdAt: new Date(data.createdAt.getTime() + 1000),
      },
    });
    return note;
  }

  // ── Lead 1 — Sarah Johnson — CONTACTED, follow-up tomorrow ─────────
  const lead1 = await createLead({
    name: 'Sarah Johnson',
    company: 'Bright Futures Ltd',
    email: 'sarah.j@brightfutures.com',
    phone: '+1 555 0101',
    status: LeadStatus.NEW,
    source: LeadSource.REFERRAL,
    value: 12000,
    organizationId: org.id,
    createdById: alice.id,
    assignedToId: alice.id,
    createdAt: ago(10),
    updatedAt: ago(10),
  });

  await addActivity({
    leadId: lead1.id,
    userId: alice.id,
    action: LeadActivityType.ASSIGNED_MEMBER_CHANGED,
    metadata: { field: 'assignedTo', oldValue: null, newValue: bob.name },
    createdAt: ago(10),
  });

  await prisma.lead.update({
    where: { id: lead1.id },
    data: { assignedToId: bob.id },
  });

  await addActivity({
    leadId: lead1.id,
    userId: bob.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'NEW', newValue: 'CONTACTED' },
    createdAt: ago(8),
  });

  await prisma.lead.update({
    where: { id: lead1.id },
    data: { status: LeadStatus.CONTACTED },
  });

  await addNote({
    leadId: lead1.id,
    authorId: bob.id,
    body: 'Had a great intro call. Sarah is interested in the enterprise plan. Will send pricing breakdown on Tuesday.',
    createdAt: ago(8),
  });

  await addActivity({
    leadId: lead1.id,
    userId: bob.id,
    action: LeadActivityType.FOLLOW_UP_DATE_CHANGED,
    metadata: { field: 'followUpDate', oldValue: null, newValue: from(1).toISOString() },
    createdAt: ago(8),
  });

  await addNote({
    leadId: lead1.id,
    authorId: bob.id,
    body: 'Sent pricing deck via email. Sarah confirmed receipt and will review before our Tuesday call.',
    createdAt: ago(2),
  });

  await prisma.lead.update({
    where: { id: lead1.id },
    data: {
      followUpDate: from(1),
      lastContactedAt: ago(2),
    },
  });

  // ── Lead 2 — Marcus Chen — QUALIFIED, overdue follow-up ────────────
  const lead2 = await createLead({
    name: 'Marcus Chen',
    company: 'Chen Analytics',
    email: 'marcus@chenanalytics.io',
    status: LeadStatus.NEW,
    source: LeadSource.WEBSITE,
    value: 28500,
    organizationId: org.id,
    createdById: bob.id,
    assignedToId: bob.id,
    createdAt: ago(14),
    updatedAt: ago(14),
  });

  await addActivity({
    leadId: lead2.id,
    userId: bob.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'NEW', newValue: 'CONTACTED' },
    createdAt: ago(12),
  });

  await addNote({
    leadId: lead2.id,
    authorId: bob.id,
    body: 'Cold outreach — Marcus responded positively. Booked a demo for next week.',
    createdAt: ago(12),
  });

  await addActivity({
    leadId: lead2.id,
    userId: bob.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'CONTACTED', newValue: 'QUALIFIED' },
    createdAt: ago(7),
  });

  await addNote({
    leadId: lead2.id,
    authorId: bob.id,
    body: 'Demo completed. Marcus confirmed budget and authority. He wants a custom integration proposal by end of month.',
    createdAt: ago(7),
  });

  await addActivity({
    leadId: lead2.id,
    userId: bob.id,
    action: LeadActivityType.LEAD_UPDATED,
    createdAt: ago(7),
  });

  await addActivity({
    leadId: lead2.id,
    userId: bob.id,
    action: LeadActivityType.FOLLOW_UP_DATE_CHANGED,
    metadata: { field: 'followUpDate', oldValue: null, newValue: ago(1).toISOString() },
    createdAt: ago(7),
  });

  await prisma.lead.update({
    where: { id: lead2.id },
    data: {
      status: LeadStatus.QUALIFIED,
      followUpDate: ago(1), // intentionally overdue
      lastContactedAt: ago(5),
    },
  });

  // ── Lead 3 — Priya Sharma — WON, full pipeline journey ─────────────
  const lead3 = await createLead({
    name: 'Priya Sharma',
    company: 'NovaTech Solutions',
    email: 'priya.s@novatech.co',
    phone: '+1 555 0303',
    status: LeadStatus.NEW,
    source: LeadSource.EVENT,
    value: 45000,
    organizationId: org.id,
    createdById: alice.id,
    assignedToId: alice.id,
    createdAt: ago(30),
    updatedAt: ago(30),
  });

  await addNote({
    leadId: lead3.id,
    authorId: alice.id,
    body: 'Met Priya at TechSummit 2025. She runs IT procurement at NovaTech. Very interested in our annual license.',
    createdAt: ago(30),
  });

  await addActivity({
    leadId: lead3.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'NEW', newValue: 'CONTACTED' },
    createdAt: ago(25),
  });

  await addNote({
    leadId: lead3.id,
    authorId: alice.id,
    body: 'Discovery call done. Priya confirmed 3 teams (50 seats) would use the product. Sent a calendar invite for a full demo.',
    createdAt: ago(25),
  });

  await addActivity({
    leadId: lead3.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'CONTACTED', newValue: 'QUALIFIED' },
    createdAt: ago(18),
  });

  await addNote({
    leadId: lead3.id,
    authorId: alice.id,
    body: 'Full demo delivered to Priya and two colleagues. All three were very engaged. Priya asked about SSO support — confirmed yes.',
    createdAt: ago(18),
  });

  await addActivity({
    leadId: lead3.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'QUALIFIED', newValue: 'PROPOSAL_SENT' },
    createdAt: ago(12),
  });

  await addNote({
    leadId: lead3.id,
    authorId: alice.id,
    body: 'Sent formal proposal: 50 seats × $900/yr = $45,000. Included 30-day onboarding support and dedicated CSM.',
    createdAt: ago(12),
  });

  await addActivity({
    leadId: lead3.id,
    userId: alice.id,
    action: LeadActivityType.FOLLOW_UP_DATE_CHANGED,
    metadata: { field: 'followUpDate', oldValue: null, newValue: ago(8).toISOString() },
    createdAt: ago(12),
  });

  await addNote({
    leadId: lead3.id,
    authorId: alice.id,
    body: "Follow-up call — Priya's board approved the spend. Legal is reviewing the MSA. Expected sign-off by end of week.",
    createdAt: ago(8),
  });

  await addActivity({
    leadId: lead3.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'PROPOSAL_SENT', newValue: 'WON' },
    createdAt: ago(5),
  });

  await addNote({
    leadId: lead3.id,
    authorId: alice.id,
    body: 'Contract signed! 🎉 Onboarding call scheduled for next Monday. Introducing the CSM team this week.',
    createdAt: ago(5),
  });

  await prisma.lead.update({
    where: { id: lead3.id },
    data: {
      status: LeadStatus.WON,
      closedAt: ago(5),
      lastContactedAt: ago(5),
    },
  });

  // ── Lead 4 — Tom Bradley — NEW, just created ───────────────────────
  const lead4 = await createLead({
    name: 'Tom Bradley',
    company: 'Bradley Consulting',
    email: 'tom@bradleyconsulting.net',
    status: LeadStatus.NEW,
    source: LeadSource.COLD_OUTREACH,
    organizationId: org.id,
    createdById: bob.id,
    assignedToId: bob.id,
    followUpDate: from(7),
    createdAt: ago(3),
    updatedAt: ago(3),
  });

  await addActivity({
    leadId: lead4.id,
    userId: bob.id,
    action: LeadActivityType.FOLLOW_UP_DATE_CHANGED,
    metadata: { field: 'followUpDate', oldValue: null, newValue: from(7).toISOString() },
    createdAt: ago(3),
  });

  await addNote({
    leadId: lead4.id,
    authorId: bob.id,
    body: 'Found Tom on LinkedIn. His firm recently expanded — potentially 20 seats. Sent initial connection request.',
    createdAt: ago(3),
  });

  // ── Lead 5 — Elena Vasquez — PROPOSAL_SENT, follow-up tomorrow ─────
  const lead5 = await createLead({
    name: 'Elena Vasquez',
    company: 'Vasquez Media Group',
    email: 'elena@vasquezmedia.com',
    phone: '+1 555 0505',
    status: LeadStatus.NEW,
    source: LeadSource.REFERRAL,
    value: 18750,
    organizationId: org.id,
    createdById: alice.id,
    assignedToId: alice.id,
    createdAt: ago(7),
    updatedAt: ago(7),
  });

  await addNote({
    leadId: lead5.id,
    authorId: alice.id,
    body: 'Referred by Priya Sharma (NovaTech). Elena runs content ops for a 150-person media group. Intro email sent.',
    createdAt: ago(7),
  });

  await addActivity({
    leadId: lead5.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'NEW', newValue: 'CONTACTED' },
    createdAt: ago(6),
  });

  await addNote({
    leadId: lead5.id,
    authorId: alice.id,
    body: 'Quick call with Elena. She liked the pitch — wants to see ROI numbers before committing. Scheduled a product walkthrough.',
    createdAt: ago(6),
  });

  await addActivity({
    leadId: lead5.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'CONTACTED', newValue: 'QUALIFIED' },
    createdAt: ago(4),
  });

  await addNote({
    leadId: lead5.id,
    authorId: alice.id,
    body: 'Product walkthrough went great. Elena confirmed 25 seats for the editorial team. Budget is pre-approved.',
    createdAt: ago(4),
  });

  await addActivity({
    leadId: lead5.id,
    userId: alice.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'QUALIFIED', newValue: 'PROPOSAL_SENT' },
    createdAt: ago(1),
  });

  await addNote({
    leadId: lead5.id,
    authorId: alice.id,
    body: "Sent proposal for the 12-month retainer: 25 seats × $750/yr = $18,750. Elena said she'll review with her board this week.",
    createdAt: ago(1),
  });

  await addActivity({
    leadId: lead5.id,
    userId: alice.id,
    action: LeadActivityType.FOLLOW_UP_DATE_CHANGED,
    metadata: { field: 'followUpDate', oldValue: null, newValue: from(1).toISOString() },
    createdAt: ago(1),
  });

  await prisma.lead.update({
    where: { id: lead5.id },
    data: {
      status: LeadStatus.PROPOSAL_SENT,
      followUpDate: from(1),
      lastContactedAt: ago(1),
    },
  });

  // ── Lead 6 — James Okafor — LOST ───────────────────────────────────
  const lead6 = await createLead({
    name: 'James Okafor',
    company: 'Okafor Industries',
    email: 'j.okafor@okafor-ind.com',
    phone: '+1 555 0606',
    status: LeadStatus.NEW,
    source: LeadSource.COLD_OUTREACH,
    value: 9500,
    organizationId: org.id,
    createdById: bob.id,
    assignedToId: bob.id,
    createdAt: ago(20),
    updatedAt: ago(20),
  });

  await addActivity({
    leadId: lead6.id,
    userId: bob.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'NEW', newValue: 'CONTACTED' },
    createdAt: ago(18),
  });

  await addNote({
    leadId: lead6.id,
    authorId: bob.id,
    body: 'Left voicemail and sent email. James replied briefly — said he was busy but to follow up in two weeks.',
    createdAt: ago(18),
  });

  await addActivity({
    leadId: lead6.id,
    userId: bob.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'CONTACTED', newValue: 'QUALIFIED' },
    createdAt: ago(10),
  });

  await addNote({
    leadId: lead6.id,
    authorId: bob.id,
    body: 'Finally got James on a call. He is interested but said his IT team has concerns about data residency. Sent compliance FAQ.',
    createdAt: ago(10),
  });

  await addNote({
    leadId: lead6.id,
    authorId: bob.id,
    body: 'James came back after IT review. They decided to go with an on-premise vendor instead. Marking as lost.',
    createdAt: ago(3),
  });

  await addActivity({
    leadId: lead6.id,
    userId: bob.id,
    action: LeadActivityType.STATUS_CHANGED,
    metadata: { field: 'status', oldValue: 'QUALIFIED', newValue: 'LOST' },
    createdAt: ago(3),
  });

  await prisma.lead.update({
    where: { id: lead6.id },
    data: {
      status: LeadStatus.LOST,
      closedAt: ago(3),
      lastContactedAt: ago(3),
    },
  });

  console.log('');
  console.log('✅ Seed complete');
  console.log('');
  console.log('  Organisation : Acme Corp');
  console.log('  Leads created: 6');
  console.log('');
  console.log('  Credentials:');
  console.log('    Admin:  admin@pulsedesk.dev  / Password123!');
  console.log('    Member: member@pulsedesk.dev / Password123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
