import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublicDirectoryContacts } from "@/lib/actions/public-portal";
import { contactTypeLabel } from "@/lib/pilot/contact-labels";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function PortalDirectoryPage({ params }: Props) {
  const { tenantSlug } = await params;
  const result = await listPublicDirectoryContacts(tenantSlug);

  if (!result.tenant) {
    notFound();
  }
  if (!result.ok) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="jg-eyebrow">Community</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Member directory</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Members who have chosen to be listed publicly. Contact details are kept private — reach out through the
          organization if you&apos;d like to connect.
        </p>
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          title="No members listed yet"
          description="Members can opt in to the public directory from their profile."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((contact) => (
            <div key={contact.id} className="jg-card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {contact.firstName} {contact.lastName}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="default">{contactTypeLabel(contact.type)}</Badge>
                  {contact.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="brand">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export async function generateMetadata({ params }: Props) {
  const { tenantSlug } = await params;
  return {
    title: `${tenantSlug} — Member directory`,
  };
}
