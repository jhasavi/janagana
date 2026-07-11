import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { PortalFlowLayout } from "@/components/portal/portal-flow-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { requestMemberSignIn } from "@/lib/actions/member-auth";
import { getTenantBySlug } from "@/lib/tenant";

function statusMessage(status?: string, error?: string) {
  if (error === "invalid-link") return "That sign-in link is invalid or has expired. Request a new one below.";
  if (status === "sent") return "If that email matches a member account, a sign-in link is on its way. Check your inbox.";
  return null;
}

export default async function MemberSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    redirect(`/portal/${tenantSlug}`);
  }

  async function signInAction(formData: FormData) {
    "use server";

    await requestMemberSignIn({
      tenantSlug,
      email: String(formData.get("email") ?? ""),
    });

    redirect(`/portal/${tenantSlug}/account/sign-in?status=sent`);
  }

  const message = statusMessage(query.status, query.error);

  return (
    <PortalFlowLayout
      icon={<Mail className="h-5 w-5" />}
      eyebrow="Member sign-in"
      title={`Sign in to your ${tenant.name} account`}
      description="Enter the email on your membership and we'll send you a one-time sign-in link — no password needed."
    >
      {message && (
        <Alert variant={query.error ? "error" : "success"} className="mb-6">
          {message}
        </Alert>
      )}

      <form action={signInAction} className="space-y-4">
        <FormField label="Email">
          <Input type="email" name="email" required autoFocus />
        </FormField>
        <Button type="submit">Send sign-in link</Button>
      </form>
    </PortalFlowLayout>
  );
}
