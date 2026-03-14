"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, limit } from "firebase/firestore";
import { Team, Invite } from "@/lib/types";
import { getSession } from "@/lib/session";
import { generateInviteId } from "@/lib/idGenerator";
import { getBranchName, getSection } from "@/lib/usnValidator";
import Navbar from "@/components/Navbar";
import TeamCard from "@/components/TeamCard";
import { Search, Lock } from "lucide-react";

export default function BrowseTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestingTeam, setRequestingTeam] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [teamFormationOpen, setTeamFormationOpen] = useState<boolean | null>(null);
  const [rejectedTeamIds, setRejectedTeamIds] = useState<Set<string>>(new Set());

  const session = typeof window !== "undefined" ? getSession() : null;

  useEffect(() => {
    const checkGate = async () => {
      try {
        const configQ = query(collection(db, "config"), limit(1));
        const snap = await getDocs(configQ);
        if (!snap.empty) {
          setTeamFormationOpen(snap.docs[0].data().teamFormationOpen ?? true);
        } else {
          setTeamFormationOpen(true);
        }
      } catch {
        setTeamFormationOpen(true);
      }
    };
    checkGate();
  }, []);

  // Fetch rejected requests for current user
  useEffect(() => {
    if (!session) return;
    const fetchRejected = async () => {
      try {
        const rejQuery = query(
          collection(db, "invites"),
          where("fromUSN", "==", session.usn),
          where("type", "==", "request"),
          where("status", "==", "rejected")
        );
        const snap = await getDocs(rejQuery);
        const ids = new Set<string>();
        snap.forEach(d => ids.add(d.data().teamId));
        setRejectedTeamIds(ids);
      } catch { /* ignore */ }
    };
    fetchRejected();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.usn]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const q = query(
          collection(db, "teams"),
          where("isPublic", "==", true),
          where("status", "==", "forming")
        );
        const snap = await getDocs(q);
        const list: Team[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            teamId: data.teamId,
            name: data.name || null,
            leadUSN: data.leadUSN,
            members: data.members || [],
            memberCount: data.memberCount || 0,
            status: data.status,
            branchDistribution: data.branchDistribution || {},
            isPublic: data.isPublic,
            createdAt: data.createdAt?.toDate() || null,
            updatedAt: data.updatedAt?.toDate() || null,
          });
        });
        setTeams(list);
      } catch (err) {
        console.error("Error fetching teams:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleRequestJoin = async (teamId: string) => {
    if (!session) {
      setMessage({ type: "error", text: "Please register first." });
      return;
    }
    if (session.teamId) {
      setMessage({ type: "error", text: "You're already on a team." });
      return;
    }

    setRequestingTeam(teamId);
    setMessage(null);

    try {
      const team = teams.find(t => t.teamId === teamId);
      if (!team) throw new Error("Team not found.");

      // Check if already requested
      const existingQuery = query(
        collection(db, "invites"),
        where("teamId", "==", teamId),
        where("fromUSN", "==", session.usn),
        where("type", "==", "request"),
        where("status", "==", "pending")
      );
      const existing = await getDocs(existingQuery);
      if (!existing.empty) throw new Error("You already have a pending request for this team.");

      // Create request invite
      const inviteId = generateInviteId();
      await setDoc(doc(db, "invites", inviteId), {
        inviteId,
        type: "request",
        teamId,
        teamName: team.name || null,
        fromUSN: session.usn,
        fromName: session.name,
        toUSN: team.leadUSN,
        toName: team.members.find(m => m.usn === team.leadUSN)?.name || "",
        status: "pending",
        createdAt: serverTimestamp(),
        respondedAt: null,
      });

      // Add as pending_request member in team
      const newMember = {
        usn: session.usn,
        name: session.name,
        branch: session.branch || getBranchName(session.usn),
        section: session.section || getSection(session.usn),
        status: "pending_request",
        joinedAt: null,
      };
      await updateDoc(doc(db, "teams", teamId), {
        members: [...team.members, newMember],
        updatedAt: serverTimestamp(),
      });

      setMessage({ type: "success", text: "Request sent! The team lead will review it." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to send request." });
    } finally {
      setRequestingTeam(null);
    }
  };

  const filteredTeams = teams.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.teamId.toLowerCase().includes(q) ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      t.members.some(m => m.name.toLowerCase().includes(q) || m.branch.toLowerCase().includes(q))
    );
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <Navbar />

      <section style={{ marginTop: 60, maxWidth: "960px", margin: "80px auto 40px", padding: "0 20px" }}>
        {teamFormationOpen === false ? (
          <div className="fade-in-up text-center p-8 space-y-6" style={{ maxWidth: "400px", margin: "80px auto" }}>
            <div style={{ width: 64, height: 64, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center", margin: "0 auto" }}>
              <Lock style={{ width: 28, height: 28, color: "var(--muted)" }} />
            </div>
            <h3 style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)" }}>Team Formation Closed</h3>
            <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "320px", margin: "0 auto", lineHeight: 1.7 }}>
              Browsing and joining teams is currently disabled by the admin.
            </p>
          </div>
        ) : (
        <div className="fade-in-up space-y-8">
          <div>
            <h1 style={{ fontFamily: "var(--bebas)", fontSize: "48px", lineHeight: 1, color: "var(--ink)" }}>
              Browse Teams
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
              Find an open team to join. Send a request and wait for the team lead to approve.
            </p>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by team name, ID, or branch..."
              className="input-field"
              style={{ paddingLeft: "40px" }}
            />
          </div>

          {/* Messages */}
          {message && (
            <div style={{
              padding: "12px 16px", fontSize: "12px", fontWeight: 600,
              background: message.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(232, 52, 26, 0.08)",
              color: message.type === "success" ? "#059669" : "var(--red)",
              border: `1.5px solid ${message.type === "success" ? "#059669" : "var(--red)"}`,
            }}>
              {message.text}
            </div>
          )}

          {/* Teams Grid */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--bebas)", fontSize: "24px", color: "var(--ink)", marginBottom: "8px" }}>
                No Open Teams
              </p>
              <p style={{ color: "var(--muted)", fontSize: "13px" }}>
                No public teams are looking for members right now. Why not create your own?
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {filteredTeams.map(team => (
                <TeamCard
                  key={team.teamId}
                  team={team}
                  onRequestJoin={handleRequestJoin}
                  isRequesting={requestingTeam === team.teamId}
                  currentUSN={session?.usn}
                  isRejected={rejectedTeamIds.has(team.teamId)}
                />
              ))}
            </div>
          )}
        </div>
        )}
      </section>
    </main>
  );
}
