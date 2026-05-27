import Link from "next/link";
import { redirect } from "next/navigation";
import { formatCents, formatDate } from "@/lib/utils";
import { createEvent, listEvents } from "@/lib/actions/events";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

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

    redirect("/dashboard/events?success=1");
  }

  const eventsResult = await listEvents();
  const events = eventsResult.ok ? eventsResult.data : [];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Events</h1>
      <p className="mt-2 text-sm text-gray-600">Create and view tenant-scoped events.</p>

      {params.error && <p className="mt-4 text-sm text-red-700">{params.error}</p>}
      {params.success && <p className="mt-4 text-sm text-green-700">Event created.</p>}

      <form action={createEventAction} className="mt-6 grid gap-3 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-2">
        <input name="title" required placeholder="Event title" className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
        <input name="slug" placeholder="Slug (optional)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="location" placeholder="Location" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <textarea name="description" placeholder="Description" className="rounded border border-gray-300 px-3 py-2 text-sm md:col-span-2" rows={3} />
        <input name="startsAt" required type="datetime-local" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue="DRAFT" className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
        </select>
        <input name="priceDollars" type="number" min="0" step="0.01" defaultValue="0" placeholder="Price (USD)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="capacity" type="number" min="1" placeholder="Capacity (optional)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <div className="md:col-span-2">
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-black">
            Create event
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet for this tenant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Starts</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Registrations</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{event.title}</td>
                    <td className="py-2 pr-4">{event.slug}</td>
                    <td className="py-2 pr-4">{formatDate(event.startsAt)}</td>
                    <td className="py-2 pr-4">{event.status}</td>
                    <td className="py-2 pr-4">{formatCents(event.priceCents)}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/dashboard/events/${event.id}/registrations`}
                        className="text-blue-700 hover:underline"
                      >
                        {event._count?.registrations ?? 0}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
