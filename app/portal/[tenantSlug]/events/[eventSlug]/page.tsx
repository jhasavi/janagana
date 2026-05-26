export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Event detail</h1>
      <p className="mt-2 text-sm text-gray-600">Tenant: {tenantSlug}</p>
      <p className="mt-1 text-sm text-gray-600">Event: {eventSlug}</p>
      <p className="mt-2 text-sm text-gray-600">Not implemented yet in foundation milestone.</p>
    </main>
  );
}
