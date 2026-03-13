/**
 * localStorage Session Management
 *
 * Key: idealab_session
 * Stores student session data for authenticated pages.
 */

import { SessionData } from "./types";

const SESSION_KEY = "idealab_session";

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function setSession(data: SessionData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export function updateSessionTeam(teamId: string | null, teamRole: "lead" | "member" | null): void {
  const session = getSession();
  if (!session) return;
  session.teamId = teamId;
  session.teamRole = teamRole;
  setSession(session);
}
