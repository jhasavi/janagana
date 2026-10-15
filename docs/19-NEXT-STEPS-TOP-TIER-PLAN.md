# JanaGana — Plan for a top-tier product clients will pay for

_Written 2026-10-15. This version starts from commit 5704c07: Stripe Connect payouts, refunds, opt-in JanaGana donation, and organizations paying card processing._

This plan covers four things:

- Where JanaGana stands today
- How it can make money without breaking the "free for community groups" promise
- What it should look and feel like
- Which features complete its objective: one place where a small community organization runs members, dues, events, donations, campaigns and sponsors, without a patchwork of five tools

Competitor prices come from vendor pages where possible. Otherwise they come from aggregators and are marked _(3P)_; check those before quoting them to anyone. Revenue numbers are scenarios, not forecasts.

---

## 1. Executive summary

### The opportunity

Small community organizations are badly served today:

- Cultural associations, temples, youth groups, alumni clubs and small nonprofits are JanaGana's two pilots' peers.
- They pay either a monthly subscription (Join It $29–$199, WildApricot ~$63+ _(3P)_, Raklet $49+) or a percentage of every payment (Donorbox, MemberPlanet, Join It 1.5–3%).
- The "free" options (Zeffy, Givebutter) fund themselves with pre-filled donor tips. Those tips are now under regulatory and legal fire:
  - A 21-state AG letter to GoFundMe in 2026 criticized pre-filled tips.
  - TINA.org issued an alert on Givebutter in June 2026.
  - Two class actions are pending against Givebutter.

### JanaGana's positioning

> "Everything a community organization needs — members, dues, events, donations, campaigns, sponsors — free. No platform fee, no surprise charges for donors. Paid upgrades only when you want them."

### The ten things that matter most, in order

| # | Action | Why |
|---|---|---|
| 1 | Ship Stripe Connect to production. Onboard Namaste Boston and Purple Wings. Turn off the legacy pooled-account fallback. | This is a legal and accounting prerequisite before any outside org pays. |
| 2 | Turn on self-serve signup with a guided 15-minute setup wizard. | Today onboarding is operator-run through scripts, so it cannot scale. |
| 3 | Launch a **Pro plan (~$29–39/mo, flat per org)** with brand control, broadcast email, automations, advanced reports and a custom domain. | Predictable revenue that doesn't depend on donor goodwill. |
| 4 | Build **broadcast email + newsletters** with segments. | This is the biggest gap. Every competitor has it, and it drives daily use. |
| 5 | Add a **reporting dashboard**: revenue, members, retention, campaign progress and payouts. | Board treasurers buy on reports. |
| 6 | Generate **year-end tax statements** as PDF and email for donors. | The "must have" in January; competitors bundle it. |
| 7 | Run a **visual design pass**: brand-color theming per tenant, logo upload, real dark mode, dialog/tabs/sheet components, polished portal templates. | Look and feel is the first thing buyers judge. |
| 8 | Build a **volunteer module**: shifts, sign-ups, hours. | Only one stub remains in the nav, and community groups run on volunteers. |
| 9 | Productize **paid migration** from WildApricot, Join It, Raklet, Givebutter and spreadsheets ($199–$999). | Win switchers, and charge for the help. |
| 10 | Add **observability and trust**: error tracking, uptime page, privacy/terms/DPA, accessibility pass. | Paying clients need to trust you with their data and money. |

---

## 2. Where JanaGana stands (October 2026)

### Strengths: already built and working

- **CRM**:
  - Contacts with search, filters, pagination, tags and lifecycle stage
  - Activity timeline and households
  - Custom fields (up to 3)
  - Lead scoring
  - CSV/Excel import (with a Raklet preset) and CSV exports guarded against formula injection
- **Memberships**: tiers, Stripe subscriptions with auto-renew, renewal reminders (cron), dunning badges, digital membership card with QR, and Apple/Google Wallet passes (code-complete but untested with real credentials).
- **Events**: ticket types, member pricing, capacity with concurrency-safe registration, Stripe checkout, QR check-in, and embeddable event widgets.
- **Fundraising**: one-time and monthly donations, campaigns with goals, peer-to-peer fundraiser pages with a leaderboard, and sponsors with Stripe-hosted invoices.
- **Growth loops**: referral codes with reward tiers, and UTM capture.
- **Member self-service portal**: magic-link sign-in, profile, renewal, activity history and an opt-in directory.
- **Payments done right**:
  - Per-org Stripe Connect payouts
  - Refunds that reverse the transfer and fee
  - Idempotent webhooks
  - Numbered receipts
  - Donors pay exactly what they choose
  - The JanaGana donation is opt-in
