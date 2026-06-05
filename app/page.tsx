import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resolveTenantForDashboard } from "@/lib/tenant";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    console.info("NO_AUTH");
    redirect("/sign-in");
  }

  const resolution = await resolveTenantForDashboard();
  if (resolution.staleCookieIgnored) {
    redirect("/api/select-tenant?reason=stale-cookie");
  }

  if (resolution.status === "ZERO_TENANTS") {
    console.info("ZERO_TENANTS_ONBOARDING");
    redirect("/onboarding/create-organization");
  }

  if (resolution.status === "ONE_TENANT") {
    if (resolution.source === "single-tenant") {
      redirect("/api/select-tenant?reason=auto-single");
    }
    console.info("ONE_TENANT_AUTO_SELECT");
    redirect("/dashboard");
  }

  console.info("MULTI_TENANT_SELECT_ORG");
  redirect("/select-organization");
}
