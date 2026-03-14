import { NextRequest, NextResponse } from "next/server";

// Allowed origins — loaded from env or defaults
// Set ALLOWED_ORIGINS in .env.local as comma-separated: https://idealab.dfriendsclub.in,https://other.com
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001,https://idealab.dfriendsclub.in")
    .split(",")
    .map((s) => s.trim())
);

function getOrigin(req: NextRequest): string | null {
  return req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || null;
}

export function middleware(req: NextRequest) {
  // Only protect /api/* routes
  if (!req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const origin = getOrigin(req);

  // Block requests with no origin (direct curl/Postman unless from same server)
  // In production, server-side rendered pages making fetch() won't have origin
  // so we also check for the custom header as an escape hatch
  if (!origin) {
    // Allow server-side calls (SSR/API-to-API within the same app)
    const host = req.headers.get("host");
    const isLocalhost = host?.startsWith("localhost");
    const isSameHost = ALLOWED_ORIGINS.has(`https://${host}`) || ALLOWED_ORIGINS.has(`http://${host}`);
    if (isLocalhost || isSameHost) {
      return NextResponse.next();
    }

    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Check origin against allowlist
  if (!ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
