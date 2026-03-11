"use client";

import { useState, useMemo } from "react";
import { Search, Download } from "lucide-react";

/**
 * StudentTable Component
 * 
 * Displays all registered students in a searchable, sortable table.
 * Features:
 * - Search by USN, name, or branch
 * - Pagination
 * - CSV export of all data
 */

interface Student {
    name: string;
    usn: string;
    phone: string;
    branch: string;
    section: string;
    partnerUSN: string;
    pairStatus: string;
    teamId: string | null;
}

interface StudentTableProps {
    students: Student[];
}

export default function StudentTable({ students }: StudentTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Filter students based on search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        const q = searchQuery.toLowerCase();
        return students.filter(
            (s) =>
                s.usn.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q) ||
                s.branch.toLowerCase().includes(q) ||
                s.section.toLowerCase().includes(q) ||
                s.partnerUSN.toLowerCase().includes(q) ||
                (s.teamId && s.teamId.toLowerCase().includes(q))
        );
    }, [students, searchQuery]);

    // Paginate
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Reset page when search changes
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    /**
     * Export all student data as CSV.
     */
    const exportCSV = () => {
        const headers = [
            "Name",
            "USN",
            "Phone",
            "Branch",
            "Section",
            "Partner USN",
            "Pair Status",
            "Team ID",
        ];
        const rows = students.map((s) => [
            s.name,
            s.usn,
            s.phone,
            s.branch,
            s.section,
            s.partnerUSN,
            s.pairStatus,
            s.teamId || "",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `idea-lab-registrations-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="space-y-6">
            {/* Search + Export */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by USN, name, branch..."
                        className="input-field !pl-11"
                    />
                </div>
                <button onClick={exportCSV} className="btn-secondary">
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-[1.5px] border-ink bg-paper">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-[1.5px] border-ink bg-paper2">
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px]">Name</th>
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px]">USN</th>
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px] hidden md:table-cell">Branch</th>
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px] hidden md:table-cell">Section</th>
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px] hidden lg:table-cell">Partner</th>
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px]">Status</th>
                            <th className="text-left py-4 px-4 font-bold uppercase tracking-wider text-[10px] hidden lg:table-cell">Team</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStudents.map((student, i) => (
                            <tr
                                key={student.usn}
                                className={`border-b border-line hover:bg-paper2 transition-colors ${i % 2 === 0 ? "" : "bg-paper/50"}`}
                            >
                                <td className="py-4 px-4 font-semibold text-ink">{student.name}</td>
                                <td className="py-4 px-4 font-mono text-xs text-ink">{student.usn}</td>
                                <td className="py-4 px-4 hidden md:table-cell text-muted">{student.branch}</td>
                                <td className="py-4 px-4 hidden md:table-cell text-muted">{student.section}</td>
                                <td className="py-4 px-4 hidden lg:table-cell font-mono text-xs text-muted">
                                    {student.partnerUSN}
                                </td>
                                <td className="py-4 px-4">
                                    <span
                                        className={`badge ${student.pairStatus === "confirmed"
                                                ? "badge-success"
                                                : "badge-warning"
                                            }`}
                                    >
                                        {student.pairStatus}
                                    </span>
                                </td>
                                <td className="py-4 px-4 hidden lg:table-cell font-mono text-xs font-bold text-ink">
                                    {student.teamId || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination + Results count */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    Showing {paginatedStudents.length} of {filteredStudents.length} entries
                </p>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="btn-secondary !py-2 !px-4 text-[11px]"
                        >
                            Prev
                        </button>
                        <span className="text-[11px] font-bold px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="btn-secondary !py-2 !px-4 text-[11px]"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
