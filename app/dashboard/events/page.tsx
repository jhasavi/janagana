import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyTextButton } from "@/components/dashboard/copy-text-button";
import { TenantScopeBanner } from "@/components/dashboard/tenant-scope-banner";
import { createEvent, listEvents } from "@/lib/actions/events";
import { publicPortalUrl } from "@/lib/environment";
import { communityLabel, publicRegisterUrl } from "@/lib/pilot/tenants";
import { resolveTenantForDashboard } from "@/lib/tenant";
import { formatCents, formatDate } from "@/lib/utils";

function eventStatusLabel(status: string): string {
  if (status === "PUBLISHED") return "Published (live on portal)";
  if (status === "DRAFT") return "Draft (hidden)";
  return status;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const resolution = await resolveTenantForDashboard();
  const tenant = resolution.status === "ONE_TENANT" ? resolution.tenant : null;
  const portalUrl = tenant ? publicPortalUrl(tenant.slug) : null;
  const eventsUrl = portalUrl ? `${portalUrl}/events` : null;

  async function createEventAction(formData: FormData) {
    "use server";

    const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
    const startsAt = startsAtRaw.length > 0 ? new Date(startsAtRaw) : new Date(NaN);

    const priceDollars = Number(String(formData.get("priceDollars") ?? "0"));
    const priceCents = Number.isFinite(priceDollars) ? Math.round(priceDollars * 100) : NaN;

    const capacityRaw = String(formData.get("capacity") ?? "").trim();
    const capacity = capacityRaw.length > 0 ? Number(capacityRaw) : undefined;

    const result = await createEvent({
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      description: String(formData.get("description") ?? ""),
      startsAt,
      location: String(formData.get("location") ?? ""),
      status: String(formData.get("status") ?? "DRAFT"),
      priceCents,
      capacity,
    });

    if (!result.ok) {
      const errorMessage = "error" in result && result.error ? result.error : "Failed to create event";
      redirect(`/dashboard/events?error=${encodeURIComponent(errorMessage)}`);
    }

    redirect("/dashboard/events?success=created");
  }

  const eventsResult = await listEvents();
  const events = eventsResult.ok ? eventsResult.data : [];
  const published = events.filter((e) => e.status === "PUBLISHED");
  const drafts = events.filter((e) => e.status !== "PUBLISHED");

  return (
    <section className="space-y-4">
      {tenant && <TenantScopeBanner slug={tenant.slug} name={tenant.name} />}

      <div>
        <h1 className="text-2xl font-semibold">Events</h1>
        <p className="mt-2 text-sm text-gray-600">
          Only <strong>Published</strong> events appear on the public portal. After publishing, copy the registration
          link to your website or email.
        </p>
        {eventsUrl && tenant && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href={eventsUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline break-all">
              {eventsUrl}
            </a>
            <CopyTextButton text={eventsUrl} label="Copy events page" />
          </div>
        )}
      </div>

      {params.error && <p className="text-sm text-red-700">{params.error}</p>}
      {params.success === "created" && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Event saved. If status is Published, it is live on the portal now.
        </p>
      )}

      <details className="rounded-md border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-900">Create a new event</summary>
        <form action={createEventAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Event title" className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
          <input name="slug" placeholder="URL slug (e.g. spring-meetup)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input name="location" placeholder="Location" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <textarea name="description" placeholder="Description" className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2" rows={2} />
          <input name="startsAt" required type="datetime-local" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <select name="status" defaultValue="PUBLISHED" className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="PUBLISHED">Published — live on portal</option>
            <option value="DRAFT">Draft — hidden from visitors</option>
          </select>
          <input name="priceDollars" type="number" min="0" step="0.01" defaultValue="0" placeholder="Price (USD)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input name="capacity" type="number" min="1" placeholder="Capacity (optional)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
              Save event
            </button>
          </div>
        </form>
      </details>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-700">
            <p className="font-medium text-gray-900">No events for {tenant ? communityLabel(tenant.slug) : "this tenant"} yet</p>
            <p className="mt-2">Create an event above with status <strong>Published</strong>, then share the registration link from the table.</p>
            {eventsUrl && (
              <p className="mt-2">
                Public listing:{" "}
                <a href={eventsUrl} className="text-blue-700 underline break-all">
                  {eventsUrl}
                </a>
              </p>
            )}
          </div>
        ) : tenant ? (
          <div className="space-y-6">
            {published.length > 0 && (
              <EventTable title="Published events" events={published} tenantSlug={tenant.slug} showRegisterLink />
            )}
            {drafts.length > 0 && (
              <EventTable title="Drafts (not on public portal)" events={drafts} tenantSlug={tenant.slug} showRegisterLink={false} />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EventTable({
  title,
  events,
  tenantSlug,
  showRegisterLink,
}: {
  title: string;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    startsAt: Date;
    status: string;
    priceCents: number;
    registrationSummary: { confirmed: number; total: number };
  }>;
  tenantSlug: string;
  showRegisterLink: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4">Event</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Registrations</th>
              {showRegisterLink && <th className="py-2 pr-4">Public register link</th>}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const registerUrl = publicRegisterUrl(tenantSlug, event.slug);
              return (
                <tr key={event.id} className="border-b border-gray-100 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="font-mono text-xs text-gray-500">{event.slug}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{formatDate(event.startsAt)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        event.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {eventStatusLabel(event.status)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Link href={`/dashboard/events/${event.id}/registrations`} className="font-medium text-blue-700 underline">
                      {event.registrationSummary.confirmed} confirmed
                    </Link>
                    {event.registrationSummary.total !== event.registrationSummary.confirmed && (
                      <span className="text-gray-500"> / {event.registrationSummary.total} total</span>
                    )}
                  </td>
                  {showRegisterLink && (
                    <td className="py-3 pr-4">
                      <p className="break-all font-mono text-xs text-gray-600">{registerUrl}</p>
                      <CopyTextButton text={registerUrl} label="Copy link" className="mt-1" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
