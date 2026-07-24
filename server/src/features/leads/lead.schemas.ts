import { z } from 'zod';
import { LeadSource, LeadStatus } from '@prisma/client';

export const createLeadSchema = z.object({
  name:           z.string().min(2, 'Name must be at least 2 characters').max(200),
  company:        z.string().max(200).optional(),
  email:          z.string().email('Invalid email address').optional(),
  phone:          z.string().max(50).optional(),
  source:         z.nativeEnum(LeadSource).default('OTHER'),
  value:          z.coerce.number().nonnegative().optional(),
  assignedToId:   z.string().optional(),
  followUpDate:   z.string().datetime({ offset: true }).optional(),
  tags:           z.array(z.string().max(30)).max(10).optional(),
});

export const updateLeadSchema = z.object({
  name:             z.string().min(2).max(200).optional(),
  company:          z.string().max(200).optional(),
  email:            z.string().email().optional(),
  phone:            z.string().max(50).optional(),
  status:           z.nativeEnum(LeadStatus).optional(),
  source:           z.nativeEnum(LeadSource).optional(),
  value:            z.coerce.number().nonnegative().optional(),
  assignedToId:     z.string().nullable().optional(),
  followUpDate:     z.string().datetime({ offset: true }).nullable().optional(),
  lastContactedAt:  z.string().datetime({ offset: true }).nullable().optional(),
  tags:             z.array(z.string().max(30)).max(10).optional(),
});

export const listLeadsQuerySchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  pageSize:     z.coerce.number().int().min(1).max(100).default(20),
  status:       z.nativeEnum(LeadStatus).optional(),
  source:       z.nativeEnum(LeadSource).optional(),
  assignedToId: z.string().optional(),
  search:       z.string().max(200).optional(),
});

export const createNoteSchema = z.object({
  body: z.string().min(1, 'Note cannot be empty').max(5000),
});

export type CreateLeadInput   = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput   = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery    = z.infer<typeof listLeadsQuerySchema>;
export type CreateNoteInput   = z.infer<typeof createNoteSchema>;