- **Engineering hygiene**:
  - Tenant-isolation tests and about 30 tsx test scripts
  - 12 Playwright specs and release gates
  - Audit log and health endpoint
  - Mobile Lighthouse: Performance 95, Accessibility 96, Best Practices 100, SEO 100 (May 2026 run)

### Gaps that stop a paying customer from switching

| Area | Gap | Severity |
|---|---|---|
| Communications | No broadcast email or newsletter, no saved segments, no SMS. The Communications page only shows transactional emails. | **Critical** |
| Onboarding | Self-serve signup is off by default (`ENABLE_SELF_SERVE_ONBOARDING`). Pilots are set up with scripts. | **Critical** |
| Reporting | No dashboards for revenue trends, retention or payouts. Only CSV exports. | High |
| Tax receipts | Receipts are per payment, plus a CSV giving summary. There is no year-end statement PDF or email. | High |
| Branding | The portal theme is limited to logo URL and tagline. No colors, logo upload or custom domain. | High |
| Volunteers | Stub only (`ContactType.VOLUNTEER` tag). | Medium–High |
| Automation | No workflows (welcome series, lapsed-member win-back, thank-you after a gift). | Medium |
| Integrations | No QuickBooks/Xero, Mailchimp, Zapier, Google Calendar or webhooks out. | Medium |
| Forms | No custom form builder (surveys, applications, waivers). | Medium |
| Events | `WAITLISTED` status exists but isn't implemented. No recurring events, calendar view, or add-ons such as meals or t-shirts. | Medium |
| P2P | Fundraisers can't edit their page after creating it. No milestone or thank-you emails. | Medium |
| Look and feel | Dark mode is defined but not wired. Only 10 UI components (no dialog, tabs or sheet). Leftover "upgrade prompt" and FREE/PRO code. One known contrast failure. | Medium |
| Ops | No error tracking (Sentry), product analytics or status page. | Medium |
| Reach | No i18n or multi-currency. Diaspora and cultural groups often want Hindi, Nepali, Spanish and so on. | Later (it is a differentiator) |

---

## 3. Competitive landscape

| Platform | Model | Price anchor | What it's loved for | What it's criticized for |
|---|---|---|---|---|
| **Zeffy** | Free; pre-filled donor tip; absorbs card fees | $0 | Truly free; forms, tickets, auctions, P2P | Pre-filled tip (reportedly 15–17% default); donors miss the opt-out |
| **Givebutter** | Free with tips; 3% fee if tips are off; Plus $29–129/mo _(3P)_ | $0 / $29+ | CRM, texting, P2P, workflows | Default 15% tip; TINA.org alert; class actions |
| **Join It** | Subscription + 1.5–3% service fee | $29 / $99 / $199 per month | Membership cards, check-in, renewals | Fee stacking; white-label only at $199 |
| **Raklet** | By contacts | Free ≤100; $49 (500); $99 (1k); $399 (10k) | All-in-one; branded app add-on | Price jumps with contact count |
| **WildApricot** | By contacts | ~$63 → $556/mo _(3P)_ | Bundled website, events and membership | Steep tiers, price hikes, uneven support |
| **MemberPlanet** | Subscription + 1–2% | Free / $50 / $100 / $175 per month _(3P)_ | Groups and chapters | Fees on top of processing |
| **Donorbox** | 2.95–3.95% (free) or $150/mo + ~1.75% | % of volume | Donation forms, kiosk, text-to-give | Fee stacking, paywalled customization |
| **Bloomerang / Neon / LGL** | Donor CRMs by records or revenue | ~$45–$400/mo _(3P)_ | Donor retention and reports | Cost, complexity, separate event and membership tools |
| **Eventbrite** | 3.7% + $1.79 + 2.9% per ticket _(3P)_ | Per ticket | Discovery | Expensive for community events |

**Where JanaGana wins:**

