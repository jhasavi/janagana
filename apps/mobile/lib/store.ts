import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  status: string;
  membershipTier?: {
    name: string;
    expiresAt: string;
  };
}

interface Organization {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface AppState {
  member: Member | null;
  organization: Organization | null;
  isLoading: boolean;
  setMember: (member: Member) => void;
  setOrganization: (org: Organization) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      member: null,
      organization: null,
      isLoading: false,
      setMember: (member) => set({ member }),
      setOrganization: (organization) => set({ organization }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ member: null, organization: null }),
    }),
    {
      name: 'orgflow-storage',
    }
  )
);
