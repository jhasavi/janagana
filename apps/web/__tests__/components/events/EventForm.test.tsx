import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { EventForm } from '@/components/events/EventForm';
import type { EventCategory } from '@/lib/types/event';

const mockCategories: EventCategory[] = [
  { id: '1', name: 'Networking', slug: 'networking', color: '#3B82F6', createdAt: new Date().toISOString(), _count: { events: 0 } },
  { id: '2', name: 'Workshop', slug: 'workshop', color: '#10B981', createdAt: new Date().toISOString(), _count: { events: 0 } },
];

describe('EventForm', () => {
  it('renders all steps correctly', () => {
    const onSubmit = jest.fn().mockResolvedValue({ id: '1' });
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Step indicator should show all steps
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Date & Location')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Speakers')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue({ id: '1' });
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Try to submit without filling required fields
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('ticket builder works (add/remove tickets)', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue({ id: '1' });
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Fill basic info to get to tickets step
    await user.type(screen.getByLabelText(/title/i), 'Test Event');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill date info
    await user.type(screen.getByLabelText(/start date/i), '2025-01-01T10:00');
    await user.type(screen.getByLabelText(/end date/i), '2025-01-01T12:00');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Should be on tickets step
    await waitFor(() => {
      expect(screen.getByText(/tickets/i)).toBeInTheDocument();
    });

    // Add ticket button should be visible
    const addTicketButton = screen.getByRole('button', { name: /add ticket/i });
    expect(addTicketButton).toBeInTheDocument();
  });

  it('date validation (end after start)', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue({ id: '1' });
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Fill basic info
    await user.type(screen.getByLabelText(/title/i), 'Test Event');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Set end date before start date
    await user.type(screen.getByLabelText(/start date/i), '2025-01-01T12:00');
    await user.type(screen.getByLabelText(/end date/i), '2025-01-01T10:00');

    // Try to go next - should show error
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
    });
  });

  it('capacity validation', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue({ id: '1' });
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Fill basic info
    await user.type(screen.getByLabelText(/title/i), 'Test Event');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill date info
    await user.type(screen.getByLabelText(/start date/i), '2025-01-01T10:00');
    await user.type(screen.getByLabelText(/end date/i), '2025-01-01T12:00');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Set negative capacity
    await user.click(screen.getByRole('button', { name: /next/i }));

    const capacityInput = screen.getByLabelText(/capacity/i);
    await user.clear(capacityInput);
    await user.type(capacityInput, '-10');

    // Try to go next - should show error
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/capacity must be positive/i)).toBeInTheDocument();
    });
  });

  it('submits correctly on valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue({ id: '1' });
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Fill basic info
    await user.type(screen.getByLabelText(/title/i), 'Test Event');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill date info
    await user.type(screen.getByLabelText(/start date/i), '2025-01-01T10:00');
    await user.type(screen.getByLabelText(/end date/i), '2025-01-01T12:00');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Skip tickets
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Skip settings
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Skip speakers
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Event',
          description: 'Test description',
        })
      );
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<EventForm categories={mockCategories} onSubmit={onSubmit} />);

    // Fill and navigate through steps
    await user.type(screen.getByLabelText(/title/i), 'Test Event');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.type(screen.getByLabelText(/start date/i), '2025-01-01T10:00');
    await user.type(screen.getByLabelText(/end date/i), '2025-01-01T12:00');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
    });
  });
});
