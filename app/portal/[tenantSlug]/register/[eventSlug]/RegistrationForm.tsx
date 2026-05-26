"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerForEvent } from "@/lib/actions";

interface Props {
  eventId: string;
  tenantSlug: string;
  eventSlug: string;
  eventTitle: string;
}

export default function RegistrationForm({ eventId, tenantSlug, eventSlug, eventTitle }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    /**
     * SECURITY NOTE: registerForEvent is a server action.
     * It does NOT create a Clerk Organization.
     * It creates ONLY a Contact (upsert) and EventRegistration.
     */
    const result = await registerForEvent(eventId, {
      firstName: fd.get("firstName") as string,
      lastName: fd.get("lastName") as string,
      email: fd.get("email") as string,
      phone: (fd.get("phone") as string) || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-900">You&apos;re registered!</h2>
        <p className="text-gray-600 mt-2">We&apos;ll see you at {eventTitle}.</p>
        <a
          href={`/portal/${tenantSlug}/events/${eventSlug}`}
          className="text-sm text-blue-600 hover:underline mt-4 inline-block"
        >
          Back to event
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
          <input
            name="firstName"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
          <input
            name="lastName"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          name="phone"
          type="tel"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white text-sm py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? "Registering…" : "Complete registration"}
      </button>
    </form>
  );
}
