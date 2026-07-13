import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
          JanaGana
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline-block"
          >
            Pricing
          </Link>
          <ButtonLink href="/sign-in" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/sign-up" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} JanaGana. Built for community organizations.</p>
        <div className="flex items-center gap-5">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
