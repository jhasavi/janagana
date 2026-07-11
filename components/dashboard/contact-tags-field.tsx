import Link from "next/link";
import { COMMON_TAG_SUGGESTIONS } from "@/lib/contacts/tags";
import { FormField, Input } from "@/components/ui/input";

export function ContactTagsField({
  name = "tags",
  defaultValue = "",
  label = "Tags (comma-separated)",
}: {
  name?: string;
  defaultValue?: string;
  label?: string;
}) {
  const listId = `${name}-suggestions`;

  return (
    <FormField label={label}>
      <Input name={name} defaultValue={defaultValue} list={listId} placeholder="volunteer, newsletter" />
      <p className="mt-1 text-xs text-muted-foreground">
        Up to 12 tags. Try: {COMMON_TAG_SUGGESTIONS.slice(0, 4).join(", ")}…
      </p>
      <datalist id={listId}>
        {COMMON_TAG_SUGGESTIONS.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </FormField>
  );
}

export function ContactTagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <span className="text-muted-foreground">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/dashboard/members?tag=${encodeURIComponent(tag)}`}
          className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary"
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}
