'use client';

import * as React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EventForm } from '@/components/events/EventForm';
import { useEventCategories, useCreateEvent } from '@/hooks/useEvents';
import type { CreateEventInput } from '@/lib/validations/event';

export default function NewEventPage() {
  const { data: categoriesData } = useEventCategories();
  const createEvent = useCreateEvent();

  const categories = categoriesData?.data ?? [];

  const handleSubmit = async (data: CreateEventInput) => {
    return createEvent.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Event"
        description="Build a new event for your members."
        breadcrumbs={[
          { label: 'Events', href: '/dashboard/events' },
          { label: 'New Event' },
        ]}
      />
      <EventForm
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Create Event"
      />
    </div>
  );
}
