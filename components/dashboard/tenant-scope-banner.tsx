import { communityLabel } from "@/lib/pilot/portal-links";

/** Shown at top of dashboard pages so operators always know which tenant they are in. */
export function TenantScopeBanner({ slug, name }: { slug: string; name: string }) {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/70 px-4 py-2.5 text-sm text-teal-950">
      <span className="font-medium">Working in:</span> {communityLabel(slug)}
      <span className="mx-2 text-teal-300">/</span>
      <span className="font-mono text-xs">{slug}</span>
      {name !== communityLabel(slug) && (
        <span className="ml-2 text-teal-800/80">({name})</span>
      )}
    </div>
  );
}
