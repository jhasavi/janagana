import Link from "next/link";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PortalHomePage({ params }: Props) {
  const { tenantSlug } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Tenant portal</h1>
          <p className="text-sm text-gray-500 mt-1">Slug: {tenantSlug}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <section className="space-y-4">
          <p className="text-gray-600">Foundation placeholder. Event listing is not implemented yet.</p>
          <Link className="text-sm text-blue-700 underline" href={`/portal/${tenantSlug}/events`}>
            Open events placeholder
          </Link>
        </section>
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return {
    title: `${tenantSlug} — Portal`,
  };
}
