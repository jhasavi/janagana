import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { DataTable } from '@/components/ui/data-table/data-table';
import { type ColumnDef } from '@tanstack/react-table';

interface TestData {
  id: string;
  name: string;
  email: string;
  status: string;
}

const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];

const mockData: TestData[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
];

describe('DataTable', () => {
  it('renders data correctly', () => {
    render(<DataTable columns={mockColumns} data={mockData} searchKey="name" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<DataTable columns={mockColumns} data={[]} searchKey="name" />);

    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('sorting works', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} data={mockData} searchKey="name" />);

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    // After sorting, the order should change
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Bob Johnson'); // Should be first after ascending sort
  });

  it('filtering works', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} data={mockData} searchKey="name" />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('pagination works', async () => {
    const user = userEvent.setup();
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      email: `user${i}@example.com`,
      status: 'Active',
    }));

    render(<DataTable columns={mockColumns} data={largeData} searchKey="name" />);

    // Should show 10 rows by default (first page)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // Header + 10 data rows

    // Click next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show different data on second page
    await waitFor(() => {
      expect(screen.queryByText('User 0')).not.toBeInTheDocument();
    });
  });

  it('row selection works', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} data={mockData} searchKey="name" />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // First data row checkbox

    await waitFor(() => {
      expect(checkboxes[1]).toBeChecked();
    });
  });

  it('reset button appears when filter is active', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} data={mockData} searchKey="name" />);

    // Initially no reset button
    expect(screen.queryByText('Reset')).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'John');

    // Reset button should appear
    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    // Click reset
    await user.click(screen.getByText('Reset'));

    // Filter should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('column visibility toggle works', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={mockColumns} data={mockData} searchKey="name" />);

    const viewButton = screen.getByRole('button', { name: /view/i });
    await user.click(viewButton);

    // Should see column toggle options
    await waitFor(() => {
      expect(screen.getByText('Toggle columns')).toBeInTheDocument();
    });

    // Uncheck a column
    const emailCheckbox = screen.getByRole('menuitemcheckbox', { name: 'email' });
    await user.click(emailCheckbox);

    // Email column should be hidden
    await waitFor(() => {
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    });
  });

  it('custom search placeholder works', () => {
    render(
      <DataTable
        columns={mockColumns}
        data={mockData}
        searchKey="name"
        searchPlaceholder="Search members..."
      />
    );

    expect(screen.getByPlaceholderText('Search members...')).toBeInTheDocument();
  });

  it('works without search key', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);

    // Should not render search input
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    // Should still render data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
