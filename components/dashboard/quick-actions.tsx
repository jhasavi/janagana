import Link from "next/link";
import { CalendarPlus, ExternalLink, Upload, UsersRound } from "lucide-react";

export function QuickActions({ portalUrl }: { portalUrl: string }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <Link href="/dashboard/members/import" className="jg-quick-action">
        <span className="jg-quick-action-icon">
          <Upload className="h-4 w-4" />
        </span>
        Import contacts
      </Link>
      <Link href="/dashboard/events/new" className="jg-quick-action">
        <span className="jg-quick-action-icon">
          <CalendarPlus className="h-4 w-4" />
        </span>
        Create event
      </Link>
      <Link href="/dashboard/members" className="jg-quick-action">
        <span className="jg-quick-action-icon">
          <UsersRound className="h-4 w-4" />
        </span>
        All contacts
      </Link>
      <a href={portalUrl} target="_blank" rel="noreferrer" className="jg-quick-action">
        <span className="jg-quick-action-icon bg-accent/10 text-accent">
          <ExternalLink className="h-4 w-4" />
        </span>
        Preview portal
      </a>
    </div>
  );
}
