import Link from "next/link";
import type { OperatorWarning } from "@/lib/dashboard/operator-warnings";

export function OperatorWarningsPanel({ warnings }: { warnings: OperatorWarning[] }) {
  if (warnings.length === 0) return null;

  const critical = warnings.filter((w) => w.severity === "critical");
  const attention = warnings.filter((w) => w.severity === "attention");
  const info = warnings.filter((w) => w.severity === "info");
  const ordered = [...critical, ...attention, ...info];

  const borderClass =
    critical.length > 0
        ? "border-red-200 bg-red-50"
        : attention.length > 0
          ? "border-amber-200 bg-amber-50"
        : "border-primary/20 bg-primary/5";

  const titleClass =
    critical.length > 0 ? "text-red-950" : attention.length > 0 ? "text-amber-950" : "text-foreground";

  return (
    <section className={`rounded-xl border p-4 shadow-sm ${borderClass}`}>
      <h2 className={`text-sm font-semibold ${titleClass}`}>
        {critical.length > 0 ? "Action required" : "Needs attention"}
      </h2>
      <ul className="mt-3 space-y-3">
        {ordered.map((warning) => (
          <li key={warning.id} className="text-sm">
            <p className={titleClass}>{warning.message}</p>
            {warning.actionHref && warning.actionLabel && (
              <Link href={warning.actionHref} className="mt-1 inline-block text-sm font-semibold text-primary hover:text-foreground">
                {warning.actionLabel}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
