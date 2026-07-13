import { FormField, Input, Select } from "@/components/ui/input";

export type CustomFieldDefinitionLike = {
  key: string;
  label: string;
  type: string;
  options: unknown;
};

export function CustomFieldInputs({
  definitions,
  values,
}: {
  definitions: CustomFieldDefinitionLike[];
  values: Record<string, unknown>;
}) {
  const active = definitions.filter((def) => (def as { active?: boolean }).active !== false);
  if (active.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {active.map((def) => {
        const value = values[def.key];
        const name = `cf_${def.key}`;
        if (def.type === "BOOLEAN") {
          return (
            <label key={def.key} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked={value === true || value === "true"}
                className="h-4 w-4 rounded border-input"
              />
              {def.label}
            </label>
          );
        }
        if (def.type === "SELECT") {
          const options = Array.isArray(def.options) ? (def.options as string[]) : [];
          return (
            <FormField key={def.key} label={def.label}>
              <Select name={name} defaultValue={typeof value === "string" ? value : ""}>
                <option value="">Not set</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
          );
        }
        if (def.type === "NUMBER") {
          return (
            <FormField key={def.key} label={def.label}>
              <Input name={name} type="number" defaultValue={typeof value === "number" ? value : ""} />
            </FormField>
          );
        }
        if (def.type === "DATE") {
          return (
            <FormField key={def.key} label={def.label}>
              <Input name={name} type="date" defaultValue={typeof value === "string" ? value : ""} />
            </FormField>
          );
        }
        return (
          <FormField key={def.key} label={def.label}>
            <Input name={name} defaultValue={typeof value === "string" ? value : ""} />
          </FormField>
        );
      })}
    </div>
  );
}
