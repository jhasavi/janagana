import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";

export type EmbedEventPayload = {
  id: string;
  title: string;
  shortSummary: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  coverImageUrl: string | null;
  speakerName: string | null;
  attendeeCount: number | null;
  tags: string[];
  priceCents: number;
  format: "IN_PERSON" | "VIRTUAL" | "HYBRID";
  isVirtual: boolean;
  detailsUrl: string;
  registrationUrl: string;
  portalUrl: string;
  status: string;
};

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://janagana.namasteneedham.com").replace(/\/$/, "");
}

function toEmbedEvent(
  tenantSlug: string,
  event: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    startsAt: Date;
    location: string | null;
    priceCents: number;
    status: string;
    _count: { registrations: number };
  },
): EmbedEventPayload {
  const base = appBaseUrl();
  const portalEvent = `${base}/portal/${tenantSlug}/events/${event.slug}`;
  const register = `${base}/portal/${tenantSlug}/register/${event.slug}`;

  return {
    id: event.id,
    title: event.title,
    shortSummary: event.description ? event.description.slice(0, 200) : null,
    description: event.description,
    startDate: event.startsAt.toISOString(),
    endDate: null,
    location: event.location,
    coverImageUrl: null,
    speakerName: null,
    attendeeCount: event._count.registrations,
    tags: [],
    priceCents: event.priceCents,
    format: "IN_PERSON",
    isVirtual: false,
    detailsUrl: portalEvent,
    registrationUrl: register,
    portalUrl: portalEvent,
    status: event.status,
  };
}

export async function listEmbedEvents(tenantSlug: string, maxItems: number, mode: "upcoming" | "past") {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: "Tenant not found", data: [] as EmbedEventPayload[] };
  }

  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      tenantId: tenant.id,
      status: "PUBLISHED",
      ...(mode === "upcoming"
        ? { startsAt: { gte: now } }
        : { startsAt: { lt: now } }),
    },
    orderBy: { startsAt: mode === "upcoming" ? "asc" : "desc" },
    take: maxItems,
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      startsAt: true,
      location: true,
      priceCents: true,
      status: true,
      _count: { select: { registrations: true } },
    },
  });

  return {
    ok: true as const,
    data: events.map((e) => toEmbedEvent(tenant.slug, e)),
  };
}
