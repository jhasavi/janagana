import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Contact as ContactIcon,
  HeartHandshake,
  Mail,
  Receipt,
  Repeat,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { MarketingFooter, MarketingNav } from "@/components/marketing/marketing-nav";

const FEATURES = [
  {
    icon: ContactIcon,
    title: "Contacts CRM",
    text: "Profiles, tags, filters, CSV import/export, and a single activity timeline per person.",
  },
  {
    icon: HeartHandshake,
    title: "Memberships & renewals",
    text: "Tiers, Stripe subscriptions, and a renewals desk with expiring/expired and payment-failed views.",
  },
  {
    icon: CalendarDays,
    title: "Events & ticketing",
    text: "Publish events, sell tickets through Stripe Checkout, and check people in at the door.",
  },
  {
    icon: Repeat,
    title: "Donations",
    text: "One-time and recurring donations, with an optional donor-covered processing fee.",
  },
  {
    icon: Receipt,
    title: "Payments ledger",
    text: "Every dues, event, and donation payment in one ledger with printable receipts.",
  },
  {
    icon: Mail,
    title: "Communications outbox",
    text: "Every receipt, confirmation, and reminder in one queue with delivery status and retry.",
  },
];

const COMPARISON = [
  {
    pain: "All-in-one hosted website",
    who: "Join It",
    answer: "Keep the website you already have — embed the portal, events, join, and donate pages.",
  },
  {
    pain: "$29/mo plus their payment stack",
    who: "Join It",
    answer: "0% JanaGana platform fee. Stripe's processing rate is disclosed, and it's your own Stripe account.",
  },
  {
    pain: '"100% free" donations, donations only',
    who: "Zeffy",
    answer: "Same 0% fee, but one unified ledger for dues, events, and donations — not a separate tool.",
  },
  {
    pain: "No migration story",
    who: "Both",
    answer: "Import your Raklet export directly, with provenance tags so you can see what came from where.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
          <div className="jg-portal-hero">
            <div className="jg-portal-gradient p-8 text-white sm:p-12 lg:p-16">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                For community &amp; diaspora organizations
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Keep your website. Let JanaGana run the rest.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
                Contacts, memberships, events, and donations — one operator dashboard behind the site you already
                have. Built for organizations migrating off Raklet, with honest fees and no lock-in.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/sign-up" variant="accent" size="lg">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink
                  href="/pricing"
                  size="lg"
                  className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  See pricing
                </ButtonLink>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-white/80">
                <BadgeCheck className="h-4 w-4" />
                Proven in production for Namaste Boston and The Purple Wings
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="max-w-2xl">
            <p className="jg-eyebrow">What you get</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              One dashboard, not three tools
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="jg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="max-w-2xl">
            <p className="jg-eyebrow">Why teams switch</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Built for the org that outgrew a spreadsheet — and got burned by Raklet
            </h2>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border/80">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/60 text-left">
                  <th className="px-5 py-3 font-bold text-muted-foreground">They lead with</th>
                  <th className="px-5 py-3 font-bold text-muted-foreground">Who</th>
                  <th className="px-5 py-3 font-bold text-muted-foreground">JanaGana</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, index) => (
                  <tr key={row.pain} className={index !== COMPARISON.length - 1 ? "border-b border-border/60" : ""}>
                    <td className="px-5 py-4 align-top text-muted-foreground">{row.pain}</td>
                    <td className="px-5 py-4 align-top text-muted-foreground">{row.who}</td>
                    <td className="px-5 py-4 align-top font-medium text-foreground">{row.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="jg-portal-hero">
            <div className="jg-portal-gradient flex flex-col items-start gap-5 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to move your community off Raklet?</h2>
                <p className="mt-2 max-w-xl text-white/90">
                  Create your organization and import your first roster in minutes.
                </p>
              </div>
              <ButtonLink href="/sign-up" variant="accent" size="lg" className="shrink-0">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