- It is the only product combining membership, events, donations, P2P, sponsors and a member portal with no platform fee **and** an honest, opt-in donor contribution.
- It is built for **community and cultural organizations**, not only registered 501(c)(3)s.

**Where it must catch up:** email, reports, branding and onboarding (see §2).

---

## 4. Monetization

### 4.1 Principles

1. **Never take a cut of the org's money by default.** That is the whole pitch against Join It, Donorbox and MemberPlanet.
2. **Never trick donors.** The JanaGana donation stays opt-in, shows as its own line, and the total appears before payment. This keeps JanaGana on the right side of:
   - The state AG guidance in the GoFundMe letter
   - The FTC Unfair or Deceptive Fees Rule, in effect since 12 May 2025, which covers live-event tickets: show the all-in price up front
3. **Charge orgs for things that cost JanaGana money or save the org real time.** Examples: custom domain, bulk email/SMS, automation, migration, multi-chapter.

### 4.2 Know the cost floor first (important)

With Stripe Connect, where the platform sets pricing, Stripe charges the **platform**:

- **About $2 per active connected account per month**
- **0.25% + $0.25 per payout**

Verify both on Stripe's pricing page; they are from a third-party source. They come on top of card processing, and this release already recovers card processing from the org's share.

Worked example: a small org raising **$10k a year** with weekly payouts costs JanaGana about:

- $24 in account fees
- $13 in per-payout fixed fees
- $25 in volume fees

That is about **$62 a year**.

**Do now:**

- Make payouts **monthly by default**; orgs can switch to weekly or daily. That cuts the per-payout fixed fees to about $3 a year.
- Either fold the 0.25% payout fee into the org's "cost of collecting" recovery (consistent with "the org pays processing"), or absorb it and price Pro accordingly. **Recommendation:** fold it in and disclose it as "card + payout processing ≈ 3.2% + 30¢".

### 4.3 Revenue streams (recommended mix)

| Stream | How it works | Price | Notes |
|---|---|---|---|
| **A. Opt-in donor contribution** (live now) | "Add $2 / $5 / Other" at checkout; default is "No thanks" | — | Lowest risk, lowest yield. Opt-in rates are unknown, so **measure them**. Scenario: 10–25% of donors add ~$3.50, so ~0.5–1.2% of volume. On $1M volume that is about $5k–$12k a year. That alone won't fund the company. |
| **B. JanaGana Pro** (main engine) | Flat price per org, unlimited admins and contacts | **$29/mo, or $290/yr**; 50% off for registered small nonprofits under $50k revenue | Includes custom domain, full brand theming, broadcast email (e.g. 10k sends/mo), automations, advanced reports and year-end statements. Optionally remove the "Powered by JanaGana" footer. Market anchor is $29–$129. Avoid per-seat pricing, because "unlimited admins" sells. |
| **C. JanaGana Network** (chapters / federations) | Parent org plus chapters, roll-up reports, shared branding | From **$149/mo** + $15 per chapter | Fits umbrella groups such as Nepali/Indian/Bhutanese associations, temple networks, alumni chapters and youth leagues. Few accounts, high value. |
| **D. Messaging credits** | SMS and extra email beyond the Pro allowance | Cost + ~30% | SMS needs 10DLC registration (overhead), so ship it after email. |
| **E. Paid migration and setup** | White-glove import from WildApricot, Join It, Raklet, Givebutter, Zeffy and spreadsheets, plus a portal set-up session | **$199 / $499 / $999** by size | Also the best acquisition tool. Price it below the cost of staying on a $63+/mo competitor. |
| **F. Optional org-chosen fee mode** (later, maybe) | An org can turn off the donor contribution and pay a small fee instead, like Givebutter's "tips off" mode | e.g. 1% | Only offer it if orgs ask, since it conflicts with "no platform fee". |
| **G. Sponsor / vendor marketplace** (later) | Vetted services (insurance, printing, payroll), clearly labeled, never on donor pages | Referral rev-share | Only once there are hundreds of orgs. |

### 4.4 Illustrative economics (assumptions, replace with pilot data)

These are year-2 scenarios with 1,000 active orgs and an average of $25k raised each, so $25M volume. They are rough.

