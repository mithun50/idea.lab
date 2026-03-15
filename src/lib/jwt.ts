/**
 * JWT Session Management — Server-side only
 *
 * Uses `jose` (HS256) for Edge-compatible JWT signing/verification.
 * Cookie name: idealab_token
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIE_NAME = "idealab_token";

export interface SessionJWTPayload extends JWTPayload {
  usn: string;
  name: string;
  email: string;
  branch: string;
  section: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export async function signSessionJWT(payload: {
  usn: string;
  name: string;
  email: string;
  branch: string;
  section: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionJWT(
  token: string
): Promise<SessionJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionJWTPayload;
  } catch {
    return null;
  }
}
