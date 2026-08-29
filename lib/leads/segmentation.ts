import type { LifecycleStage } from "@prisma/client";

export interface SegmentationInputs {
  score: number;
  currentStage: LifecycleStage;
  tags: string[];
  hasMembership: boolean;
  hasDonation: boolean;
  /** True when the contact has no recent activity and no score — a candidate for LOST. */
  isStale: boolean;
}

export interface SegmentationResult {
  lifecycleStage: LifecycleStage;
  tags: string[];
}

const FORWARD_RANK: Record<Exclude<LifecycleStage, "LOST">, number> = {
  NEW: 0,
  ENGAGED: 1,
  QUALIFIED: 2,
  CONVERTED: 3,
};

function addTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags : [...tags, tag];
}

/**
 * Never regresses CONVERTED, and LOST only applies to leads that never converted —
 * a quiet existing member/donor is not "lost", just inactive.
 */
export function applySegmentationRules(inputs: SegmentationInputs): SegmentationResult {
  let tags = inputs.tags;
  let stage = inputs.currentStage;

  if (inputs.hasMembership || inputs.hasDonation) {
    return { lifecycleStage: "CONVERTED", tags };
  }

  if (stage === "CONVERTED") {
    return { lifecycleStage: stage, tags };
  }

  if (inputs.score >= 70) {
    tags = addTag(tags, "hot-lead");
    if (FORWARD_RANK[stage as Exclude<LifecycleStage, "LOST">] < FORWARD_RANK.QUALIFIED || stage === "LOST") {
      stage = "QUALIFIED";
    }
  } else if (inputs.score >= 45) {
    if (stage === "NEW" || stage === "LOST") {
      stage = "ENGAGED";
    }
  }

  if (inputs.isStale && stage !== "QUALIFIED") {
    tags = addTag(tags, "cold-lead");
    stage = "LOST";
  }

  return { lifecycleStage: stage, tags };
}