| Line | Low | Base | High |
|---|---|---|---|
| Opt-in donor contributions (0.5% / 0.8% / 1.2% of volume) | $125k | $200k | $300k |
| Pro conversion (4% / 7% / 10% at ~$300/yr net) | $12k | $21k | $30k |
| Network plans (3 / 8 / 15 at ~$2.5k/yr) | $7.5k | $20k | $37.5k |
| Migration services (40 / 80 / 150 at ~$400) | $16k | $32k | $60k |
| **Gross revenue** | **~$160k** | **~$273k** | **~$428k** |
| Minus Stripe Connect platform costs (if not recovered), hosting, email, support | −$40–80k | | |

**Takeaways:**

- Volume drives the donor-contribution line, and Pro drives predictability.
- The single most sensitive variable is **support hours per org**. The existing `JanaGana-unit-economics.xlsx` model is right about this.
- Measure opt-in rate, average contribution, support minutes per org and Pro conversion in the first 90 days.

The unit-economics sheet on the Mac mini models a $49/$99 subscription. Given the market and the free positioning, **start Pro at $29** and add a higher tier only when the Network or chapter features exist.

### 4.5 Product changes needed to sell Pro

- Revive the dormant plan plumbing (`TenantPlan`, `lib/plans/gate.ts`, `upgrade-prompt.tsx`). Today `isPro()` always returns true.
- Gate **only new premium features**. Don't take back anything free orgs have today.
- Run Pro billing through Stripe Billing on the platform account (the Tenant `stripeCustomerId`/`stripeSubscriptionId` fields already exist).
- Add a 30-day Pro trial for new orgs, a billing page and an annual-plan discount.
- Add a public **/pricing page** (it was removed in b8c2d3d) with "Free forever" vs "Pro". Include a calculator: "What you'd pay on Join It / Donorbox / Eventbrite vs JanaGana."

---

## 5. Features that complete the objective

**Effort key:** S = under 1 week, M = 1–3 weeks, L = more than 3 weeks (one developer plus Claude).

### Phase 1 — "Switch-worthy" (next 6–8 weeks)

1. **Self-serve onboarding wizard (M).**
   - Steps: create org, upload logo and pick colors, connect Stripe, create the first membership tier/event/donation page, import contacts, share the portal link.
   - Show a setup checklist on the dashboard home.
   - Turn on `ENABLE_SELF_SERVE_ONBOARDING`.
2. **Broadcast email and newsletters (L).**
   - Composer with templates and merge tags.
   - Audience = saved segment (tier, tag, lapsed, donors this year, event attendees).
   - Scheduling, open and click tracking via Resend webhooks, one-click unsubscribe, CAN-SPAM footer.
   - Use the existing `CommunicationPurpose.GENERAL`.
3. **Saved segments (M).** Reusable filters shared across the contact list, email audiences and exports.
4. **Reports dashboard (M).**
   - Revenue by month and purpose, members (active / expiring / lapsed, retention), campaign progress, event attendance.
   - **Payouts** from the Stripe Connect balance-transactions API.
   - Export to CSV and PDF.
5. **Year-end giving statements (M).** Per-donor annual PDF with the org's EIN and a tax-deductibility statement, bulk-emailed in January, downloadable in the member portal.
6. **Brand theming and logo upload (M).**
   - Primary and accent colors plus font choice per tenant.
   - Upload the logo instead of pasting a URL (Vercel Blob or S3).
   - Apply it across the portal, emails, receipts and wallet passes.
7. **Event waitlist + recurring events (M).** Implement `WAITLISTED` with automatic promotion and email. Add recurring weekly/monthly events (classes, satsang, practices).

### Phase 2 — "Delightful and sticky" (weeks 8–16)

8. **Volunteer module (L):** opportunities, shifts with capacity, self sign-up from the portal, reminders, hours log and a volunteer leaderboard.
9. **Automations (L):** trigger → wait → action. Starter recipes:
   - Welcome new member
   - Thank first-time donor
   - Lapsed member win-back
   - Event reminder plus post-event survey
   - Birthday/anniversary greeting
