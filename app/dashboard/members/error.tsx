"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MembersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MEMBERS_PAGE_CLIENT_ERROR", {
      message: error.message.slice(0, 200),
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <p className="font-semibold">Could not load contacts</p>
      <p className="mt-2">Try again or return to the contacts list without filters.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="rounded bg-red-900 px-3 py-1.5 text-white hover:bg-red-950">
          Retry
        </button>
        <Link href="/dashboard/members" className="rounded border border-red-300 bg-white px-3 py-1.5 hover:bg-red-100">
          Contacts home
        </Link>
      </div>
    </div>
  );
}
