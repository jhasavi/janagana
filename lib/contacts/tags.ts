/** Shared contact tag parsing — used by create/update forms and exports. */

export const COMMON_TAG_SUGGESTIONS = [
  "manual-entry",
  "imported",
  "raklet",
  "volunteer",
  "donor",
  "newsletter",
  "member-interest",
  "vip",
] as const;

export function parseContactTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  }

  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function formatContactTagsInput(tags: string[]): string {
  return tags.filter(Boolean).join(", ");
}
