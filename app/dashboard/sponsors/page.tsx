import { Building2 } from "lucide-react";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function SponsorsPage() {
  return (
    <ModulePlaceholder
      title="Sponsors"
      icon={Building2}
      description="Manage event and annual sponsors — pledges, benefits, and follow-up — without a separate spreadsheet."
      bullets={[
        "Sponsor tiers and pledged amounts",
        "Link sponsors to events and galas",
        "Follow-up reminders for unpaid pledges",
      ]}
      relatedHref="/dashboard/events"
      relatedLabel="Manage events in the meantime"
    />
  );
}
