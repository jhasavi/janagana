import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-nav";
import { PRO_PLAN_MONTHLY_CENTS } from "@/lib/plans/pro-plan";

export const metadata = {
  title: "Pricing — JanaGana",
  description: "0% JanaGana platform fee. You pay only Stripe's standard processing rate, using your own Stripe account.",
};

const FREE_INCLUDED = [
  "Unlimited contacts, tags, filters, and CSV import/export",
  "1 membership tier, Stripe subscriptions, and the renewals desk",
  "Up to 3 live published events at a time",
  "One-time and recurring donations, with donor-covered fee toggle",
  "Unified payments ledger and printable receipts",
  "Communications outbox with delivery status and retry",
  "1 custom field on contacts",
  "Digital membership card with local QR check-in",
];

const PRO_INCLUDED = [
  "Everything in Free, plus:",
  "Unlimited membership tiers and live events",
  "Households — group contacts, set a payer, see families together",
  "Public member directory (opt-in, name/type only)",
  "Up to 3 custom fields on contacts",
  "Apple & Google Wallet membership passes",
  "Year-end giving summary export for donors",
  "Priority renewal reminders",
];

const COMPARISON = [
  { name: "JanaGana", fee: "0% platform fee", note: "Stripe's processing rate only, your own Stripe account" },
  {
    name: "Raklet",
    fee: "$49+/mo + 1–4% txn fee",
    note: "Tiered by contact count, plus per-admin-seat pricing — we import your Raklet CSV export directly, free",
  },
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

        <section className="mx-auto max-w-5xl px-6 pb-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="jg-card flex flex-col overflow-hidden">
              <div className="border-b border-border/70 bg-muted/40 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">Free</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold text-foreground">$0</span>
                  <span className="text-sm font-medium text-muted-foreground">/month platform fee</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Plus Stripe&apos;s standard processing rate on payments you collect. No monthly minimum.
                </p>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <ul className="flex-1 space-y-3">
                  {FREE_INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-6 text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/sign-up" variant="secondary" size="lg" className="mt-8">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>

            <div className="jg-card overflow-hidden ring-2 ring-primary/40">
              <div className="jg-portal-gradient p-6 text-white sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">Pro</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">${(PRO_PLAN_MONTHLY_CENTS / 100).toFixed(0)}</span>
                  <span className="text-sm font-medium text-white/85">/month</span>
                </p>
                <p className="mt-2 text-sm text-white/85">
                  Still 0% platform fee on payments — Pro unlocks organization power-user features, not payment
                  processing.
                </p>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <ul className="flex-1 space-y-3">
                  {PRO_INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-6 text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/sign-up" size="lg" className="mt-8">
                  Get started, upgrade anytime
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center">
            <ButtonLink href="/pricing#compare" variant="ghost" size="sm">
              Compare to Raklet, Join It &amp; Zeffy
            </ButtonLink>
          </p>
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
