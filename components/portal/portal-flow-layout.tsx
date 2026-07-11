import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export function PortalFlowLayout({
  icon,
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back to community website",
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  backHref?: string | null;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="jg-portal-hero jg-portal-gradient p-6 text-white sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">{icon}</div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? (
          <p data-testid="portal-flow-description" className="mt-3 text-sm leading-6 text-white/80">
            {description}
          </p>
        ) : null}
        {backHref ? (
          <a href={backHref} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-white/85">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </a>
        ) : null}
      </section>

      <Card>
        <CardBody className="sm:p-8">{children}</CardBody>
      </Card>
    </div>
  );
}

export function PortalBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
