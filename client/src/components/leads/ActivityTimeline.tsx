import React from 'react';
import type { LeadActivity, LeadNote, LeadActivityType } from '@shared/types/lead';
import { timeAgo, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// A unified timeline entry — either an activity event or a note
type NoteEntry  = { kind: 'note';     data: LeadNote;     timestamp: string };
type EventEntry = { kind: 'activity'; data: LeadActivity; timestamp: string };
type TimelineEntry = NoteEntry | EventEntry;

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function ActivityIcon({ action }: { action: LeadActivityType }) {
  const base = 'h-3.5 w-3.5';

  switch (action) {
    case 'LEAD_CREATED':
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'STATUS_CHANGED':
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      );
    case 'ASSIGNED_MEMBER_CHANGED':
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'FOLLOW_UP_DATE_CHANGED':
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'NOTE_ADDED':
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'LEAD_DELETED':
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    default: // LEAD_UPDATED
      return (
        <svg className={cn(base, 'text-white')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
  }
}

function dotColor(action: LeadActivityType): string {
  switch (action) {
    case 'LEAD_CREATED':           return 'bg-brand-600';
    case 'STATUS_CHANGED':         return 'bg-purple-500';
    case 'ASSIGNED_MEMBER_CHANGED':return 'bg-blue-500';
    case 'FOLLOW_UP_DATE_CHANGED': return 'bg-yellow-500';
    case 'NOTE_ADDED':             return 'bg-gray-500';
    case 'LEAD_DELETED':           return 'bg-red-500';
    default:                       return 'bg-gray-400';
  }
}

// ---------------------------------------------------------------------------
// Human-readable activity text
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  NEW:           'New',
  CONTACTED:     'Contacted',
  QUALIFIED:     'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  WON:           'Won',
  LOST:          'Lost',
};

function ActivityText({ entry }: { entry: LeadActivity }) {
  const { action, metadata, user } = entry;
  const actor = <span className="font-medium text-gray-900">{user.name}</span>;

  switch (action) {
    case 'LEAD_CREATED':
      return <p className="text-sm text-gray-700">{actor} added this lead</p>;

    case 'STATUS_CHANGED': {
      const from = STATUS_LABELS[metadata?.oldValue ?? ''] ?? metadata?.oldValue;
      const to   = STATUS_LABELS[metadata?.newValue ?? ''] ?? metadata?.newValue;
      return (
        <p className="text-sm text-gray-700">
          {actor} changed status from{' '}
          <span className="font-medium">{from}</span> to{' '}
          <span className="font-medium">{to}</span>
        </p>
      );
    }

    case 'ASSIGNED_MEMBER_CHANGED': {
      const oldName = metadata?.oldValue;
      const newName = metadata?.newValue;
      if (!newName) {
        return <p className="text-sm text-gray-700">{actor} unassigned this lead</p>;
      }
      if (!oldName) {
        return (
          <p className="text-sm text-gray-700">
            {actor} assigned lead to <span className="font-medium">{newName}</span>
          </p>
        );
      }
      return (
        <p className="text-sm text-gray-700">
          {actor} reassigned lead from{' '}
          <span className="font-medium">{oldName}</span> to{' '}
          <span className="font-medium">{newName}</span>
        </p>
      );
    }

    case 'FOLLOW_UP_DATE_CHANGED': {
      const newDate = metadata?.newValue;
      if (!newDate) {
        return <p className="text-sm text-gray-700">{actor} cleared the follow-up date</p>;
      }
      return (
        <p className="text-sm text-gray-700">
          {actor} set follow-up to{' '}
          <span className="font-medium">{formatDate(newDate)}</span>
        </p>
      );
    }

    case 'NOTE_ADDED':
      return (
        <div>
          <p className="text-sm text-gray-700">{actor} added a note</p>
          {metadata?.newValue && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 italic">
              "{metadata.newValue}{(metadata.newValue?.length ?? 0) >= 120 ? '…' : ''}"
            </p>
          )}
        </div>
      );

    case 'LEAD_UPDATED':
      return <p className="text-sm text-gray-700">{actor} updated lead details</p>;

    case 'LEAD_DELETED':
      return <p className="text-sm text-gray-700">{actor} deleted this lead</p>;

    default:
      return <p className="text-sm text-gray-700">{actor} made a change</p>;
  }
}

// ---------------------------------------------------------------------------
// Note entry renderer
// ---------------------------------------------------------------------------

function NoteEntry({ note }: { note: LeadNote }) {
  return (
    <div className="flex gap-3">
      {/* Dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-500 ring-4 ring-white text-white text-xs font-semibold">
          {note.author?.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900">{note.author?.name}</span>
          <span className="text-xs text-gray-400">{timeAgo(note.createdAt)}</span>
        </div>
        <div className="mt-1.5 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="whitespace-pre-wrap text-sm text-gray-700">{note.body}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity entry renderer
// ---------------------------------------------------------------------------

function ActivityEntry({ activity }: { activity: LeadActivity }) {
  return (
    <div className="flex gap-3">
      {/* Dot with icon */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white',
            dotColor(activity.action),
          )}
        >
          <ActivityIcon action={activity.action} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <ActivityText entry={activity} />
          <span className="shrink-0 text-xs text-gray-400">{timeAgo(activity.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface ActivityTimelineProps {
  notes:      LeadNote[];
  activities: LeadActivity[];
}

export function ActivityTimeline({ notes, activities }: ActivityTimelineProps) {
  // Merge notes and activities into one list, newest first
  const entries: TimelineEntry[] = [
    ...notes.map((n): NoteEntry => ({
      kind: 'note',
      data: n,
      timestamp: n.createdAt,
    })),
    ...activities.map((a): EventEntry => ({
      kind: 'activity',
      data: a,
      timestamp: a.createdAt,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400">No activity yet.</p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" aria-hidden="true" />

      <div>
        {entries.map((entry) =>
          entry.kind === 'note' ? (
            <NoteEntry key={`note-${entry.data.id}`} note={entry.data} />
          ) : (
            <ActivityEntry key={`activity-${entry.data.id}`} activity={entry.data} />
          ),
        )}
      </div>
    </div>
  );
}
