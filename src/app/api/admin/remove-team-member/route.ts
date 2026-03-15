import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/admin/remove-team-member
 *
 * Two actions:
 * 1. "remove-member" — Admin removes a specific member from any team (including locked)
 * 2. "dissolve" — Team lead dissolves their forming team
 */
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { action, idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let adminAuth;
    try {
      adminAuth = getAdminAuth();
    } catch (err) {
      console.error("Failed to initialize Firebase Admin Auth:", err);
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error("ID token verification failed:", err);
      return NextResponse.json({ error: "Token verification failed" }, { status: 401 });
    }

    let adminDb;
    try {
      adminDb = getAdminFirestore();
    } catch (err) {
      console.error("Failed to initialize Firestore Admin:", err);
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (action === "remove-member") {
      return handleRemoveMember(body, decoded, adminDb);
    } else if (action === "dissolve") {
      return handleDissolve(body, decoded, adminDb);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    console.error("remove-team-member error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Admin removes a specific member from any team.
 */
async function handleRemoveMember(
  body: { teamId: string; memberUSN: string },
  _decoded: { uid: string; email?: string },
  adminDb: FirebaseFirestore.Firestore
) {
  const { teamId, memberUSN } = body;

  if (!teamId || !memberUSN) {
    return NextResponse.json({ error: "teamId and memberUSN are required" }, { status: 400 });
  }

  const teamRef = adminDb.collection("teams").doc(teamId);
  const teamSnap = await teamRef.get();

  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const teamData = teamSnap.data()!;
  const members = teamData.members || [];
  const removedMember = members.find((m: { usn: string }) => m.usn === memberUSN);

  if (!removedMember) {
    return NextResponse.json({ error: "Member not in team" }, { status: 404 });
  }

  const updatedMembers = members.filter((m: { usn: string }) => m.usn !== memberUSN);
  const wasApproved = removedMember.status === "approved";

  // If removed member was lead, transfer or delete team
  if (teamData.leadUSN === memberUSN) {
    const otherApproved = updatedMembers.filter((m: { status: string }) => m.status === "approved");

    if (otherApproved.length === 0) {
      // No other approved members — delete team, clear all registrations
      for (const m of members) {
        if (m.status === "approved") {
          await adminDb.collection("registrations").doc(m.usn).update({
            teamId: null,
            teamRole: null,
          });
        }
      }
      // Expire pending invites
      const inviteSnap = await adminDb.collection("invites")
        .where("teamId", "==", teamId)
        .where("status", "==", "pending")
        .get();
      for (const d of inviteSnap.docs) {
        await d.ref.update({ status: "expired", respondedAt: FieldValue.serverTimestamp() });
      }
      await teamRef.delete();
      return NextResponse.json({ success: true, teamDeleted: true });
    }

    // Transfer lead to next approved member (by array order)
    const newLead = otherApproved[0];
    await teamRef.update({
      leadUSN: newLead.usn,
      members: updatedMembers,
      memberCount: updatedMembers.length,
      status: updatedMembers.filter((m: { status: string }) => m.status === "approved").length < 6 ? "forming" : teamData.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Update new lead's registration
    await adminDb.collection("registrations").doc(newLead.usn).update({
      teamRole: "lead",
    });
  } else {
    // Regular member removal
    const approvedCount = updatedMembers.filter((m: { status: string }) => m.status === "approved").length;
    await teamRef.update({
      members: updatedMembers,
      memberCount: updatedMembers.length,
      status: approvedCount < 6 ? "forming" : teamData.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Clear removed member's registration if they were approved
  if (wasApproved) {
    await adminDb.collection("registrations").doc(memberUSN).update({
      teamId: null,
      teamRole: null,
    });
  }

  return NextResponse.json({ success: true });
}

/**
 * Team lead dissolves their team (forming status only).
 */
async function handleDissolve(
  body: { teamId: string; callerUSN: string },
  _decoded: { uid: string; email?: string },
  adminDb: FirebaseFirestore.Firestore
) {
  const { teamId, callerUSN } = body;

  if (!teamId || !callerUSN) {
    return NextResponse.json({ error: "teamId and callerUSN are required" }, { status: 400 });
  }

  const teamRef = adminDb.collection("teams").doc(teamId);
  const teamSnap = await teamRef.get();

  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const teamData = teamSnap.data()!;

  // Verify caller is the team lead
  if (teamData.leadUSN !== callerUSN) {
    return NextResponse.json({ error: "Only the team lead can dissolve the team" }, { status: 403 });
  }

  if (teamData.status !== "forming") {
    return NextResponse.json({ error: "Can only dissolve teams in forming status" }, { status: 400 });
  }

  const members = teamData.members || [];

  // Clear all approved members' registrations
  for (const m of members) {
    if (m.status === "approved") {
      await adminDb.collection("registrations").doc(m.usn).update({
        teamId: null,
        teamRole: null,
      });
    }
  }

  // Expire all pending invites
  const inviteSnap = await adminDb.collection("invites")
    .where("teamId", "==", teamId)
    .where("status", "==", "pending")
    .get();
  for (const d of inviteSnap.docs) {
    await d.ref.update({ status: "expired", respondedAt: FieldValue.serverTimestamp() });
  }

  // Delete team document
  await teamRef.delete();

  return NextResponse.json({ success: true });
}
