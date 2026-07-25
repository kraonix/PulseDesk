import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { LeadStatusBadge } from '../components/leads/LeadStatusBadge';
import { LeadSourceBadge } from '../components/leads/LeadSourceBadge';
import { Spinner } from '../components/ui/Spinner';
import { timeAgo, formatDate } from '../lib/formatters';

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  const { data: allData }       = useLeads({ pageSize: 1 });
  const { data: newData }       = useLeads({ status: 'NEW',           pageSize: 1 });
  const { data: contactedData } = useLeads({ status: 'CONTACTED',     pageSize: 1 });
  const { data: qualifiedData } = useLeads({ status: 'QUALIFIED',     pageSize: 1 });
  const { data: proposalData }  = useLeads({ status: 'PROPOSAL_SENT', pageSize: 1 });
  const { data: wonData }       = useLeads({ status: 'WON',           pageSize: 1 });
  const { data: lostData }      = useLeads({ status: 'LOST',          pageSize: 1 });

  // Recent new leads for the activity feed
  const { data: recentData, isLoading: loadingRecent } = useLeads({
    status: 'NEW', pageSize: 6,
  });

  // Upcoming follow-ups: show all non-closed leads that have a followUpDate set
  const { data: followUpData, isLoading: loadingFollowUps } = useLeads({ pageSize: 5 });
  const upcomingFollowUps = followUpData?.items?.filter(
    (l: any) =>
      l.followUpDate &&
      l.status !== 'WON' &&
      l.status !== 'LOST',
  ) ?? [];

  return (
    <div className="flex min-h-screen flex-col justify-between p-8">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Good day, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">Here's your pipeline at a glance.</p>
        </div>

        {/* Pipeline stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total"     value={allData?.total       ?? 0} color="text-gray-900" />
          <StatCard label="New"       value={newData?.total       ?? 0} color="text-blue-600" />
          <StatCard label="Contacted" value={contactedData?.total ?? 0} color="text-yellow-600" />
          <StatCard label="Qualified" value={qualifiedData?.total ?? 0} color="text-purple-600" />
          <StatCard label="Proposal"  value={proposalData?.total  ?? 0} color="text-orange-500" />
          <StatCard label="Won"       value={wonData?.total       ?? 0} color="text-green-600"
            sub={lostData?.total ? `${lostData.total} lost` : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent new leads */}
          <Card padding="none">
            <CardHeader className="px-6 pt-5">
              <CardTitle>New Leads</CardTitle>
              <Link to="/leads?status=NEW" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </CardHeader>

            {loadingRecent ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : recentData?.items?.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No new leads.{' '}
                <Link to="/leads/new" className="text-brand-600 hover:underline">Add one</Link>.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentData?.items?.map((lead: any) => (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{lead.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {lead.company ?? 'No company'} · {timeAgo(lead.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <LeadSourceBadge source={lead.source} />
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming follow-ups */}
          <Card padding="none">
            <CardHeader className="px-6 pt-5">
              <CardTitle>Follow-ups Due</CardTitle>
              <Link to="/leads" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </CardHeader>

            {loadingFollowUps ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : upcomingFollowUps.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No follow-ups scheduled.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingFollowUps.map((lead: any) => {
                  const isOverdue = new Date(lead.followUpDate) < new Date();
                  return (
                    <Link
                      key={lead.id}
                      to={`/leads/${lead.id}`}
                      className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {lead.assignedTo?.name ?? 'Unassigned'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                          {isOverdue ? '⚠ ' : ''}{formatDate(lead.followUpDate)}
                        </p>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Mandatory Live Build Footer */}
      <footer className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
        <p>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:underline hover:text-brand-700"
          >
            Built for Digital Heroes Training Task
          </a>
        </p>
      </footer>
    </div>
  );
}