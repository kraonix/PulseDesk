import { Prisma, LeadStatus, LeadActivityType } from '@prisma/client';
import { prisma } from '../../database/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';
import { recordActivity } from './lead.activity';
import {
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsQuery,
  CreateNoteInput,
} from './lead.schemas';

// ---------------------------------------------------------------------------
// Shared selects
// ---------------------------------------------------------------------------

const leadSelect = {
  id:              true,
  name:            true,
  company:         true,
  email:           true,
  phone:           true,
  status:          true,
  source:          true,
  value:           true,
  organizationId:  true,
  createdById:     true,
  assignedToId:    true,
  followUpDate:    true,
  lastContactedAt: true,
  closedAt:        true,
  createdAt:       true,
  updatedAt:       true,
  createdBy:  { select: { id: true, name: true, email: true, avatarUrl: true } },
  assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
  tags:       { select: { name: true } },
  _count:     { select: { notes: true } },
} satisfies Prisma.LeadSelect;

const activitySelect = {
  id:        true,
  action:    true,
  metadata:  true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
} satisfies Prisma.LeadActivitySelect;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listLeads(query: ListLeadsQuery, _requestor: JwtPayload) {
  const { page, pageSize, status, source, assignedToId, search } = query;
  const skip = (page - 1) * pageSize;

  const where: Prisma.LeadWhereInput = {
    ...(status       && { status }),
    ...(source       && { source }),
    ...(assignedToId && { assignedToId }),
    ...(search && {
      OR: [
        { name:    { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email:   { contains: search, mode: 'insensitive' } },
        { phone:   { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: leadSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getLead(id: string, _requestor: JwtPayload) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      ...leadSelect,
      notes: {
        select: {
          id:        true,
          body:      true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      activities: {
        select: activitySelect,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!lead) throw new NotFoundError('Lead');
  return lead;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createLead(input: CreateLeadInput, requestor: JwtPayload) {
  const user = await prisma.user.findUnique({
    where: { id: requestor.sub },
    select: { organizationId: true },
  });

  if (!user?.organizationId) {
    throw new ForbiddenError('You must belong to an organization to create leads');
  }

  const { tags, value, followUpDate, assignedToId, ...rest } = input;

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        ...rest,
        ...(value        !== undefined && { value }),
        ...(followUpDate !== undefined && { followUpDate: new Date(followUpDate) }),
        organizationId: user.organizationId!,
        createdById:    requestor.sub,
        assignedToId:   assignedToId ?? requestor.sub,
        ...(tags && { tags: { create: tags.map((name) => ({ name })) } }),
      },
      select: leadSelect,
    });

    await recordActivity(
      { leadId: created.id, userId: requestor.sub, action: LeadActivityType.LEAD_CREATED },
      tx,
    );

    return created;
  });

  return lead;
}

export async function updateLead(
  id: string,
  input: UpdateLeadInput,
  requestor: JwtPayload,
) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  if (!lead) throw new NotFoundError('Lead');

  const { tags, value, followUpDate, lastContactedAt, ...rest } = input;

  // Auto-manage closedAt on terminal status transitions
  const isClosing =
    (input.status === LeadStatus.WON || input.status === LeadStatus.LOST) &&
    lead.status !== LeadStatus.WON &&
    lead.status !== LeadStatus.LOST;

  const isReopening =
    input.status &&
    input.status !== LeadStatus.WON &&
    input.status !== LeadStatus.LOST &&
    (lead.status === LeadStatus.WON || lead.status === LeadStatus.LOST);

  const closedAt = isClosing ? new Date() : isReopening ? null : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.lead.update({
      where: { id },
      data: {
        ...rest,
        ...(value           !== undefined && { value }),
        ...(followUpDate    !== undefined && {
          followUpDate: followUpDate ? new Date(followUpDate) : null,
        }),
        ...(lastContactedAt !== undefined && {
          lastContactedAt: lastContactedAt ? new Date(lastContactedAt) : null,
        }),
        ...(closedAt !== undefined && { closedAt }),
        ...(tags && {
          tags: { deleteMany: {}, create: tags.map((name) => ({ name })) },
        }),
      },
      select: leadSelect,
    });

    // --- Emit specific activity events for meaningful changes ---

    if (input.status && input.status !== lead.status) {
      await recordActivity({
        leadId: id,
        userId: requestor.sub,
        action: LeadActivityType.STATUS_CHANGED,
        metadata: { field: 'status', oldValue: lead.status, newValue: input.status },
      }, tx);
    }

    if ('assignedToId' in input && input.assignedToId !== lead.assignedToId) {
      const oldName = lead.assignedTo?.name ?? null;
      // Fetch new assignee name if set
      let newName: string | null = null;
      if (input.assignedToId) {
        const newUser = await tx.user.findUnique({
          where: { id: input.assignedToId },
          select: { name: true },
        });
        newName = newUser?.name ?? null;
      }
      await recordActivity({
        leadId: id,
        userId: requestor.sub,
        action: LeadActivityType.ASSIGNED_MEMBER_CHANGED,
        metadata: { field: 'assignedTo', oldValue: oldName, newValue: newName },
      }, tx);
    }

    if ('followUpDate' in input) {
      const oldDate = lead.followUpDate?.toISOString() ?? null;
      const newDate = followUpDate ?? null;
      if (oldDate !== newDate) {
        await recordActivity({
          leadId: id,
          userId: requestor.sub,
          action: LeadActivityType.FOLLOW_UP_DATE_CHANGED,
          metadata: { field: 'followUpDate', oldValue: oldDate, newValue: newDate },
        }, tx);
      }
    }

    // Generic LEAD_UPDATED for any other field changes (name, company, email, etc.)
    const genericFields = ['name', 'company', 'email', 'phone', 'source', 'value'] as const;
    const hasGenericChange = genericFields.some(
      (f) => f in input && String((input as any)[f]) !== String((lead as any)[f]),
    );
    if (hasGenericChange) {
      await recordActivity({
        leadId: id,
        userId: requestor.sub,
        action: LeadActivityType.LEAD_UPDATED,
      }, tx);
    }

    return result;
  });

  return updated;
}

export async function addNote(
  leadId: string,
  input: CreateNoteInput,
  requestor: JwtPayload,
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new NotFoundError('Lead');

  const [note] = await prisma.$transaction(async (tx) => {
    const created = await tx.leadNote.create({
      data: { leadId, authorId: requestor.sub, body: input.body },
      select: {
        id:        true,
        leadId:    true,
        body:      true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await tx.lead.update({
      where: { id: leadId },
      data:  { lastContactedAt: new Date() },
    });

    await recordActivity({
      leadId,
      userId: requestor.sub,
      action: LeadActivityType.NOTE_ADDED,
      metadata: { newValue: input.body.slice(0, 120) },
    }, tx);

    return [created];
  });

  return note;
}

export async function deleteLead(id: string, requestor: JwtPayload) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('Lead');

  // Record the activity first, before cascade-deleting the lead
  await recordActivity({
    leadId: id,
    userId: requestor.sub,
    action: LeadActivityType.LEAD_DELETED,
    metadata: { oldValue: lead.name },
  });

  await prisma.lead.delete({ where: { id } });
}
