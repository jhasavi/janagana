import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
  tone?: "primary" | "accent" | "success" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  }[tone];

  return (
    <div className="jg-metric">
      {Icon ? (
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-xs font-medium text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
