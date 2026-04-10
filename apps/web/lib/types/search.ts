export interface SearchEventResult {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  status: string;
}

export interface SearchClubResult {
  id: string;
  name: string;
  description: string | null;
}

export interface SearchOpportunityResult {
  id: string;
  title: string;
  location: string | null;
  isActive: boolean;
}

export interface SearchMemberResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SearchAnnouncementResult {
  id: string;
  title: string;
  status: string;
}

export interface GlobalSearchResults {
  events: SearchEventResult[];
  clubs: SearchClubResult[];
  opportunities: SearchOpportunityResult[];
  members: SearchMemberResult[];
  announcements: SearchAnnouncementResult[];
}
