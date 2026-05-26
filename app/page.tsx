import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">JanaGana v3 foundation</h1>
      <p className="mt-2 text-sm text-gray-600">Placeholder home for the controlled rebuild milestone.</p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link href="/dashboard" className="text-blue-700 underline">Open dashboard placeholder</Link>
        </li>
        <li>
          <Link href="/portal/foundation" className="text-blue-700 underline">Open portal placeholder</Link>
        </li>
      </ul>
    </main>
  );
}
