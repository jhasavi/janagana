import { Mail } from "lucide-react";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function CommunicationsPage() {
  return (
    <ModulePlaceholder
      title="Communications"
      icon={Mail}
      description="See receipts, confirmations, and reminders sent to your community. The outbox records transactional messages — a full communications desk is coming."
      bullets={[
        "Payment receipts and event confirmations",
        "Renewal reminders (planned)",
        "Simple history per contact — not a Mailchimp replacement",
      ]}
      relatedHref="/dashboard/settings"
      relatedLabel="Portal links and community setup"
    />
  );
}
