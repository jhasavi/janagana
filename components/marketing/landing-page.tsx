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
import { DEMO_URL, SITE_DESCRIPTION } from "@/lib/marketing";

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
    title: "Donations & peer-to-peer fundraising",
    text: "One-time and recurring donations, plus supporter fundraising pages that roll up to a shared campaign goal.",
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
    who: "Join It",
    focus: "Plans from $29/mo, plus a service fee on online payments",
    answer:
      "Free to start, with no JanaGana platform fee. Card processing is billed at Stripe's rate through your own Stripe account.",
  },
  {
    who: "Join It, Raklet",
    focus: "Hosted member websites",
    answer: "Keep the website you already have and embed the portal, events, join, and donate pages.",
  },
  {
    who: "Zeffy",
    focus: "Free fundraising tools for nonprofits",
    answer: "Memberships, events, and donations on one CRM and one payments ledger, for nonprofits and businesses.",
  },
  {
    who: "Raklet",
    focus: "Membership software for associations and clubs",
    answer: "Switching? Import your Raklet export directly, with tags that show where each record came from.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JanaGana",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: FEATURES.map((feature) => feature.title),
};

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />

      <main id="main" className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
          <div className="jg-portal-hero">
            <div className="jg-portal-gradient p-8 text-white sm:p-12 lg:p-16">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                Membership &amp; event software for nonprofits and small businesses
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Run memberships and events from one easy dashboard, with a CRM built in.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white sm:text-lg">
                Sell memberships, run ticketed events, take payments, and see every member&apos;s history in one
                place. It plugs into the website you already have. Free to start, set up in an afternoon.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/sign-up" size="lg" className="bg-white text-accent hover:bg-white/90">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                {DEMO_URL ? (
                  <ButtonLink
                    href={DEMO_URL}
                    size="lg"
                    className="border border-white/50 bg-white/10 text-white hover:bg-white/20"
                  >
                    Book a 20-min demo
                  </ButtonLink>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-white">No credit card needed. Free plan for every organization.</p>
              <p className="mt-6 flex items-center gap-2 text-sm text-white">
                <BadgeCheck className="h-4 w-4" />
                Running memberships and events for Namaste Boston and The Purple Wings
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-16">
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

        <section id="compare" className="mx-auto max-w-6xl px-6 pb-16">
          <div className="max-w-2xl">
            <p className="jg-eyebrow">Compare</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How JanaGana compares
            </h2>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border/80">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">How JanaGana compares with Join It, Raklet, and Zeffy</caption>
              <thead>
                <tr className="border-b border-border/70 bg-muted/60 text-left">
                  <th scope="col" className="px-5 py-3 font-bold text-muted-foreground">Alternative</th>
                  <th scope="col" className="px-5 py-3 font-bold text-muted-foreground">What they focus on</th>
                  <th scope="col" className="px-5 py-3 font-bold text-muted-foreground">JanaGana</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, index) => (
                  <tr key={row.focus} className={index !== COMPARISON.length - 1 ? "border-b border-border/60" : ""}>
                    <td className="px-5 py-4 align-top text-muted-foreground">{row.who}</td>
                    <td className="px-5 py-4 align-top text-muted-foreground">{row.focus}</td>
                    <td className="px-5 py-4 align-top font-medium text-foreground">{row.answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Competitor details come from their public websites, checked October 2026.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="jg-portal-hero">
            <div className="jg-portal-gradient flex flex-col items-start gap-5 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  See JanaGana with your own members and events.
                </h2>
                <p className="mt-2 max-w-xl text-white">
                  {DEMO_URL
                    ? "Book a 20-minute walkthrough, or import your first roster free in minutes."
                    : "Create your organization and import your first roster free in minutes."}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {DEMO_URL ? (
                  <ButtonLink href={DEMO_URL} size="lg" className="bg-white text-accent hover:bg-white/90">
                    Book a demo
                  </ButtonLink>
                ) : null}
                <ButtonLink
                  href="/sign-up"
                  size="lg"
                  className={
                    DEMO_URL
                      ? "border border-white/50 bg-white/10 text-white hover:bg-white/20"
                      : "bg-white text-accent hover:bg-white/90"
                  }
                >
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
