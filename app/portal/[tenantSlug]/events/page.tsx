import Link from "next/link";

export default async function TenantEventsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Events</h1>
      <p className="mt-2 text-sm text-gray-600">Tenant: {tenantSlug}</p>
      <p className="mt-2 text-sm text-gray-600">Not implemented yet in foundation milestone.</p>
      <div className="mt-6">
        <Link className="text-sm text-blue-700 underline" href={`/portal/${tenantSlug}`}>
          Back to portal home
        </Link>
      </div>
    </main>
  );
}
