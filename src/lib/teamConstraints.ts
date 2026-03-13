/**
 * Team Composition Constraints
 *
 * Rules:
 * - Exactly 6 members per team
 * - Max 4 from same branch
 * - Min 2 different branches
 * - At least 1 from EEE or ECE (warning until 6th member, then hard block)
 */

import { TeamMember } from "./types";

export interface ConstraintResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function getBranchDistribution(members: Pick<TeamMember, "branch">[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const m of members) {
    dist[m.branch] = (dist[m.branch] || 0) + 1;
  }
  return dist;
}

/**
 * Check if a new member can be added to the team.
 * Only considers approved + the candidate (not pending members).
 */
export function canAddMember(
  currentMembers: Pick<TeamMember, "branch" | "status">[],
  candidateBranch: string,
  maxTeamSize: number = 6,
  maxSameBranch: number = 4,
): ConstraintResult {
  const approved = currentMembers.filter(m => m.status === "approved");
  const errors: string[] = [];
  const warnings: string[] = [];

  // Team full check
  if (approved.length >= maxTeamSize) {
    errors.push("Team is already full.");
    return { valid: false, errors, warnings };
  }

  // Same branch limit
  const dist = getBranchDistribution(approved);
  const candidateCount = (dist[candidateBranch] || 0) + 1;
  if (candidateCount > maxSameBranch) {
    errors.push(`Maximum ${maxSameBranch} members from ${candidateBranch} allowed.`);
  }

  // If this would be the 6th member, enforce hard constraints
  const newTotal = approved.length + 1;
  if (newTotal === maxTeamSize) {
    // Min 2 different branches
    const newDist = { ...dist, [candidateBranch]: candidateCount };
    const uniqueBranches = Object.keys(newDist).length;
    if (uniqueBranches < 2) {
      errors.push("Team must have at least 2 different branches.");
    }

    // EEE/ECE requirement
    const hasEEEorECE =
      (newDist["EEE"] || 0) > 0 || (newDist["ECE"] || 0) > 0;
    if (!hasEEEorECE) {
      errors.push("Team must have at least 1 member from EEE or ECE.");
    }
  } else if (newTotal >= 4) {
    // Warning for EEE/ECE as team grows
    const newDist = { ...dist, [candidateBranch]: candidateCount };
    const hasEEEorECE =
      (newDist["EEE"] || 0) > 0 || (newDist["ECE"] || 0) > 0;
    if (!hasEEEorECE) {
      const slotsLeft = maxTeamSize - newTotal;
      warnings.push(
        `No EEE/ECE member yet. ${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} remaining — you'll need at least 1.`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Full team composition validation (for locking/completing a team).
 */
export function validateTeamComposition(
  members: Pick<TeamMember, "branch" | "status">[],
  maxTeamSize: number = 6,
  minDifferentBranches: number = 2,
  maxSameBranch: number = 4,
): ConstraintResult {
  const approved = members.filter(m => m.status === "approved");
  const errors: string[] = [];
  const warnings: string[] = [];
  const dist = getBranchDistribution(approved);

  if (approved.length !== maxTeamSize) {
    errors.push(`Team must have exactly ${maxTeamSize} members (currently ${approved.length}).`);
  }

  const uniqueBranches = Object.keys(dist).length;
  if (uniqueBranches < minDifferentBranches) {
    errors.push(`Team must have at least ${minDifferentBranches} different branches.`);
  }

  for (const [branch, count] of Object.entries(dist)) {
    if (count > maxSameBranch) {
      errors.push(`Maximum ${maxSameBranch} from ${branch} (currently ${count}).`);
    }
  }

  const hasEEEorECE = (dist["EEE"] || 0) > 0 || (dist["ECE"] || 0) > 0;
  if (!hasEEEorECE) {
    errors.push("Team must have at least 1 member from EEE or ECE.");
  }

  return { valid: errors.length === 0, errors, warnings };
}
