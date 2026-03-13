"use client";

import { useState, useMemo } from "react";
import { Search, Download, FileSpreadsheet } from "lucide-react";

interface Student {
    name: string;
    usn: string;
    phone: string;
    branch: string;
    section: string;
    email?: string;
    teamId: string | null;
    teamRole?: string | null;
    // Legacy fields
    partnerUSN?: string;
    pairStatus?: string;
}

interface StudentTableProps {
    students: Student[];
    showTeamColumns?: boolean;
    showLegacyColumns?: boolean;
    teamNames?: Record<string, string>;
}

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "16px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "10px",
    color: "var(--muted)",
    whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
    padding: "16px",
    fontSize: "13px",
};

export default function StudentTable({ students, showTeamColumns = true, showLegacyColumns = false, teamNames = {} }: StudentTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const q = searchQuery.toLowerCase();
        return students.filter(
            (s) =>
                s.usn.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q) ||
                s.branch.toLowerCase().includes(q) ||
                s.section.toLowerCase().includes(q) ||
                (s.teamId && s.teamId.toLowerCase().includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.partnerUSN && s.partnerUSN.toLowerCase().includes(q))
        );
    }, [students, searchQuery]);

    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const exportCSV = () => {
        const headers = ["Name", "USN", "Email", "Phone", "Branch", "Section", "Team ID", "Team Name", "Team Role"];
        if (showLegacyColumns) headers.push("Partner USN", "Pair Status");
        const rows = students.map((s) => {
            const row = [s.name, s.usn, s.email || "", s.phone, s.branch, s.section, s.teamId || "", s.teamId ? (teamNames[s.teamId] || "") : "", s.teamRole || ""];
            if (showLegacyColumns) row.push(s.partnerUSN || "", s.pairStatus || "");
            return row;
        });

        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `idea-lab-data-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const exportXLS = async () => {
        try {
            const { exportSingleSheet } = await import("@/lib/xlsExport");
            const rows = students.map(s => ({
                Name: s.name,
                USN: s.usn,
                Email: s.email || "",
                Phone: s.phone,
                Branch: s.branch,
                Section: s.section,
                "Team ID": s.teamId || "",
                "Team Name": s.teamId ? (teamNames[s.teamId] || "") : "",
                "Team Role": s.teamRole || "",
            }));
            exportSingleSheet(rows, `idea-lab-data-${new Date().toISOString().split("T")[0]}.xlsx`, "Students");
        } catch {
            exportCSV();
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Search + Export */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                    <Search style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--muted)" }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by USN, name, branch, team..."
                        className="input-field"
                        style={{ paddingLeft: "44px" }}
                    />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={exportCSV} className="btn-secondary">
                        <Download style={{ width: 16, height: 16 }} /> CSV
                    </button>
                    <button onClick={exportXLS} className="btn-secondary">
                        <FileSpreadsheet style={{ width: 16, height: 16 }} /> XLS
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto", border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
                <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1.5px solid var(--ink)", background: "var(--paper2)" }}>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>USN</th>
                            <th style={thStyle} className="admin-hide-mobile">Branch</th>
                            <th style={thStyle} className="admin-hide-mobile">Section</th>
                            {showTeamColumns && (
                                <>
                                    <th style={thStyle} className="admin-hide-tablet">Team</th>
                                    <th style={thStyle} className="admin-hide-tablet">Team Name</th>
                                    <th style={thStyle} className="admin-hide-tablet">Role</th>
                                </>
                            )}
                            {showLegacyColumns && (
                                <>
                                    <th style={thStyle} className="admin-hide-tablet">Partner</th>
                                    <th style={thStyle}>Pair Status</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStudents.map((student, i) => (
                            <tr
                                key={student.usn}
                                style={{
                                    borderBottom: "1px solid var(--line)",
                                    background: i % 2 === 0 ? "transparent" : "var(--paper2)",
                                    transition: "background 0.15s",
                                }}
                            >
                                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--ink)" }}>{student.name}</td>
                                <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px", color: "var(--ink)" }}>{student.usn}</td>
                                <td style={{ ...tdStyle, color: "var(--muted)" }} className="admin-hide-mobile">{student.branch}</td>
                                <td style={{ ...tdStyle, color: "var(--muted)" }} className="admin-hide-mobile">{student.section}</td>
                                {showTeamColumns && (
                                    <>
                                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "var(--ink)" }} className="admin-hide-tablet">
                                            {student.teamId || "—"}
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: "12px", color: "var(--ink)" }} className="admin-hide-tablet">
                                            {student.teamId ? (teamNames[student.teamId] || "—") : "—"}
                                        </td>
                                        <td style={tdStyle} className="admin-hide-tablet">
                                            {student.teamRole ? (
                                                <span className={`badge ${student.teamRole === "lead" ? "badge-danger" : "badge-success"}`}>
                                                    {student.teamRole}
                                                </span>
                                            ) : "—"}
                                        </td>
                                    </>
                                )}
                                {showLegacyColumns && (
                                    <>
                                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }} className="admin-hide-tablet">
                                            {student.partnerUSN || "—"}
                                        </td>
                                        <td style={tdStyle}>
                                            <span className={`badge ${student.pairStatus === "confirmed" ? "badge-success" : "badge-warning"}`}>
                                                {student.pairStatus || "—"}
                                            </span>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "8px 0" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)" }}>
                    Showing {paginatedStudents.length} of {filteredStudents.length} entries
                </p>
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "11px" }}>
                            Prev
                        </button>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "0 8px" }}>{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "11px" }}>
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
