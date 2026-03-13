"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SessionData } from "@/lib/types";

interface SessionGuardProps {
  children: (session: SessionData) => React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const s = getSession();
      if (!s) {
        router.replace("/register");
        return;
      }

      // Quick Firestore validation
      try {
        const regDoc = await getDoc(doc(db, "registrations", s.usn));
        if (!regDoc.exists()) {
          // Registration deleted — clear session
          const { clearSession } = await import("@/lib/session");
          clearSession();
          router.replace("/register");
          return;
        }
      } catch {
        // Network error — trust local session
      }

      setSession(s);
      setChecking(false);
    };
    check();
  }, [router]);

  if (checking || !session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return <>{children(session)}</>;
}
