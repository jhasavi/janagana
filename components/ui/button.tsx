import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 active:bg-accent/95",
  secondary:
    "bg-primary/10 text-primary hover:bg-primary/15 active:bg-primary/20",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  accent: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
} as const;

const sizes = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs font-bold",
  md: "h-10 gap-2 rounded-xl px-4 text-sm font-bold",
  lg: "h-11 gap-2 rounded-xl px-5 text-sm font-bold",
} as const;

type ButtonVariant = keyof typeof variants;
type ButtonSize = keyof typeof sizes;

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: SharedProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: SharedProps & React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
