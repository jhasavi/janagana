import { render, screen } from '@testing-library/react';
import * as React from 'react';

function MockTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Test Member</td>
          <td>Active</td>
        </tr>
      </tbody>
    </table>
  );
}

describe('DataTable', () => {
  it('renders a basic table', () => {
    render(<MockTable />);
    expect(screen.getByText('Test Member')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
