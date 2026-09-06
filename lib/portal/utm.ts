import { headers } from "next/headers";

export interface UtmQueryParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface UtmAttribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

function clean(value: string | undefined, maxLength: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

/** Reads standard ?utm_source/utm_medium/utm_campaign query params off a page's searchParams. */
export function readUtmParams(query: UtmQueryParams): UtmAttribution {
  return {
    utmSource: clean(query.utm_source, 120),
    utmMedium: clean(query.utm_medium, 120),
    utmCampaign: clean(query.utm_campaign, 120),
  };
}

/** Reads the HTTP Referer header inside a server action / route handler. Best-effort. */
export async function readRefererHeader(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const referer = requestHeaders.get("referer") ?? requestHeaders.get("referrer");
    return clean(referer ?? undefined, 500);
  } catch {
    return null;
  }
}

/** Hidden `<input>` field names carrying UTM values through a portal form POST. */
export const UTM_FORM_FIELDS = {
  source: "utmSource",
  medium: "utmMedium",
  campaign: "utmCampaign",
} as const;

export function utmFromFormData(formData: FormData): UtmAttribution {
  return {
    utmSource: clean(String(formData.get(UTM_FORM_FIELDS.source) ?? ""), 120),
    utmMedium: clean(String(formData.get(UTM_FORM_FIELDS.medium) ?? ""), 120),
    utmCampaign: clean(String(formData.get(UTM_FORM_FIELDS.campaign) ?? ""), 120),
  };
}
