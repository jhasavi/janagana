import { redirect } from "next/navigation";

const INTEREST_MAP: Record<string, string> = {
  newsletter: "newsletter",
  class: "class_interest",
  "class-interest": "class_interest",
  membership: "membership_interest",
  "membership-interest": "membership_interest",
  investment: "investment_analysis",
  "investment-analysis": "investment_analysis",
};

export default async function PublicInterestRedirectPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; interestType: string }>;
}) {
  const { tenantSlug, interestType } = await params;
  const mapped = INTEREST_MAP[interestType.toLowerCase()] ?? "newsletter";
  redirect(`/portal/${tenantSlug}/contact?interest=${mapped}`);
}
