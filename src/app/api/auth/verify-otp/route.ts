import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, updateDoc, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find the most recent unused OTP for this email
    const otpQuery = query(
      collection(db, "otp_codes"),
      where("email", "==", cleanEmail),
      where("used", "==", false),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const snapshot = await getDocs(otpQuery);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    const otpDoc = snapshot.docs[0];
    const otpData = otpDoc.data();

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      await updateDoc(otpDoc.ref, { used: true });
      return NextResponse.json(
        { error: "Code expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpData.attempts >= MAX_ATTEMPTS) {
      await updateDoc(otpDoc.ref, { used: true });
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpData.otp !== otp.trim()) {
      await updateDoc(otpDoc.ref, { attempts: otpData.attempts + 1 });
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    // Mark as used
    await updateDoc(otpDoc.ref, { used: true, verifiedAt: Date.now() });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
