/**
 * Lead scoring engine — pure functions, no DB access.
 * See docs/16-LEAD-INTELLIGENCE-PLAN.md for the rubric and rationale.
 */

export type LeadGrade = "A" | "B" | "C" | "D" | "F";
export type LeadCategory = "Hot" | "Warm" | "Cool" | "Cold";

const TRUSTED_SOURCES = new Set([
  "portal_contact",
  "public_portal",
  "event_registration",
  "public_donation",
  "public_donate",
  "public_membership_checkout",
  "public_checkout",
  "public_checkout_free",
  "tpw_class_import",
  "icon_roster_import",
]);

const HIGH_INTENT_INTEREST_TYPES = new Set(["MEMBERSHIP_INTEREST"]);
const MID_INTENT_INTEREST_TYPES = new Set(["CLASS_INTEREST", "INVESTMENT_ANALYSIS"]);
const LOW_INTENT_INTEREST_TYPES = new Set(["NEWSLETTER"]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ScoringInputs {
  interestType: string | null;
  source: string | null;
  activityCount: number;
  lastActivityAt: Date | null;
  hasMembership: boolean;
  hasDonation: boolean;
  now?: Date;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function interestTypePoints(interestType: string | null): number {
  if (!interestType) return 0;
  if (HIGH_INTENT_INTEREST_TYPES.has(interestType)) return 25;
  if (MID_INTENT_INTEREST_TYPES.has(interestType)) return 15;
  if (LOW_INTENT_INTEREST_TYPES.has(interestType)) return 5;
  return 0;
}

function sourcePoints(source: string | null): number {
  if (!source) return 0;
  return TRUSTED_SOURCES.has(source) ? 5 : 0;
}

function activityPoints(activityCount: number): number {
  return clamp(activityCount, 0, 4) * 5;
}

function recencyPoints(lastActivityAt: Date | null, now: Date): number {
  if (!lastActivityAt) return 0;
  const ageDays = (now.getTime() - lastActivityAt.getTime()) / MS_PER_DAY;
  if (ageDays <= 7) return 10;
  if (ageDays <= 30) return 5;
  if (ageDays > 90) return -10;
  return 0;
}

/** Computes a 0–100 lead score (never negative) from observable engagement signals. */
export function computeLeadScore(inputs: ScoringInputs): number {
  const now = inputs.now ?? new Date();

  let score = 0;
  score += interestTypePoints(inputs.interestType);
  score += sourcePoints(inputs.source);
  score += activityPoints(inputs.activityCount);
  score += recencyPoints(inputs.lastActivityAt, now);
  if (inputs.hasMembership) score += 30;
  if (inputs.hasDonation) score += 25;

  return clamp(score, 0, 100);
}

export function gradeForScore(score: number): LeadGrade {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

export function categoryForScore(score: number): LeadCategory {
  if (score >= 70) return "Hot";
  if (score >= 45) return "Warm";
  if (score >= 20) return "Cool";
  return "Cold";
}
