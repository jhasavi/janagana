import { HeartHandshake } from "lucide-react";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function DonationsPage() {
  return (
    <ModulePlaceholder
      title="Donations"
      icon={HeartHandshake}
      description="Track one-time and recurring gifts from community supporters. Payment records for donations already flow through the ledger — admin UI is next."
      bullets={[
        "Public donation page on your community portal",
        "Issue receipts and thank-you messages",
        "JanaGana platform fee stays at 0; Stripe fees disclosed separately",
      ]}
      relatedHref="/dashboard/payments"
      relatedLabel="View payments already recorded"
    />
  );
}
