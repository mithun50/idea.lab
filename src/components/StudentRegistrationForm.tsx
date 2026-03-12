"use client";

import { useState, useCallback, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, getDocs, limit, serverTimestamp } from "firebase/firestore";
import { validateUSN, getBranchName, getSection } from "@/lib/usnValidator";
import { setSession } from "@/lib/session";
import { useRouter } from "next/navigation";
import { CheckCircle2, PencilLine, Lock, Loader2 } from "lucide-react";

export default function StudentRegistrationForm() {
  const router = useRouter();
  const [usn, setUSN] = useState("");
  const [usnValidation, setUsnValidation] = useState<{
    valid: boolean | null;
    message: string;
    branch?: string;
    section?: string;
  }>({ valid: null, message: "" });

  // Auto-filled from CSV / students collection
  const [studentInfo, setStudentInfo] = useState<{
    name: string;
    email: string;
    phone: string;
    branch: string;
    section: string;
  } | null>(null);

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  // Check registration gate
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const q = query(collection(db, "config"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setRegistrationOpen(data.registrationsOpen ?? true);
        } else {
          setRegistrationOpen(true);
        }
      } catch {
        setRegistrationOpen(true);
      }
    };
    checkStatus();
  }, []);

  // Track whether USN was not found in CSV
  const [csvNotFound, setCsvNotFound] = useState(false);

  // Validate USN and look up student data (strict: must exist in students collection)
  const handleUSNChange = useCallback(async (value: string) => {
    const upper = value.toUpperCase();
    setUSN(upper);
    setStudentInfo(null);
    setSubmitError("");
    setCsvNotFound(false);

    if (!upper || upper.length < 10) {
      setUsnValidation({ valid: null, message: "" });
      return;
    }

    // Format validation
    const result = validateUSN(upper);
    if (!result.valid) {
      setUsnValidation({ valid: false, message: result.error || "Invalid USN" });
      return;
    }

    // Temporarily show branch/section while looking up
    setUsnValidation({
      valid: null,
      message: "Verifying against student database...",
      branch: result.branch,
      section: result.section,
    });

    // Look up in students collection (CSV master data) — REQUIRED
    setIsLookingUp(true);
    try {
      // First check if already registered (allow login flow)
      const existingReg = await getDoc(doc(db, "registrations", upper));
      if (existingReg.exists()) {
        const regData = existingReg.data();
        setUsnValidation({
          valid: true,
          message: `${regData.branch || result.branch} — Section ${regData.section || result.section} (already registered)`,
          branch: regData.branch || result.branch,
          section: regData.section || result.section,
        });
        setStudentInfo({
          name: regData.name || "",
          email: regData.email || "",
          phone: regData.phone || "",
          branch: regData.branch || result.branch || "",
          section: regData.section || result.section || "",
        });
        return;
      }

      // Must exist in students collection (CSV imported)
      const studentDoc = await getDoc(doc(db, "students", upper));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        setUsnValidation({
          valid: true,
          message: `${data.branch || result.branch} — Section ${data.section || result.section}`,
          branch: data.branch || result.branch,
          section: data.section || result.section,
        });
        setStudentInfo({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          branch: data.branch || result.branch || "",
          section: data.section || result.section || "",
        });
      } else {
        // NOT found in CSV — block registration
        setCsvNotFound(true);
        setUsnValidation({
          valid: false,
          message: "USN not found in the student database. Contact your admin to ensure the CSV has been uploaded.",
        });
        setStudentInfo(null);
      }
    } catch {
      // Network error — block to be safe
      setUsnValidation({
        valid: false,
        message: "Could not verify USN. Please check your connection and try again.",
      });
      setStudentInfo(null);
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo) return;
    setIsSubmitting(true);
    setSubmitError("");

    const upperUSN = usn.toUpperCase();

    try {
      if (!studentInfo.name.trim()) throw new Error("Name is required.");
      if (!studentInfo.phone.trim() || !/^\d{10}$/.test(studentInfo.phone.trim()))
        throw new Error("Please enter a valid 10-digit phone number.");

      // Final CSV validation — must exist in students collection or already be registered
      const studentDoc = await getDoc(doc(db, "students", upperUSN));
      const existingDoc = await getDoc(doc(db, "registrations", upperUSN));

      if (!studentDoc.exists() && !existingDoc.exists()) {
        throw new Error("USN not found in the student database. Admin must upload the CSV first.");
      }

      // Check if already registered
      if (existingDoc.exists()) {
        // Already registered — just create session and redirect
        const data = existingDoc.data();
        setSession({
          usn: upperUSN,
          name: data.name,
          email: data.email || studentInfo.email,
          branch: data.branch,
          section: data.section,
          teamId: data.teamId || null,
          teamRole: data.teamRole || null,
          registeredAt: new Date().toISOString(),
        });
        router.push("/dashboard");
        return;
      }

      const branch = studentInfo.branch || getBranchName(upperUSN);
      const section = studentInfo.section || getSection(upperUSN);

      // Create registration
      await setDoc(doc(db, "registrations", upperUSN), {
        name: studentInfo.name.trim(),
        usn: upperUSN,
        email: studentInfo.email.trim(),
        phone: studentInfo.phone.trim(),
        branch,
        section,
        teamId: null,
        teamRole: null,
        registeredAt: serverTimestamp(),
      });

      // Set session
      setSession({
        usn: upperUSN,
        name: studentInfo.name.trim(),
        email: studentInfo.email.trim(),
        branch,
        section,
        teamId: null,
        teamRole: null,
        registeredAt: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationOpen === false) {
    return (
      <div className="text-center p-8 space-y-6 fade-in-up">
        <div style={{ width: 64, height: 64, border: "1.5px solid var(--ink)", display: "grid", placeItems: "center", margin: "0 auto" }}>
          <Lock style={{ width: 28, height: 28, color: "var(--muted)" }} />
        </div>
        <h3 style={{ fontFamily: "var(--bebas)", fontSize: "28px", color: "var(--ink)" }}>Registrations Closed</h3>
        <p style={{ color: "var(--muted)", fontSize: "14px", maxWidth: "320px", margin: "0 auto", lineHeight: 1.7 }}>
          The registration window for <strong style={{ color: "var(--ink)" }}>Idea Lab</strong> is currently closed.
        </p>
      </div>
    );
  }

  if (registrationOpen === null) {
    return <div className="text-center p-12"><div className="spinner mx-auto" /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 fade-in-up">
      {/* USN Field */}
      <div>
        <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>
          Your USN
        </label>
        <input
          type="text"
          value={usn}
          onChange={(e) => handleUSNChange(e.target.value)}
          placeholder="1DB25CS001"
          className={`input-field ${usnValidation.valid === true ? "success" : usnValidation.valid === false ? "error" : ""}`}
          maxLength={10}
          required
        />
        {usnValidation.message && (
          <p style={{ marginTop: "6px", fontSize: "12px", fontWeight: 600, color: usnValidation.valid ? "#10b981" : "var(--red)" }}>
            {usnValidation.message}
          </p>
        )}
        {isLookingUp && (
          <p style={{ marginTop: "6px", fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Loader2 style={{ width: 12, height: 12, animation: "spin 0.8s linear infinite" }} />
            Verifying against student database...
          </p>
        )}
        {csvNotFound && (
          <div style={{ marginTop: "10px", padding: "12px 14px", background: "rgba(232, 52, 26, 0.06)", border: "1.5px solid var(--red)", fontSize: "12px", color: "var(--red)", fontWeight: 600, lineHeight: 1.6 }}>
            This USN was not found in the student database. Please ask your admin to upload the student CSV with your USN before you can register.
          </div>
        )}
      </div>

      {/* Auto-filled fields (show once USN is valid) */}
      {studentInfo && usnValidation.valid && (
        <>
          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>
              Full Name
            </label>
            <input
              type="text"
              value={studentInfo.name}
              onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
              placeholder="Enter your full name"
              className="input-field"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>
              Email
            </label>
            <input
              type="email"
              value={studentInfo.email}
              onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })}
              placeholder="your.email@dbit.in"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "8px" }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={studentInfo.phone}
              onChange={(e) => setStudentInfo({ ...studentInfo, phone: e.target.value })}
              placeholder="10-digit phone number"
              className="input-field"
              maxLength={10}
              pattern="\d{10}"
              required
            />
            {studentInfo.phone && !/^\d{10}$/.test(studentInfo.phone) && (
              <p style={{ marginTop: "6px", fontSize: "12px", fontWeight: 600, color: "var(--red)" }}>Enter a valid 10-digit phone number</p>
            )}
          </div>

          {/* Branch/Section display */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "14px 18px", background: "var(--paper2)", border: "1.5px solid var(--line)" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Branch</span>
              <p style={{ fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{studentInfo.branch}</p>
            </div>
            <div style={{ padding: "14px 18px", background: "var(--paper2)", border: "1.5px solid var(--line)" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Section</span>
              <p style={{ fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{studentInfo.section}</p>
            </div>
          </div>
        </>
      )}

      {/* Error */}
      {submitError && (
        <div style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, background: "rgba(232, 52, 26, 0.08)", color: "var(--red)", border: "1.5px solid var(--red)" }}>
          {submitError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !usnValidation.valid || !studentInfo}
        className="btn-primary w-full"
        style={{ padding: "16px" }}
      >
        {isSubmitting ? (
          <><div className="spinner" /> Registering...</>
        ) : (
          <><PencilLine style={{ width: 20, height: 20 }} /> Register & Continue</>
        )}
      </button>
    </form>
  );
}