10. **Form builder (M):** custom questions on registrations and joins, standalone forms (applications, surveys, waivers with e-signature checkbox), results into the contact profile.
11. **P2P upgrades (S–M):** fundraisers can edit their pages, goal milestones, thank-you and "you hit your goal" emails, team fundraising.
12. **Event extras (M):** add-ons (meal, t-shirt), discount codes, group tickets, calendar view, Google/Apple calendar links, door sales on mobile (tap to pay via Stripe Terminal later).
13. **Integrations (M each):** QuickBooks/Xero export of payouts and fees, Zapier/Make outbound webhooks, Google Calendar sync, Mailchimp sync for orgs that won't switch email.
14. **More custom fields (S):** raise the limit from 3 (Pro: unlimited) and add file and multi-select types.

### Phase 3 — "Top tier / differentiators" (quarter 2 onward)

15. **Multi-language portal and emails** (Hindi, Nepali, Spanish, Bengali, Gujarati, Tamil…). No major competitor serves diaspora communities natively.
16. **Chapters / Network** (the paid tier from §4.3 C).
17. **Custom domain** for the portal (Vercel domains API).
18. **Installable mobile member app (PWA)** with membership card, events, check-in scanner for admins, push notifications. A PWA comes before native apps.
19. **SMS / WhatsApp** reminders and broadcasts (WhatsApp matters for many cultural communities).
20. **AI assistant (Claude):**
    - Draft newsletters and thank-you notes
    - Summarize "how did our gala do"
    - Suggest who to ask for renewals or donations, using the existing lead scoring
    - Clean messy imports
    - A cheap, high-wow Pro feature
21. **Auctions and raffles.** Zeffy has them, but raffles are legally complex by state, so do this last.
22. **Multi-currency** (CAD, GBP, INR, AUD) using Stripe Connect accounts in other countries.

---

## 6. Look and feel

**Goal:** a non-technical treasurer or volunteer coordinator should feel "this is nicer than what we pay for" within 60 seconds. Donors should feel they're on the org's own website.

### 6.1 Design system (foundation, M)

- **Finish the component kit.** Add Dialog, Sheet (mobile drawers), Tabs, Tooltip, Dropdown, DatePicker, Combobox, Skeleton loaders, Toast (sonner is already installed) and a Stepper (for the onboarding wizard). Base them on the Radix primitives already in `package.json`.
- **Wire dark mode properly.** Add a `next-themes` ThemeProvider. Use `dark:` tokens, which already exist in `globals.css`. Add a toggle in the user menu.
- **Typography and spacing scale.** Keep Plus Jakarta Sans. Define a consistent type ramp (display / h1–h4 / body / caption) and an 8-pt spacing grid.
- **Accessibility.**
  - Fix the Lighthouse contrast failure; the saffron primary on white needs a darker shade for text.
  - Visible focus rings, keyboard-navigable tables and forms, and `prefers-reduced-motion`.
  - Target WCAG 2.2 AA; it is a selling point to public-facing nonprofits.
- **Remove leftovers.** Delete the "Pilot scope" settings section, the "Details are coming soon." fallback and the stale upgrade-prompt copy, unless Pro revives them deliberately.

### 6.2 Admin dashboard

