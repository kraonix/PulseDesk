import React from 'react';
import { Badge } from '../ui/Badge';
import type { LeadStatus } from '@shared/types/lead';

const statusConfig: Record<LeadStatus, { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }> = {
  NEW:           { label: 'New',           variant: 'info' },
  CONTACTED:     { label: 'Contacted',     variant: 'warning' },
  QUALIFIED:     { label: 'Qualified',     variant: 'purple' },
  PROPOSAL_SENT: { label: 'Proposal Sent', variant: 'default' },
  WON:           { label: 'Won',           variant: 'success' },
  LOST:          { label: 'Lost',          variant: 'danger' },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status] ?? statusConfig.NEW;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
