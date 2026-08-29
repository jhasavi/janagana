#!/usr/bin/env tsx
/**
 * Pure unit checks for lib/leads/scoring.ts — no DB, no env required.
 *
 *   npm run test:lead-scoring
 */
import { computeLeadScore, gradeForScore, categoryForScore } from "@/lib/leads/scoring";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAILED: ${message}`);
}

function main() {
  const now = new Date("2026-08-28T00:00:00.000Z");

  // Cold, no-signal lead
  const cold = computeLeadScore({
    interestType: null,
    source: null,
    activityCount: 0,
    lastActivityAt: null,
    hasMembership: false,
    hasDonation: false,
    now,
  });
  assert(cold === 0, `expected cold score 0, got ${cold}`);
  assert(gradeForScore(cold) === "F", "cold lead should grade F");
  assert(categoryForScore(cold) === "Cold", "cold lead should be Cold");

  // Fresh newsletter signup via a trusted portal source
  const freshNewsletter = computeLeadScore({
    interestType: "NEWSLETTER",
    source: "portal_contact",
    activityCount: 1,
    lastActivityAt: now,
    hasMembership: false,
    hasDonation: false,
    now,
  });
  assert(freshNewsletter === 25, `expected 5+5+5+10=25, got ${freshNewsletter}`);
  assert(categoryForScore(freshNewsletter) === "Cool", "score 25 should be Cool");

  // High-intent membership interest, recently active
  const hotMembershipInterest = computeLeadScore({
    interestType: "MEMBERSHIP_INTEREST",
    source: "public_membership_checkout",
    activityCount: 3,
    lastActivityAt: now,
    hasMembership: false,
    hasDonation: false,
    now,
  });
  assert(hotMembershipInterest === 55, `expected 25+5+15+10=55, got ${hotMembershipInterest}`);
  assert(gradeForScore(hotMembershipInterest) === "C", "score 55 should grade C");
  assert(categoryForScore(hotMembershipInterest) === "Warm", "score 55 should be Warm");

  // Converted member with a donation — should cap at 100, not overflow
  const converted = computeLeadScore({
    interestType: "MEMBERSHIP_INTEREST",
    source: "public_membership_checkout",
    activityCount: 10,
    lastActivityAt: now,
    hasMembership: true,
    hasDonation: true,
    now,
  });
  assert(converted === 100, `expected clamp to 100, got ${converted}`);
  assert(gradeForScore(converted) === "A", "converted lead should grade A");
  assert(categoryForScore(converted) === "Hot", "converted lead should be Hot");

  // Stale lead (last activity 120 days ago) should be penalized but not go negative
  const stale = computeLeadScore({
    interestType: "NEWSLETTER",
    source: null,
    activityCount: 0,
    lastActivityAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
    hasMembership: false,
    hasDonation: false,
    now,
  });
  assert(stale === 0, `expected clamp to 0 (5 - 10), got ${stale}`);

  // Unknown interestType/source should not throw or add points
  const unknown = computeLeadScore({
    interestType: "SOME_FUTURE_TYPE",
    source: "some_new_channel",
    activityCount: 0,
    lastActivityAt: null,
    hasMembership: false,
    hasDonation: false,
    now,
  });
  assert(unknown === 0, `expected 0 for unrecognized interestType/source, got ${unknown}`);

  console.log("Lead scoring checks passed:");
  console.log(`- cold=${cold} freshNewsletter=${freshNewsletter} hotMembershipInterest=${hotMembershipInterest}`);
  console.log(`- converted(clamped)=${converted} stale(clamped)=${stale} unknown=${unknown}`);
}

main();
