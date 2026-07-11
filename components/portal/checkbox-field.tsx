export function CheckboxField({
  name,
  value = "1",
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  value?: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-input"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}
