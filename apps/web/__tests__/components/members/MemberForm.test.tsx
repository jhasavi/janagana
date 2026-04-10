import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemberForm } from '@/components/members/MemberForm';
import type { MembershipTier, MemberCustomField } from '@/lib/types/member';

const mockTiers: MembershipTier[] = [
  {
    id: '1',
    tenantId: 'tenant-1',
    name: 'Basic',
    slug: 'basic',
    description: 'Basic tier',
    monthlyPriceCents: 1000,
    annualPriceCents: 10000,
    isFree: false,
    isPublic: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { subscriptions: 0 },
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    name: 'Premium',
    slug: 'premium',
    description: 'Premium tier',
    monthlyPriceCents: 5000,
    annualPriceCents: 50000,
    isFree: false,
    isPublic: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { subscriptions: 0 },
  },
];

const mockCustomFields: MemberCustomField[] = [
  {
    id: '1',
    name: 'Shirt Size',
    slug: 'shirt-size',
    fieldType: 'SELECT',
    options: ['S', 'M', 'L'],
    isRequired: true,
    isPublic: false,
    placeholder: null,
    helpText: null,
    sortOrder: 0,
  },
  {
    id: '2',
    name: 'Dietary Restrictions',
    slug: 'dietary',
    fieldType: 'TEXT',
    options: [],
    isRequired: false,
    isPublic: false,
    placeholder: null,
    helpText: null,
    sortOrder: 1,
  },
];

describe('MemberForm', () => {
  it('renders all steps correctly', () => {
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={mockCustomFields} />);

    // Step indicator
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Membership')).toBeInTheDocument();
    expect(screen.getByText('Custom Fields')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();

    // First step fields
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address *')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={mockCustomFields} />);

    // Try to submit without filling required fields
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  it('shows errors on invalid input', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={mockCustomFields} />);

    const emailInput = screen.getByLabelText('Email Address *');
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('submits correctly on valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={mockCustomFields} />);

    // Fill step 1
    await user.type(screen.getByLabelText('First Name *'), 'John');
    await user.type(screen.getByLabelText('Last Name *'), 'Doe');
    await user.type(screen.getByLabelText('Email Address *'), 'john@example.com');

    // Go to next step
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill step 2 (optional)
    await user.type(screen.getByLabelText('City'), 'Springfield');

    // Go to next step
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Go to next step (membership)
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill custom fields
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('S'));

    // Go to review
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: /create member/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        })
      );
    });
  });

  it('works in edit mode with pre-filled data', () => {
    const onSubmit = jest.fn();
    const defaultValues = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+1 234 567 8900',
    };

    render(
      <MemberForm
        onSubmit={onSubmit}
        tiers={mockTiers}
        customFields={[]}
        defaultValues={defaultValues}
        isEditing={true}
        submitLabel="Update Member"
      />
    );

    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1 234 567 8900')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update member/i })).toBeInTheDocument();
  });

  it('navigates through steps correctly', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={mockCustomFields} />);

    // Step 1 is visible
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();

    // Fill and go to step 2
    await user.type(screen.getByLabelText('First Name *'), 'John');
    await user.type(screen.getByLabelText('Last Name *'), 'Doe');
    await user.type(screen.getByLabelText('Email Address *'), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2 should be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Street Address')).toBeInTheDocument();
    });

    // Go back
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Step 1 should be visible again
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={[]} />);

    // Fill required fields and navigate to review
    await user.type(screen.getByLabelText('First Name *'), 'John');
    await user.type(screen.getByLabelText('Last Name *'), 'Doe');
    await user.type(screen.getByLabelText('Email Address *'), 'john@example.com');

    // Navigate through steps
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: /create member/i }));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/saving…/i)).toBeInTheDocument();
    });
  });

  it('handles custom fields correctly', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={mockCustomFields} />);

    // Navigate to custom fields step
    await user.type(screen.getByLabelText('First Name *'), 'John');
    await user.type(screen.getByLabelText('Last Name *'), 'Doe');
    await user.type(screen.getByLabelText('Email Address *'), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Custom fields should be visible
    await waitFor(() => {
      expect(screen.getByText('Shirt Size')).toBeInTheDocument();
      expect(screen.getByText('Dietary Restrictions')).toBeInTheDocument();
    });
  });

  it('shows no custom fields message when none configured', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={[]} />);

    // Navigate to custom fields step
    await user.type(screen.getByLabelText('First Name *'), 'John');
    await user.type(screen.getByLabelText('Last Name *'), 'Doe');
    await user.type(screen.getByLabelText('Email Address *'), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/no custom fields configured/i)).toBeInTheDocument();
    });
  });

  it('shows membership tier options', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MemberForm onSubmit={onSubmit} tiers={mockTiers} customFields={[]} />);

    // Navigate to membership step
    await user.type(screen.getByLabelText('First Name *'), 'John');
    await user.type(screen.getByLabelText('Last Name *'), 'Doe');
    await user.type(screen.getByLabelText('Email Address *'), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText(/\$10\/mo/)).toBeInTheDocument();
      expect(screen.getByText(/\$50\/mo/)).toBeInTheDocument();
    });
  });
});
