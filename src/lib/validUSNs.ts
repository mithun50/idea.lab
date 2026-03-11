/**
 * Valid USN List for DBIT Idea Lab
 * 
 * Pre-generated list of ~825 valid USNs across 7 branches and 14 sections.
 * Replace this data with the actual student list from the college.
 * 
 * Branch distribution (approximate):
 *   CSE  → 120 students (sections A, B, C, D)
 *   IOT  → 120 students (sections E, F, G, I)
 *   AI&ML → 120 students (sections J, K, L, M)
 *   AI&DS → 120 students (sections N, P, A, B)  — sections reuse letters across branches
 *   ISE  → 120 students (sections C, D, E, F)
 *   ECE  → 120 students (sections G, I, J, K)
 *   EEE  → 105 students (sections L, M, N)
 * 
 * Total: ~825 students
 */

// Sections assigned to each branch code
export const BRANCH_SECTIONS: Record<string, string[]> = {
    CS: ["A", "B", "C", "D"],
    IO: ["E", "F", "G", "I"],
    AI: ["J", "K", "L", "M"],
    AD: ["N", "P", "A", "B"],
    IS: ["C", "D", "E", "F"],
    EC: ["G", "I", "J", "K"],
    EE: ["L", "M", "N"],
};

// Helper to generate USNs for a branch
function generateBranchUSNs(branchCode: string, count: number): string[] {
    const usns: string[] = [];
    for (let i = 1; i <= count; i++) {
        const num = String(i).padStart(3, "0");
        usns.push(`1DB25${branchCode}${num}`);
    }
    return usns;
}

// Generate the full valid USN set
function buildValidUSNSet(): Set<string> {
    const allUSNs: string[] = [
        ...generateBranchUSNs("CS", 120),
        ...generateBranchUSNs("IO", 120),
        ...generateBranchUSNs("AI", 120),
        ...generateBranchUSNs("AD", 120),
        ...generateBranchUSNs("IS", 120),
        ...generateBranchUSNs("EC", 120),
        ...generateBranchUSNs("EE", 105),
    ];
    return new Set(allUSNs);
}

/**
 * Exported set of all valid USNs.
 * Use validUSNs.has(usn) to check membership.
 */
export const validUSNs: Set<string> = buildValidUSNSet();
