import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getAdminAuth } from "@/lib/firebase-admin";
import { signSessionJWT, COOKIE_NAME } from "@/lib/jwt";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { email, otp, usn } = await req.json();

    if (!email || !otp || !usn) {
      return NextResponse.json(
        { error: "Email, OTP, and USN are required" },
        { status: 400 }
      );
    }

    // IP rate limiting: 10 attempts per IP per 15 min
    const ip = getClientIP(req);
    const { allowed, retryAfterMs } = rateLimit(ip, "verify-otp", 10, 15 * 60 * 1000);
    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUSN = usn.trim().toUpperCase();
    const adminDb = getAdminFirestore();

    // Verify USN exists and email matches
    const [studentDoc, regDoc] = await Promise.all([
      adminDb.collection("students").doc(cleanUSN).get(),
      adminDb.collection("registrations").doc(cleanUSN).get(),
    ]);

    if (!studentDoc.exists && !regDoc.exists) {
      return NextResponse.json(
        { error: "USN not found in student database." },
        { status: 400 }
      );
    }

    const storedEmail = (regDoc.exists ? regDoc.data()?.email : studentDoc.data()?.email) || "";
    if (storedEmail.trim().toLowerCase() !== cleanEmail) {
      return NextResponse.json(
        { error: "Email does not match the USN on record." },
        { status: 400 }
      );
    }

    // Find the most recent unused OTP for this email
    const otpSnap = await adminDb
      .collection("otp_codes")
      .where("email", "==", cleanEmail)
      .where("used", "==", false)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (otpSnap.empty) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    const otpDocRef = otpSnap.docs[0].ref;
    const otpData = otpSnap.docs[0].data();

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      await otpDocRef.update({ used: true });
      return NextResponse.json(
        { error: "Code expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpData.attempts >= MAX_ATTEMPTS) {
      await otpDocRef.update({ used: true });
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpData.otp !== otp.trim()) {
      await otpDocRef.update({ attempts: otpData.attempts + 1 });
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    // Mark as used
    await otpDocRef.update({ used: true, verifiedAt: Date.now() });

    // Build user data from registration or student record
    const source = regDoc.exists ? regDoc.data()! : studentDoc.data()!;
    const userData = {
      usn: cleanUSN,
      name: source.name || "",
      email: cleanEmail,
      branch: source.branch || "",
      section: source.section || "",
      teamId: (regDoc.exists && source.teamId) || null,
      teamRole: (regDoc.exists && source.teamRole) || null,
    };

    // Create JWT session token
    const jwt = await signSessionJWT({
      usn: userData.usn,
      name: userData.name,
      email: userData.email,
      branch: userData.branch,
      section: userData.section,
    });

    // Create Firebase custom token for client-side Firestore auth
    const customToken = await getAdminAuth().createCustomToken(cleanUSN);

    // Build response with Set-Cookie
    const response = NextResponse.json({
      success: true,
      customToken,
      user: userData,
    });

    response.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
