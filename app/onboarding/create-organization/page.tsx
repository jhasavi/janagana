"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createTenant } from "@/lib/actions";
import { slugify } from "@/lib/utils";

export default function CreateOrganizationPage() {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "creating" | "error" | "done">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgLoaded || !userLoaded) return;
    if (!organization) {
      // No active org — redirect to org selection
      router.replace("/select-organization");
      return;
    }

    async function ensureTenant() {
      if (!organization) return;
      setStatus("creating");
      const slug = slugify(organization.name);
      const result = await createTenant({
        name: organization.name,
        slug,
        clerkOrgId: organization.id,
      });

      if (result.error) {
        setError(result.error);
        setStatus("error");
        return;
      }

      setStatus("done");
      router.replace("/dashboard");
    }

    ensureTenant();
  }, [orgLoaded, userLoaded, organization, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-red-600">Setup failed</h1>
          <p className="text-gray-600 mt-2 text-sm">{error}</p>
          <button
            onClick={() => router.push("/select-organization")}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600 text-sm">
          {status === "creating" ? "Setting up your organization…" : "Loading…"}
        </p>
      </div>
    </div>
  );
}
