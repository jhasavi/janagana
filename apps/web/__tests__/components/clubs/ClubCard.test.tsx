import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ClubCard } from '@/components/clubs/ClubCard';
import type { ClubListItem } from '@/lib/types/club';

const mockClub: ClubListItem = {
  id: '1',
  tenantId: 'tenant-1',
  name: 'Photography Club',
  slug: 'photography',
  description: 'A club for photography enthusiasts',
  visibility: 'PUBLIC',
  isActive: true,
  coverImageUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  _count: {
    memberships: 25,
    posts: 42,
    events: 5,
  },
};

describe('ClubCard', () => {
  it('renders club info', () => {
    render(<ClubCard club={mockClub} />);

    expect(screen.getByText('Photography Club')).toBeInTheDocument();
    expect(screen.getByText('A club for photography enthusiasts')).toBeInTheDocument();
    expect(screen.getByText('25 members')).toBeInTheDocument();
    expect(screen.getByText('42 posts')).toBeInTheDocument();
  });

  it('join button visible for non-members', () => {
    const onJoin = jest.fn();
    render(<ClubCard club={mockClub} isMember={false} onJoin={onJoin} />);

    expect(screen.getByRole('button', { name: /join club/i })).toBeInTheDocument();
  });

  it('leave button visible for members', () => {
    render(<ClubCard club={mockClub} isMember={true} />);

    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join club/i })).not.toBeInTheDocument();
  });

  it('calls onJoin when join button clicked', async () => {
    const user = userEvent.setup();
    const onJoin = jest.fn();
    render(<ClubCard club={mockClub} isMember={false} onJoin={onJoin} />);

    const joinButton = screen.getByRole('button', { name: /join club/i });
    await user.click(joinButton);

    expect(onJoin).toHaveBeenCalled();
  });

  it('shows request to join for invite-only clubs', () => {
    const inviteOnlyClub = { ...mockClub, visibility: 'INVITE_ONLY' as const };
    const onJoin = jest.fn();
    render(<ClubCard club={inviteOnlyClub} isMember={false} onJoin={onJoin} />);

    expect(screen.getByRole('button', { name: /request to join/i })).toBeInTheDocument();
  });

  it('shows correct visibility badge', () => {
    render(<ClubCard club={mockClub} />);

    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('shows inactive badge for inactive clubs', () => {
    const inactiveClub = { ...mockClub, isActive: false };
    render(<ClubCard club={inactiveClub} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('disables join button when pending', () => {
    const onJoin = jest.fn();
    render(<ClubCard club={mockClub} isMember={false} onJoin={onJoin} joinPending={true} />);

    const joinButton = screen.getByRole('button', { name: /joining…/i });
    expect(joinButton).toBeDisabled();
  });

  it('renders with link when href provided', () => {
    render(<ClubCard club={mockClub} href="/clubs/photography" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/clubs/photography');
  });

  it('renders without link when href not provided', () => {
    render(<ClubCard club={mockClub} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
