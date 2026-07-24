import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLead, useUpdateLead, useAddNote } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import { ActivityTimeline } from '../../components/leads/ActivityTimeline';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge';
import { LeadSourceBadge } from '../../components/leads/LeadSourceBadge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime, timeAgo } from '../../lib/formatters';

const noteSchema = z.object({
  body: z.string().min(1, 'Note cannot be empty'),
});
type NoteFormData = z.infer<typeof noteSchema>;

const STATUS_OPTIONS = [
  { value: 'NEW',           label: 'New' },
  { value: 'CONTACTED',     label: 'Contacted' },
  { value: 'QUALIFIED',     label: 'Qualified' },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
  { value: 'WON',           label: 'Won' },
  { value: 'LOST',          label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: 'WEBSITE',       label: 'Website' },
  { value: 'REFERRAL',      label: 'Referral' },
  { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
  { value: 'EVENT',         label: 'Event' },
  { value: 'OTHER',         label: 'Other' },
];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d   = new Date(iso);
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading, isError } = useLead(id!);
  const { mutate: updateLead, isPending: isUpdating } = useUpdateLead(id!);
  const { mutateAsync: addNote } = useAddNote(id!);
  const { data: members } = useUsers();

  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...(members?.map((m) => ({ value: m.id, label: m.name })) ?? []),
  ];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormData>({ resolver: zodResolver(noteSchema) });

  async function onNoteSubmit(data: NoteFormData) {
    await addNote(data);
    reset();
  }

  function handleFollowUpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    updateLead({ followUpDate: val ? new Date(val).toISOString() : null });
  }

  function handleMarkContacted() {
    updateLead({ lastContactedAt: new Date().toISOString() });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Lead not found.</p>
        <Link to="/leads" className="mt-2 inline-block text-sm text-brand-600">
          ← Back to leads
        </Link>
      </div>
    );
  }

  const isOverdue =
    lead.followUpDate &&
    new Date(lead.followUpDate) < new Date() &&
    lead.status !== 'WON' &&
    lead.status !== 'LOST';

  const isClosed = lead.status === 'WON' || lead.status === 'LOST';

  const totalEvents = (lead.notes?.length ?? 0) + (lead.activities?.length ?? 0);

  return (
    <div className="p-8">
      <Link to="/leads" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
        ← Back to leads
      </Link>

      <div className="mt-4 flex gap-6">

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-6">

          {/* Header card */}
          <Card>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900">{lead.name}</h1>
                {lead.company && (
                  <p className="mt-0.5 text-sm text-gray-500">{lead.company}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Added by {lead.createdBy?.name} · {timeAgo(lead.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <LeadSourceBadge source={lead.source} />
                <LeadStatusBadge status={lead.status} />
              </div>
            </div>

            {/* Quick contact row */}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {lead.phone}
                </a>
              )}
              {lead.value != null && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ${Number(lead.value).toLocaleString()} deal value
                </span>
              )}
            </div>
          </Card>

          {/* Add note form */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Add a note</h3>
            <form onSubmit={handleSubmit(onNoteSubmit)} className="space-y-3">
              <Textarea
                placeholder="Log a call, email, meeting or update..."
                error={errors.body?.message}
                rows={3}
                {...register('body')}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Saving a note automatically updates "Last Contacted".
                </p>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  Save note
                </Button>
              </div>
            </form>
          </Card>

          {/* Activity timeline — notes + events merged, newest first */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Activity · {totalEvents} event{totalEvents !== 1 ? 's' : ''}
            </h2>
            <ActivityTimeline
              notes={lead.notes ?? []}
              activities={lead.activities ?? []}
            />
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────── */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Pipeline */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Pipeline</h3>
            <div className="space-y-3">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                defaultValue={lead.status}
                onChange={(e) => updateLead({ status: e.target.value })}
                disabled={isUpdating}
              />
              <Select
                label="Source"
                options={SOURCE_OPTIONS}
                defaultValue={lead.source}
                onChange={(e) => updateLead({ source: e.target.value })}
                disabled={isUpdating}
              />
            </div>
          </Card>

          {/* Assignment */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Assignment</h3>
            <Select
              label="Assigned member"
              options={memberOptions}
              defaultValue={lead.assignedToId ?? ''}
              onChange={(e) => updateLead({ assignedToId: e.target.value || null })}
              disabled={isUpdating}
            />
            {lead.assignedTo && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                  {lead.assignedTo.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{lead.assignedTo.name}</p>
                  <p className="text-xs text-gray-500">{lead.assignedTo.email}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Follow-up */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Follow-up</h3>
            <div className="space-y-3">
              <Input
                label="Follow-up date"
                type="date"
                defaultValue={toDateInputValue(lead.followUpDate)}
                onChange={handleFollowUpChange}
                disabled={isUpdating || isClosed}
              />
              {isOverdue && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  ⚠ Follow-up is overdue
                </p>
              )}
              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Last contacted</p>
                <p className="text-sm text-gray-800">
                  {lead.lastContactedAt
                    ? timeAgo(lead.lastContactedAt)
                    : <span className="text-gray-400">Never</span>}
                </p>
                {lead.lastContactedAt && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDateTime(lead.lastContactedAt)}
                  </p>
                )}
                {!isClosed && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 w-full"
                    isLoading={isUpdating}
                    onClick={handleMarkContacted}
                  >
                    Mark as contacted now
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Details */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Details</h3>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-gray-500">Created by</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{lead.createdBy?.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="mt-0.5 text-gray-700">{formatDateTime(lead.createdAt)}</dd>
              </div>
              {isClosed && lead.closedAt && (
                <div>
                  <dt className="text-gray-500">Closed</dt>
                  <dd className="mt-0.5 text-gray-700">{formatDateTime(lead.closedAt)}</dd>
                </div>
              )}
              {lead.tags && lead.tags.length > 0 && (
                <div>
                  <dt className="text-gray-500">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {lead.tags.map((t: any) => (
                      <span
                        key={t.name}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {t.name}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
