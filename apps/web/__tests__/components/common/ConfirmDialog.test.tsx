import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('opens on trigger', () => {
    const onOpenChange = jest.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete Item"
        description="Are you sure you want to delete this item?"
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('confirm callback fires', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onOpenChange = jest.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it('cancel closes without firing confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows custom labels', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={jest.fn()}
        title="Delete Item"
        description="Are you sure?"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no, keep/i })).toBeInTheDocument();
  });

  it('shows destructive styling when destructive is true', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={jest.fn()}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={jest.fn()}
        destructive={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toHaveClass('bg-destructive');
  });

  it('shows loading state during async confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={jest.fn()}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/processing\.\.\./i)).toBeInTheDocument();
    });
  });

  it('disables buttons during loading', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={jest.fn()}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  it('closes dialog after successful confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onOpenChange = jest.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
