# Real-user check: 20-minute test script (3 nonprofit admins)

Start with your own nonprofit, then two others (for example a temple and a cultural association). Run it on a laptop with a screen share. Record with consent. Do not help unless they are stuck for over 60 seconds, and note where.

Setup: a test org with 1 membership tier, 1 free event and 1 paid event (Stripe test mode), and a 10-row CSV with 2 bad rows.

## Timing
| Min | Part | What to do |
|---|---|---|
| 0-3 | Warm-up | Explain: "We are testing the software, not you. Think aloud." Ask how they run members and events today. |
| 3-5 | Context | Which tools, who does the work, how often, what goes wrong. |
| 5-9 | Task 1: first event | "Create and publish a free event for next month, then copy the link someone would use to sign up." Success: link copied, under 4 min. |
| 9-12 | Task 2: members | "Import this member list." Success: they find the import, read the errors on the 2 bad rows, and understand what to fix. |
| 12-15 | Task 3: money | "A member paid dues. Find that payment and the receipt." Then: "Someone says they were charged but didn't get a confirmation. Where do you look?" (Payments ledger, Communications outbox.) |
| 15-18 | Task 4: visitor view | Open the public join page in another window. "Would your members understand this? What would you change?" |
| 18-20 | Wrap-up | Ask the 5 questions below, then "Anything we missed?" |

Observe and tally: wrong turns, hesitations, words they use for things ("members" vs "contacts"), moments of confusion, delight, and anything they say they would not trust.

## Five interview questions
1. Walk me through the last event or membership renewal you ran, from start to finish. Where did it take longer than it should have?
2. When a member or donor emails you, "Did my payment go through?", how do you find out today?
3. What would make you trust a new tool with your member list and payments? What would make you refuse?
4. If this replaced what you use now, what is the one thing you could not give up, and what would you happily drop?
5. Who else on your team would touch this, and what should they not be allowed to do?

## Capture sheet (per participant)
Name/org | Role | Tools today | Task 1 time and result | Task 2 result | Task 3 result | Top 3 confusions | Top 3 quotes | Would pilot? (yes/maybe/no, why)

After you share the notes, I will run research synthesis (themes, impact/effort, v1.1 priorities).
