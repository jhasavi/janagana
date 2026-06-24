import { Home } from "lucide-react";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function FamiliesPage() {
  return (
    <ModulePlaceholder
      title="Families"
      icon={Home}
      description="Group contacts into households — parents, children, and spouses — so your board can see who belongs together."
      bullets={[
        "Link multiple contacts to one family record",
        "See members and volunteers per household",
        "Useful for renewal reminders and event RSVPs",
      ]}
      relatedHref="/dashboard/members"
      relatedLabel="Manage contacts in the meantime"
    />
  );
}
