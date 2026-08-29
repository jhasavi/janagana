import type { LeadCategory } from "@/lib/leads/scoring";

export const leadCategoryBadgeVariant: Record<LeadCategory, "danger" | "warning" | "accent" | "default"> = {
  Hot: "danger",
  Warm: "warning",
  Cool: "accent",
  Cold: "default",
};

export const lifecycleStageLabel: Record<string, string> = {
  NEW: "New",
  ENGAGED: "Engaged",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  LOST: "Lost",
};
