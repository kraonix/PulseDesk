import { LeadActivityType, Prisma } from '@prisma/client';
import { prisma } from '../../database/client';

export interface ActivityMetadata {
  field?:    string;
  oldValue?: string | null;
  newValue?: string | null;
  // Index signature required for Prisma's InputJsonValue compatibility
  [key: string]: string | null | undefined;
}

/**
 * Writes a LeadActivity record inside an existing Prisma transaction client
 * or the global prisma client when called outside a transaction.
 *
 * Always called from within a service function — never from a controller.
 */
export async function recordActivity(
  params: {
    leadId:   string;
    userId:   string;
    action:   LeadActivityType;
    metadata?: ActivityMetadata;
  },
  tx: Prisma.TransactionClient = prisma,
) {
  return tx.leadActivity.create({
    data: {
      leadId:   params.leadId,
      userId:   params.userId,
      action:   params.action,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  });
}
