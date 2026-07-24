import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';

const schema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().max(200).optional(),
  email:   z.string().email('Enter a valid email address'),
  phone:   z.string().max(50).optional(),
  message: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

/**
 * Publicly accessible lead capture form — no login required.
 * Prospects submit their details and a lead is created in the CRM automatically.
 */
export function CapturePage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      await axios.post('/api/leads/capture', data);
      setSubmitted(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ?? 'Something went wrong. Please try again.';
      setError('root', { message });
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Thank you!</h1>
          <p className="mt-2 text-sm text-gray-500">
            We've received your details and will be in touch soon.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Sign in to your account →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Get in touch</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in your details and our team will reach out shortly.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {errors.root && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                {errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                placeholder="Jane Smith"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Company"
                placeholder="Acme Corp"
                autoComplete="organization"
                error={errors.company?.message}
                {...register('company')}
              />
            </div>

            <Input
              label="Work email"
              type="email"
              placeholder="jane@acmecorp.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone number"
              type="tel"
              placeholder="+1 555 0100"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Textarea
              label="How can we help?"
              placeholder="Tell us briefly what you're looking for..."
              rows={3}
              error={errors.message?.message}
              {...register('message')}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Send message
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
