import { cn } from "@/lib/utils";

const variants = {
  success: "border-success/20 bg-success/10 text-success",
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-warning/20 bg-warning/10 text-warning",
  info: "border-primary/20 bg-primary/5 text-foreground",
} as const;

export function Alert({
  variant = "info",
  className,
  children,
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm leading-6", variants[variant], className)}>{children}</div>
  );
}
