import React from 'react';
import { Badge } from '../ui/Badge';

type LeadSource = 'WEBSITE' | 'REFERRAL' | 'COLD_OUTREACH' | 'EVENT' | 'OTHER';

const sourceConfig: Record<LeadSource, { label: string; variant: React.ComponentProps<typeof Badge>['variant'] }> = {
  WEBSITE:      { label: 'Website',       variant: 'info' },
  REFERRAL:     { label: 'Referral',      variant: 'success' },
  COLD_OUTREACH:{ label: 'Cold Outreach', variant: 'warning' },
  EVENT:        { label: 'Event',         variant: 'purple' },
  OTHER:        { label: 'Other',         variant: 'default' },
};

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  const config = sourceConfig[source] ?? sourceConfig.OTHER;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
