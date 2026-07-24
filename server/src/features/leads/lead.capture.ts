import { z } from 'zod';
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/client';
import { sendSuccess } from '../../lib/response';
import { AppError } from '../../lib/errors';
import { LeadSource, UserRole } from '@prisma/client';

/**
 * Public lead capture schema — minimal required fields only.
 * No auth required; anyone can submit.
 */
export const captureLeadSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters').max(200),
  company: z.string().max(200).optional(),
  email:   z.string().email('Enter a valid email'),
  phone:   z.string().max(50).optional(),
  message: z.string().max(1000).optional(),
});

export type CaptureLeadInput = z.infer<typeof captureLeadSchema>;

/**
 * POST /api/leads/capture
 *
 * Public endpoint — no authentication required.
 * Creates a NEW lead sourced from WEBSITE and assigns it to the first Admin
 * found in the database. In a real multi-tenant deployment this would be
 * scoped to an org via a public API key or subdomain.
 */
export async function captureLeadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = captureLeadSchema.parse(req.body);

    // Find the first admin to act as default owner for captured leads
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true, organizationId: true },
    });

    if (!admin?.organizationId) {
      throw new AppError('No organisation configured to receive leads', 503);
    }

    const lead = await prisma.lead.create({
      data: {
        name:           input.name,
        company:        input.company ?? null,
        email:          input.email,
        phone:          input.phone ?? null,
        source:         LeadSource.WEBSITE,
        organizationId: admin.organizationId,
        createdById:    admin.id,
        assignedToId:   admin.id,
      },
      select: {
        id:        true,
        name:      true,
        company:   true,
        email:     true,
        createdAt: true,
      },
    });

    // Log an initial note if a message was included
    if (input.message?.trim()) {
      await prisma.leadNote.create({
        data: {
          leadId:   lead.id,
          authorId: admin.id,
          body:     `Message from capture form:\n\n${input.message.trim()}`,
        },
      });
    }

    // Write LEAD_CREATED activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: admin.id,
        action: 'LEAD_CREATED',
      },
    });

    sendSuccess(
      res,
      { id: lead.id, name: lead.name },
      201,
      "Thanks! We'll be in touch soon.",
    );
  } catch (err) {
    next(err);
  }
}

export const captureRouter = Router();

captureRouter.post('/', captureLeadHandler);
