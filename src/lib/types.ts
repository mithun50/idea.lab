/**
 * Shared TypeScript interfaces for Idea Lab Platform
 */

// CSV-imported master student data
export interface Student {
  usn: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  section: string;
  importedAt: Date | null;
  importBatch: string;
}

// Student registration record
export interface Registration {
  usn: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  section: string;
  teamId: string | null;
  teamRole: "lead" | "member" | null;
  registeredAt: Date | null;
  // Legacy fields (backward compat)
  partnerUSN?: string;
  pairCode?: string;
  pairStatus?: string;
}

// Team member entry within a team document
export interface TeamMember {
  usn: string;
  name: string;
  branch: string;
  section: string;
  status: "approved" | "pending_invite" | "pending_request";
  joinedAt: Date | null;
}

// Team document
export interface Team {
  teamId: string;
  name: string | null;
  leadUSN: string;
  members: TeamMember[];
  memberCount: number;
  status: "forming" | "full" | "locked";
  branchDistribution: Record<string, number>;
  isPublic: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Invite/request document
export interface Invite {
  inviteId: string;
  type: "invite" | "request";
  teamId: string;
  teamName: string | null;
  fromUSN: string;
  fromName: string;
  toUSN: string;
  toName: string;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: Date | null;
  respondedAt: Date | null;
}

// Global configuration
export interface Config {
  registrationsOpen: boolean;
  teamFormationOpen: boolean;
  maxTeamSize: number;
  minDifferentBranches: number;
  maxSameBranch: number;
  requireEEEorECE: boolean;
  csvLastUploadedAt: Date | null;
}

// localStorage session data
export interface SessionData {
  usn: string;
  name: string;
  email: string;
  branch: string;
  section: string;
  teamId: string | null;
  teamRole: "lead" | "member" | null;
  registeredAt: string;
}
