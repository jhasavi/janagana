export interface MembershipDraft {
  firstName: string
  lastName: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface ContactLookupResult {
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

export function applyContactToMembershipDraft(
  draft: MembershipDraft,
  contact: ContactLookupResult
): MembershipDraft {
  return {
    firstName: draft.firstName || contact.firstName || '',
    lastName: draft.lastName || contact.lastName || '',
    phone: draft.phone || contact.phone || '',
    address: draft.address || contact.address || '',
    city: draft.city || contact.city || '',
    state: draft.state || contact.state || '',
    postalCode: draft.postalCode || contact.postalCode || '',
    country: draft.country || contact.country || 'US',
  }
}
