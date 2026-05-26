"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEvent } from "@/lib/actions";
import type { EventStatus } from "@prisma/client";

export default function NewEventPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const priceDollars = parseFloat((fd.get("price") as string) || "0");

    const result = await createEvent("__tenant_from_session__", {
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
      startsAt: new Date(fd.get("startsAt") as string),
      location: (fd.get("location") as string) || undefined,
      priceCents: Math.round(priceDollars * 100),
      capacity: fd.get("capacity") ? parseInt(fd.get("capacity") as string) : undefined,
      status: (fd.get("status") as EventStatus) || "DRAFT",
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard/events");
  }

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/events" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to events
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create event</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Event title *</label>
          <input
            name="title"
            required
            placeholder="e.g., Spring Yoga Class"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            name="location"
            placeholder="Address or 'Online'"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (USD) <span className="text-gray-400 font-normal">— leave 0 for free</span>
            </label>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              name="capacity"
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Create event"}
          </button>
          <a href="/dashboard/events" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
