"use client";

export function DeleteContactButton({
  contactId,
  label,
  displayName,
}: {
  contactId: string;
  label?: string;
  displayName: string;
}) {
  return (
    <button
      type="submit"
      name="contactId"
      value={contactId}
      className="text-xs font-semibold text-red-700 hover:text-red-900"
      onClick={(event) => {
        if (!confirm(`Remove ${displayName} from this community? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      {label ?? "Delete contact"}
    </button>
  );
}
