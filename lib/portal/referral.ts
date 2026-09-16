export interface ReferralQueryParams {
  ref?: string;
}

export const REFERRAL_FORM_FIELD = "ref";

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim().toUpperCase();
  return trimmed ? trimmed.slice(0, 40) : null;
}

/** Reads a standard ?ref=CODE query param off a page's searchParams. */
export function readReferralCode(query: ReferralQueryParams): string | null {
  return clean(query.ref);
}

export function referralCodeFromFormData(formData: FormData): string | null {
  return clean(String(formData.get(REFERRAL_FORM_FIELD) ?? ""));
}
