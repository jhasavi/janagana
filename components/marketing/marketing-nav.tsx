import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DEMO_URL } from "@/lib/marketing";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-bold"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
          JanaGana
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#features"
            className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground md:inline-block"
          >
            Features
          </Link>
          <Link
            href="/#compare"
            className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground md:inline-block"
          >
            Compare
          </Link>
          <ButtonLink href="/sign-in" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          {DEMO_URL ? (
            <ButtonLink href={DEMO_URL} variant="secondary" size="sm" className="hidden sm:inline-flex">
              Book a demo
            </ButtonLink>
          ) : null}
          <ButtonLink href="/sign-up" size="sm">
            Start free
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
        <p>© {new Date().getFullYear()} JanaGana. Membership and event software for nonprofits and small businesses.</p>
        <div className="flex items-center gap-5">
          {DEMO_URL ? (
            <Link href={DEMO_URL} className="hover:text-foreground">
              Book a demo
            </Link>
          ) : null}
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
