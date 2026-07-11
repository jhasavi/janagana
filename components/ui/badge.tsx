import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  brand: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
} as const;

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
