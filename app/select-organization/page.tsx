import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationList } from "@clerk/nextjs";

export default async function SelectOrganizationPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");

  // If user already has an active org, go to dashboard
  if (orgId) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Select your organization</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Choose an organization to manage, or create a new one.
        </p>
      </div>
      <OrganizationList
        afterSelectOrganizationUrl="/dashboard"
        afterCreateOrganizationUrl="/onboarding/create-organization"
      />
    </div>
  );
}
