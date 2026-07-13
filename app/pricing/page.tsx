import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-nav";

export const metadata = {
  title: "Pricing — JanaGana",
  description: "0% JanaGana platform fee. You pay only Stripe's standard processing rate, using your own Stripe account.",
};

const INCLUDED = [
  "Unlimited contacts, tags, filters, and CSV import/export",
  "Membership tiers, Stripe subscriptions, and the renewals desk",
  "Event publishing, registration, and paid ticket checkout",
  "One-time and recurring donations, with donor-covered fee toggle",
  "Unified payments ledger, printable receipts, year-end giving summaries",
  "Communications outbox with delivery status and retry",
  "Embed on your own website — your domain, your brand",
  "Multi-admin roles with a view-only mode for non-admins",
];

const COMPARISON = [
  { name: "JanaGana", fee: "0% platform fee", note: "Stripe's processing rate only, your own Stripe account" },
  { name: "Join It", fee: "$29+/mo", note: "Plus their hosted stack and payment processor" },
  { name: "Zeffy", fee: "0% platform fee", note: "Donations only — no unified dues/events ledger, checkout redirects to zeffy.com" },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 pb-10 pt-14 text-center sm:pt-20">
          <p className="jg-eyebrow text-center">Pricing</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Straightforward, honest pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            JanaGana charges <strong className="text-foreground">0% platform fee</strong>. You pay only Stripe&apos;s
            standard processing rate, and payments settle directly to your own Stripe account — not ours.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="jg-card overflow-hidden">
            <div className="jg-portal-gradient p-6 text-white sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">Every organization</p>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold">$0</span>
                <span className="text-sm font-medium text-white/85">/month platform fee</span>
              </p>
              <p className="mt-2 text-sm text-white/85">
                Plus Stripe&apos;s standard processing rate on payments you collect. No monthly minimum, no seat
                limits.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <ul className="grid gap-3 sm:grid-cols-2">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-6 text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/sign-up" size="lg">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/pricing#compare" variant="secondary" size="lg">
                  Compare to Join It &amp; Zeffy
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section id="compare" className="mx-auto max-w-3xl px-6 pb-20">
          <p className="jg-eyebrow">How it compares</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Fee transparency, side by side</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border/80">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/60 text-left">
                  <th className="px-5 py-3 font-bold text-muted-foreground">Platform</th>
                  <th className="px-5 py-3 font-bold text-muted-foreground">Fee</th>
                  <th className="px-5 py-3 font-bold text-muted-foreground">Note</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, index) => (
                  <tr
                    key={row.name}
                    className={index !== COMPARISON.length - 1 ? "border-b border-border/60" : ""}
                  >
                    <td className="px-5 py-4 align-top font-bold text-foreground">{row.name}</td>
                    <td className="px-5 py-4 align-top text-foreground">{row.fee}</td>
                    <td className="px-5 py-4 align-top text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Stripe&apos;s processing rate is set by Stripe, not JanaGana, and applies to any platform that routes
            payments through Stripe. You can optionally pass this fee to the payer at donate, join, and event
            checkout.
          </p>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
