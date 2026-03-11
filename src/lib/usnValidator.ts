/**
 * USN Validation & Branch/Section Detection
 * 
 * USN Format: 1DB25 + BranchCode(2 letters) + Number(3 digits)
 * Example: 1DB25CS001
 * 
 * Branch codes:
 *   CS → CSE, IO → IOT, AI → AI&ML, AD → AI&DS,
 *   IS → ISE, EC → ECE, EE → EEE
 * 
 * Section is derived from the number range within the branch.
 */

import { validUSNs, BRANCH_SECTIONS } from "./validUSNs";

// Map 2-letter branch codes to full branch names
export const BRANCH_MAP: Record<string, string> = {
    CS: "CSE",
    IO: "IOT",
    AI: "AI&ML",
    AD: "AI&DS",
    IS: "ISE",
    EC: "ECE",
    EE: "EEE",
};

// USN regex: 1DB25 + 2-letter branch code + 3-digit roll number
const USN_REGEX = /^1DB25(CS|IO|AI|AD|IS|EC|EE)\d{3}$/;

/**
 * Validates the format of a USN string.
 * Returns true if the USN matches the expected pattern.
 */
export function isValidUSNFormat(usn: string): boolean {
    return USN_REGEX.test(usn.toUpperCase());
}

/**
 * Checks if a USN exists in the predefined valid student list.
 */
export function isUSNInValidList(usn: string): boolean {
    return validUSNs.has(usn.toUpperCase());
}

/**
 * Extracts the 2-letter branch code from a USN.
 * e.g., "1DB25CS001" → "CS"
 */
export function getBranchCode(usn: string): string {
    return usn.toUpperCase().substring(5, 7);
}

/**
 * Gets the full branch name from a USN.
 * e.g., "1DB25CS001" → "CSE"
 */
export function getBranchName(usn: string): string {
    const code = getBranchCode(usn);
    return BRANCH_MAP[code] || "Unknown";
}

/**
 * Determines the section from a USN based on the roll number.
 * Each branch has a predefined set of sections.
 * Students are distributed evenly across sections.
 * e.g., CSE with 120 students across A, B, C, D → 30 per section.
 */
export function getSection(usn: string): string {
    const upperUSN = usn.toUpperCase();
    const branchCode = getBranchCode(upperUSN);
    const rollNumber = parseInt(upperUSN.substring(7), 10);

    const sections = BRANCH_SECTIONS[branchCode];
    if (!sections || sections.length === 0) return "Unknown";

    // Each section holds a fixed number of students
    // Roll numbers start at 1, so (rollNumber - 1) gives 0-based index
    const studentsPerSection = Math.ceil(
        getMaxRollForBranch(branchCode) / sections.length
    );
    const sectionIndex = Math.min(
        Math.floor((rollNumber - 1) / studentsPerSection),
        sections.length - 1
    );

    return sections[sectionIndex];
}

/**
 * Returns the maximum roll number for a given branch code.
 * This is derived from the valid USN list.
 */
function getMaxRollForBranch(branchCode: string): number {
    let max = 0;
    validUSNs.forEach((usn) => {
        if (usn.substring(5, 7) === branchCode) {
            const roll = parseInt(usn.substring(7), 10);
            if (roll > max) max = roll;
        }
    });
    return max;
}

/**
 * Full validation of a USN. Returns an object with validation status,
 * branch, and section information.
 */
export function validateUSN(usn: string): {
    valid: boolean;
    error?: string;
    branch?: string;
    section?: string;
} {
    const upperUSN = usn.toUpperCase();

    if (!upperUSN) {
        return { valid: false, error: "USN is required" };
    }

    if (!isValidUSNFormat(upperUSN)) {
        return { valid: false, error: "Invalid USN format. Expected: 1DB25XX###" };
    }

    if (!isUSNInValidList(upperUSN)) {
        return { valid: false, error: "Invalid USN — not found in student list" };
    }

    return {
        valid: true,
        branch: getBranchName(upperUSN),
        section: getSection(upperUSN),
    };
}

/**
 * Checks if two USNs belong to the same section.
 * Required for pair confirmation — both partners must be from the same section.
 */
export function areSameSection(usn1: string, usn2: string): boolean {
    return (
        getBranchCode(usn1) === getBranchCode(usn2) &&
        getSection(usn1) === getSection(usn2)
    );
}
