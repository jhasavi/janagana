import { HandHeart } from "lucide-react";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function VolunteersPage() {
  return (
    <ModulePlaceholder
      title="Volunteers"
      icon={HandHeart}
      description="Coordinate volunteers for events, committees, and weekly programs. Contacts can already be tagged as volunteers — dedicated workflows are coming."
      bullets={[
        "Volunteer roster linked to contacts",
        "Open shifts and sign-up for events",
        "See who volunteered last year vs this year",
      ]}
      relatedHref="/dashboard/members"
      relatedLabel="Tag volunteers on contacts today"
    />
  );
}
