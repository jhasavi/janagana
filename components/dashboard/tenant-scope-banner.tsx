import { communityLabel } from "@/lib/pilot/portal-links";

/** Shown at top of dashboard pages so operators always know which tenant they are in. */
export function TenantScopeBanner({ slug, name }: { slug: string; name: string }) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-sm text-blue-950">
      <span className="font-medium">Working in:</span> {communityLabel(slug)}
      <span className="mx-2 text-blue-300">·</span>
      <span className="font-mono text-xs">{slug}</span>
      {name !== communityLabel(slug) && (
        <span className="ml-2 text-blue-800/80">({name})</span>
      )}
    </div>
  );
}
