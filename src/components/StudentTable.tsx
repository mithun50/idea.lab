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
        <div className="space-y-4">
            {/* Search + Export */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by USN, name, branch..."
                        className="input-field !pl-11"
                    />
                </div>
                <button onClick={exportCSV} className="btn-secondary !bg-violet-600/20 hover:!bg-violet-600/40 text-violet-300 border-violet-500/30 shrink-0">
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Results count */}
            <p className="text-sm text-slate-500">
                Showing {paginatedStudents.length} of {filteredStudents.length} students
            </p>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">
                                Name
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">
                                USN
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300 hidden md:table-cell">
                                Branch
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300 hidden md:table-cell">
                                Section
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300 hidden lg:table-cell">
                                Partner
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300">
                                Status
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-300 hidden lg:table-cell">
                                Team
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedStudents.map((student, i) => (
                            <tr
                                key={student.usn}
                                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.02]"
                                    }`}
                            >
                                <td className="py-3 px-4 font-medium">{student.name}</td>
                                <td className="py-3 px-4 font-mono text-xs text-cyan-400">
                                    {student.usn}
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell text-slate-400">
                                    {student.branch}
                                </td>
                                <td className="py-3 px-4 hidden md:table-cell text-slate-400">
                                    {student.section}
                                </td>
                                <td className="py-3 px-4 hidden lg:table-cell font-mono text-xs text-slate-400">
                                    {student.partnerUSN}
                                </td>
                                <td className="py-3 px-4">
                                    <span
                                        className={`badge text-xs ${student.pairStatus === "confirmed"
                                                ? "badge-success"
                                                : "badge-warning"
                                            }`}
                                    >
                                        {student.pairStatus}
                                    </span>
                                </td>
                                <td className="py-3 px-4 hidden lg:table-cell font-mono text-xs text-slate-400">
                                    {student.teamId || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn-secondary !py-2 !px-3 text-sm"
                    >
                        ← Prev
                    </button>
                    <span className="text-sm text-slate-400 px-4">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn-secondary !py-2 !px-3 text-sm"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
