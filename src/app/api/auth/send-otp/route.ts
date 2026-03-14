import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, addDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Brevo multi-key round-robin with fallback ─────────────────────────────
// Env format: BREVO_KEYS=apikey1:sender1@mail.com,apikey2:sender2@mail.com,...
// Falls back to single BREVO_API_KEY + BREVO_SENDER_EMAIL if BREVO_KEYS is not set.

interface BrevoCredential {
  apiKey: string;
  senderEmail: string;
}

function getBrevoCredentials(): BrevoCredential[] {
  const multi = process.env.BREVO_KEYS;
  if (multi) {
    return multi.split(",").map((entry) => {
      const [apiKey, senderEmail] = entry.trim().split(":");
      return { apiKey, senderEmail };
    });
  }
  // Single key fallback
  if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
    return [{ apiKey: process.env.BREVO_API_KEY, senderEmail: process.env.BREVO_SENDER_EMAIL }];
  }
  return [];
}

// Simple round-robin counter (resets on server restart, which is fine)
let rrIndex = 0;

async function sendWithBrevo(
  cred: BrevoCredential,
  toEmail: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": cred.apiKey,
      },
      body: JSON.stringify({
        sender: { name: "Idea Lab — DBIT", email: cred.senderEmail },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
      }),
    });

    if (res.ok) return { ok: true, status: res.status };

    const errData = await res.json().catch(() => ({}));
    const errMsg = errData?.message || errData?.code || `HTTP ${res.status}`;
    console.error(`Brevo key ...${cred.apiKey.slice(-8)} failed: ${errMsg}`);
    return { ok: false, status: res.status, error: errMsg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    console.error(`Brevo key ...${cred.apiKey.slice(-8)} exception: ${msg}`);
    return { ok: false, status: 0, error: msg };
  }
}

/**
 * Round-robin with fallback: start from the next key in rotation,
 * if it fails (rate limit / error), try the remaining keys in order.
 */
async function sendEmailWithFallback(
  toEmail: string,
  subject: string,
  html: string
): Promise<void> {
  const creds = getBrevoCredentials();
  if (creds.length === 0) throw new Error("No Brevo API keys configured");

  const startIdx = rrIndex % creds.length;
  rrIndex++;

  // Try starting from the round-robin pick, then wrap around
  for (let attempt = 0; attempt < creds.length; attempt++) {
    const idx = (startIdx + attempt) % creds.length;
    const result = await sendWithBrevo(creds[idx], toEmail, subject, html);
    if (result.ok) return;
    // If rate-limited (429) or unauthorized (401), try next key
    // For other errors, also try next key
    console.warn(`Key ${idx + 1}/${creds.length} failed (${result.status}), trying next...`);
  }

  throw new Error("All Brevo API keys exhausted. Could not send email.");
}

// ── Email template ────────────────────────────────────────────────────────

function buildEmailHtml(otp: string): string {
  const digits = otp.split("");
  const digitCells = digits
    .map(
      (d, i) =>
        `<td style="width:48px;height:56px;text-align:center;font-size:28px;font-weight:800;font-family:'Courier New',monospace;color:#F2EFE9;background:#0D0D0D;border:none;${i < 5 ? "border-right:2px solid #F2EFE9;" : ""}">${d}</td>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#E8E4DD;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8E4DD;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#F2EFE9;border:1.5px solid #0D0D0D;">
        <tr>
          <td style="background:#0D0D0D;padding:24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;font-weight:700;color:#F2EFE9;letter-spacing:-0.5px;">&#9788; Idea Lab</td>
                <td align="right" style="font-size:10px;font-weight:600;color:#7A7670;text-transform:uppercase;letter-spacing:2px;">DBIT</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7A7670;">Verification Code</p>
            <p style="margin:0 0 24px;font-size:14px;color:#0D0D0D;line-height:1.6;">Enter this code to verify your identity on Idea Lab.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr>${digitCells}</tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;background:#fef2f0;border-left:3px solid #E8341A;">
                  <p style="margin:0;font-size:12px;font-weight:600;color:#E8341A;">This code expires in 10 minutes</p>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#7A7670;line-height:1.7;">If you didn't request this code, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1.5px solid rgba(13,13,13,0.1);">
            <p style="margin:0;font-size:11px;color:#7A7670;line-height:1.6;">Don Bosco Institute of Technology, Kumbalagodu, Bangalore</p>
            <p style="margin:4px 0 0;font-size:10px;color:#aaa;">This is an automated message. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = generateOTP();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;

    // Rate limit: max 1 OTP per email per 60 seconds
    const recentQuery = query(
      collection(db, "otp_codes"),
      where("email", "==", cleanEmail),
      where("used", "==", false),
      where("createdAt", ">", now - 60 * 1000),
      limit(1)
    );
    const recentSnap = await getDocs(recentQuery);

    if (!recentSnap.empty) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code." },
        { status: 429 }
      );
    }

    // Store OTP in Firestore
    await addDoc(collection(db, "otp_codes"), {
      email: cleanEmail,
      otp,
      expiresAt,
      used: false,
      attempts: 0,
      createdAt: now,
    });

    // Send email with round-robin + fallback
    await sendEmailWithFallback(
      cleanEmail,
      `${otp} is your Idea Lab verification code`,
      buildEmailHtml(otp)
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send OTP error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
