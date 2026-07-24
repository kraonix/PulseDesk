import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useCreateLead } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const schema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters').max(200),
  company:      z.string().max(200).optional(),
  email:        z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone:        z.string().max(50).optional(),
  source:       z.enum(['WEBSITE', 'REFERRAL', 'COLD_OUTREACH', 'EVENT', 'OTHER']).default('OTHER'),
  value:        z.coerce.number().nonnegative('Must be a positive number').optional(),
  assignedToId: z.string().optional(),
  followUpDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const SOURCE_OPTIONS = [
  { value: 'WEBSITE',       label: 'Website' },
  { value: 'REFERRAL',      label: 'Referral' },
  { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
  { value: 'EVENT',         label: 'Event' },
  { value: 'OTHER',         label: 'Other' },
];

export function NewLeadPage() {
  const navigate = useNavigate();
  const { mutateAsync: createLead, isPending } = useCreateLead();
  const { data: members } = useUsers();

  const memberOptions = [
    { value: '',  label: 'Assign to me' },
    ...(members?.map((m) => ({ value: m.id, label: m.name })) ?? []),
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: 'OTHER' },
  });

  async function onSubmit(data: FormData) {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v === '' || v === undefined) continue;
      if (k === 'followUpDate' && typeof v === 'string') {
        // Convert local date string to ISO datetime
        payload[k] = new Date(v).toISOString();
      } else {
        payload[k] = v;
      }
    }
    const lead = await createLead(payload);
    navigate(`/leads/${lead.id}`);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/leads" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← Back to leads
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Add Lead</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the contact details and track the opportunity from here.
        </p>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

          {/* Contact info */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full name"
              placeholder="Jane Smith"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Company"
              placeholder="Acme Corp"
              error={errors.company?.message}
              {...register('company')}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              placeholder="jane@acmecorp.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 555 0100"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          {/* Lead details */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              label="Lead source"
              options={SOURCE_OPTIONS}
              error={errors.source?.message}
              {...register('source')}
            />
            <Input
              label="Deal value ($)"
              type="number"
              min="0"
              placeholder="10000"
              error={errors.value?.message}
              hint="Estimated value in USD"
              {...register('value')}
            />
          </div>

          {/* Assignment + follow-up */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              label="Assign to"
              options={memberOptions}
              error={errors.assignedToId?.message}
              {...register('assignedToId')}
            />
            <Input
              label="Follow-up date"
              type="date"
              error={errors.followUpDate?.message}
              hint="Schedule a follow-up reminder"
              {...register('followUpDate')}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting || isPending}>
              Save Lead
            </Button>
            <Link to="/leads">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