- **Home = "Today"**: setup checklist (until done), key numbers (this month's revenue, new members, upcoming events), "needs attention" (failed payments, expiring members, pending registrations), recent activity feed.
- **Global search and quick-create (Cmd-K):** contacts, events, payments.
- **Bulk actions** on the contact table: tag, email, export, add to segment.
- **Contact profile redesign:** a header card (membership status, lifetime giving, last activity), then tabs (Timeline · Payments · Events · Household · Notes).
- **Charts** on reports, campaign and event pages (sparklines, goal thermometers). Use one charting library with the theme tokens.
- **Mobile admin:** event check-in, contact lookup and "record cash payment" must work one-handed on a phone at the door.

### 6.3 Public portal (what donors and members see)

- **Three templates per org:** Classic, Modern and Festive (for cultural orgs). Org colors, hero image and logo apply everywhere.
- **Checkout polish:**
  - Show the amount summary before Stripe: "Your gift $50 → Org; Optional JanaGana donation $0; **Total $50**".
  - Apple Pay / Google Pay (Stripe Checkout supports both; make sure they're enabled on the platform).
- **Social proof on campaign pages:** recent supporters (opt-in), progress bar, countdown, share buttons with Open Graph preview images.
- **Thank-you pages that convert:** share the campaign, become a member, volunteer, add to calendar.
- **Embeds:** donate button and event widgets styled to match the org's site, with copy-paste snippets in Settings (partly exists).
- **Performance:** keep LCP under 2.5s on mobile (currently 2.3s). Trim unused JS and CSS (Lighthouse flags), and add source maps for debugging.

### 6.4 Brand and marketing site

- A refreshed landing page with a crisp promise ("Free. Honest. Built for community.").
- A comparison table and fee calculator vs Join It, Zeffy, Givebutter and WildApricot.
- Real pilot stories from Namaste Boston and Purple Wings, with screenshots or a 90-second video demo.
- `/pricing`, `/security`, `/privacy`, `/terms`, `/switch-from-wildapricot` (and similar) SEO pages.

---

## 7. Trust, compliance and reliability (things paying clients check)

- **Payments:**
  - Finish Stripe live-mode Connect setup.
  - Default to monthly payouts.
  - Disclose processing in Settings → Payments (done).
  - Handle disputes: alert the org admin on `charge.dispute.created`, and decide how disputes on destination charges are recovered from the connected account.
- **Fee and tip compliance:**
  - Keep the JanaGana donation opt-in.
  - Label JanaGana as a separate recipient from the charity.
  - Keep event ticket prices all-in, as they are now.
  - Get a one-time legal review of the donor-contribution flow and charitable-solicitation registration exposure. California's AG has treated fundraising platforms as regulated intermediaries (Flipcause).
- **Data protection:**
  - Privacy policy, terms and a DPA template.
  - Data export of everything per org, and account deletion.
  - Least-privilege roles: add Treasurer, Event Manager and Volunteer Coordinator to the current Admin / view-only roles.
  - 2FA via Clerk.
- **Observability:**
  - Sentry (errors), Vercel Analytics or PostHog (product usage)
  - An uptime monitor plus a public status page
  - Wire the existing `OPS_ALERT_WEBHOOK_URL` to Slack/email
  - Nightly DB backups with a tested restore
- **Security:**
  - Keep the tenant-isolation tests as a release gate.
  - Add rate limits on public forms (partly done) and a CAPTCHA fallback for abusive bursts.
  - Run a light penetration test before the first 50 paying orgs.

---

## 8. Go-to-market

1. **Prove it with the two pilots first.**
   - Both should run their next membership drive and next event fully on JanaGana with Connect payouts.
   - Collect testimonials, numbers ("saved $X vs Eventbrite") and support-hour measurements.
2. **Beachhead:** South Asian and Himalayan diaspora associations, temples and cultural groups in the US Northeast, then nationally. They have:
   - Dense networks, so referrals work (the referral program already exists).
   - Multilingual needs no one serves.
   - Cash-strapped volunteer boards who hate fees.
3. **Channels:**
   - Community-led: present at federation meetings and offer a "first 50 orgs get free migration" deal.
   - SEO comparison pages and YouTube walkthroughs.
   - Partnerships with fiscal sponsors and umbrella federations (feeds the Network plan).
4. **Sales motion:** self-serve signup, then an automated 14-day onboarding email series, then an optional 30-minute setup call (free for Pro annual, otherwise $99).
5. **Support:** in-app help center (searchable docs), office hours, and a Discord or WhatsApp community for admins. Budget support time per org carefully; it is the margin killer.

---

## 9. Metrics to track from day one

| Metric | Why | Early target |
|---|---|---|
| Time from signup to first payment received | Activation | < 7 days |
| % orgs with Stripe Connect ACTIVE | Activation | > 70% of signups that create a paid item |
| Opt-in rate and average JanaGana donation | Validates stream A | Measure; don't guess |
| Monthly active admins per org | Stickiness | ≥ 2 |
| Payment volume per org | Drives stream A | Grow month over month |
| Pro trial → paid conversion | Validates stream B | ≥ 15% of trials |
| Support minutes per org per month | Unit economics | < 30 min |
| Logo churn (orgs leaving per year) | Retention | < 20% |
| Donor checkout conversion (portal view → paid) | Portal quality | > 25% on donate pages |

Add a hidden operator dashboard (extend `/dashboard/platform/tips`) with these numbers.

---

## 10. 90-day roadmap

| Weeks | Focus | Deliverables |
|---|---|---|
| 1–2 | **Production readiness** | Deploy Connect live. Onboard both pilots. Set `STRIPE_CONNECT_LEGACY_TENANT_SLUGS=""`. Monthly payouts. Sentry and uptime monitoring. Privacy, terms and DPA. Fix the contrast issue. Remove leftover code. |
| 3–4 | **Self-serve + design foundation** | Onboarding wizard and setup checklist. Component kit (Dialog/Sheet/Tabs/Toast/Skeleton). Dark mode. Logo upload and brand colors. |
| 5–7 | **Communications** | Saved segments. Broadcast email composer with templates, scheduling, tracking and unsubscribe. |
| 8–9 | **Reports + tax statements** | Reports dashboard including payouts. Year-end giving statements (ready before January). |
| 10–11 | **Pro launch** | Plan gating for new premium features, billing page, trial, `/pricing` page with fee calculator, comparison pages. |
| 12–13 | **Volunteers + polish** | Volunteer shifts and sign-up. Event waitlist and recurring events. P2P page editing and milestone emails. Collect case studies, then announce publicly. |

After that come automations, the form builder, integrations, i18n, chapters/Network, the PWA, SMS/WhatsApp and the AI assistant (Phase 3).

---

## 11. Decisions for the owner

1. **Pro price:** $29/mo (recommended) or $39/mo, plus the nonprofit discount policy.
2. **Payout fees:** fold the Stripe Connect payout fee (~0.25%) into the org's processing recovery (recommended), or absorb it.
3. **Default payout schedule:** monthly (recommended) or weekly.
4. **Free vs Pro line:** which of custom domain, brand theming, broadcast email volume, automations, advanced reports and year-end statements are Pro-only.
   - **Recommendation:** year-end statements and basic email stay free, because they are table stakes.
   - Theming beyond logo/colors, the custom domain, high email volume, automations and the AI assistant are Pro.
5. **Beachhead community** and the first federation partner to approach.
6. **Legal review** of the donor-contribution flow and charitable-solicitation exposure before public launch.

---

## Appendix — sources and caveats

- Zeffy pricing and model: https://www.zeffy.com/pricing ; contribution figures: https://www.zeffy.com/en-gb/blog/how-does-zeffy-make-money (it reports a ~4% average contribution; third-party claims of 15–17% are unverified).
- Givebutter fees _(3P)_: https://costbench.com/software/nonprofit-crm/givebutter/ ; criticism: https://truthinadvertising.org/articles/givebutters-hidden-fees/ ; litigation: https://topclassactions.com/lawsuit-settlements/lawsuit-news/class-action-claims-givebutter-secretly-added-fees-to-online-charitable-donations/
- Join It: https://joinit.com/pricing · Raklet: https://www.raklet.com/alternatives/memberclicks-vs-raklet/ · WildApricot _(3P)_: https://www.capterra.com/p/76116/Wild-Apricot/pricing/ · MemberPlanet _(3P)_: https://capterra.com/p/131768/MemberPlanet/pricing/ · Donorbox _(3P)_: https://aitoolsbakery.com/blog/donorbox-pricing/ · Eventbrite _(3P)_: https://www.tickettailor.com/eventbrite-fees-and-cost
- State AG letter on default tips: https://www.crowell.com/en/insights/client-alerts/bipartisan-group-of-state-attorneys-general-and-state-charity-regulators-send-letter-to-gofundme-implications-for-charities-and-companies
- FTC fees rule (live-event tickets): https://btlaw.com/en/insights/alerts/2025/ftc-finalizes-junk-fees-rule-new-pricing-disclosure-requirements-take-effect-may-12-2025
- Stripe Connect platform fees _(3P — verify on stripe.com/connect/pricing)_: https://flexprice.io/blog/stripe-pricing-breakdown-2026
- Internal: the codebase survey (this repo, Oct 2026), `JanaGana-unit-economics.xlsx` (Mac mini; illustrative and formula-only), and the Lighthouse mobile report (Mac mini, May 2026).
- I could not verify: real Zeffy/Givebutter average tip rates, official 2026 prices for Bloomerang, Neon, LGL, WildApricot and MemberClicks, or Eventbrite's nonprofit discount. Re-check before quoting publicly.
