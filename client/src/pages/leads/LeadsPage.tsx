import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeads } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge';
import { LeadSourceBadge } from '../../components/leads/LeadSourceBadge';
import { Spinner } from '../../components/ui/Spinner';
import { timeAgo, formatDate } from '../../lib/formatters';

const STATUS_OPTIONS = [
  { value: '',               label: 'All statuses' },
  { value: 'NEW',            label: 'New' },
  { value: 'CONTACTED',      label: 'Contacted' },
  { value: 'QUALIFIED',      label: 'Qualified' },
  { value: 'PROPOSAL_SENT',  label: 'Proposal Sent' },
  { value: 'WON',            label: 'Won' },
  { value: 'LOST',           label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: '',               label: 'All sources' },
  { value: 'WEBSITE',        label: 'Website' },
  { value: 'REFERRAL',       label: 'Referral' },
  { value: 'COLD_OUTREACH',  label: 'Cold Outreach' },
  { value: 'EVENT',          label: 'Event' },
  { value: 'OTHER',          label: 'Other' },
];

export function LeadsPage() {
  const { user } = useAuth();
  const [search, setSearch]           = useState('');
  const [status, setStatus]           = useState('');
  const [source, setSource]           = useState('');
  const [assignedToId, setAssignedTo] = useState('');
  const [page, setPage]               = useState(1);

  const { data, isLoading, isError } = useLeads({
    search, status, source, assignedToId, page, pageSize: 20,
  });

  // Members list for the assign filter — only admins need to filter by member
  const { data: members } = useUsers();
  const memberOptions = [
    { value: '',  label: 'All members' },
    ...(members?.map((m) => ({ value: m.id, label: m.name })) ?? []),
  ];

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `${data.total} lead${data.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link to="/leads/new">
          <Button>Add Lead</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Input
            placeholder="Search name, company, email..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Search leads"
          />
        </div>
        <div className="w-40">
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter by status"
          />
        </div>
        <div className="w-40">
          <Select
            options={SOURCE_OPTIONS}
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            aria-label="Filter by source"
          />
        </div>
        {user?.role === 'ADMIN' && (
          <div className="w-44">
            <Select
              options={memberOptions}
              value={assignedToId}
              onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }}
              aria-label="Filter by assigned member"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">
            Failed to load leads. Please try again.
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-medium text-gray-700">No leads found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or{' '}
              <Link to="/leads/new" className="text-brand-600 hover:underline">add a lead</Link>.
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Follow-up</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Last Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data?.items?.map((lead: any) => {
                  const isOverdue =
                    lead.followUpDate &&
                    new Date(lead.followUpDate) < new Date() &&
                    lead.status !== 'WON' &&
                    lead.status !== 'LOST';

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/leads/${lead.id}`} className="group">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                            {lead.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {lead.company ?? 'No company'} · {lead.email ?? 'No email'}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-4">
                        <LeadSourceBadge source={lead.source} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {lead.value != null
                          ? `$${Number(lead.value).toLocaleString()}`
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {lead.assignedTo?.name ?? <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {lead.followUpDate ? (
                          <span className={isOverdue ? 'font-medium text-red-600' : 'text-gray-700'}>
                            {formatDate(lead.followUpDate)}
                            {isOverdue && ' ⚠'}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {lead.lastContactedAt
                          ? timeAgo(lead.lastContactedAt)
                          : <span className="text-gray-400">Never</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
                <p className="text-sm text-gray-500">
                  Page {data.page} of {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
