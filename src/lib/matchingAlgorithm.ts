/**
 * Team Matching Algorithm for Idea Lab
 * 
 * Takes confirmed pairs and groups them into teams of 6 (3 pairs per team).
 * 
 * Algorithm:
 * 1. Group all confirmed pairs by branch
 * 2. Shuffle pairs within each branch
 * 3. Round-robin pick one pair from different branches to form a team of 6
 * 4. Prioritize cross-branch diversity (avoid same-branch clustering)
 * 5. Handle remainders gracefully — smaller teams are still assigned teamIds
 * 
 * Each pair = 2 students from the same section.
 * Each team = 3 pairs = 6 students, ideally from 3 different branches.
 */

export interface StudentPair {
    usn1: string;
    usn2: string;
    branch: string;
}

export interface Team {
    teamId: string;
    members: string[]; // Array of USNs
}

/**
 * Shuffles an array in-place using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Generates teams from confirmed pairs.
 * 
 * @param pairs - Array of confirmed student pairs
 * @returns Array of teams, each containing 6 members (or fewer for remainders)
 */
export function generateTeams(pairs: StudentPair[]): Team[] {
    const teams: Team[] = [];
    let teamCounter = 1;

    // Step 1: Group pairs by branch
    const branchGroups: Record<string, StudentPair[]> = {};
    for (const pair of pairs) {
        if (!branchGroups[pair.branch]) {
            branchGroups[pair.branch] = [];
        }
        branchGroups[pair.branch].push(pair);
    }

    // Step 2: Shuffle pairs within each branch for randomness
    const branchNames = Object.keys(branchGroups);
    for (const branch of branchNames) {
        shuffle(branchGroups[branch]);
    }

    // Step 3: Round-robin pick from different branches
    // We want 3 pairs per team, each from a different branch if possible
    let pairsRemaining = pairs.length;

    while (pairsRemaining >= 3) {
        const teamMembers: string[] = [];
        let pairsInTeam = 0;

        // Sort branches by remaining pairs (most pairs first) for better distribution
        const sortedBranches = branchNames
            .filter((b) => branchGroups[b].length > 0)
            .sort((a, b) => branchGroups[b].length - branchGroups[a].length);

        if (sortedBranches.length === 0) break;

        // Pick one pair from up to 3 different branches
        const branchesUsed = new Set<string>();

        for (const branch of sortedBranches) {
            if (pairsInTeam >= 3) break;
            if (branchesUsed.has(branch)) continue;

            const pair = branchGroups[branch].pop();
            if (pair) {
                teamMembers.push(pair.usn1, pair.usn2);
                branchesUsed.add(branch);
                pairsInTeam++;
                pairsRemaining--;
            }
        }

        // If we couldn't get 3 different branches, fill from any available branch
        if (pairsInTeam < 3) {
            for (const branch of sortedBranches) {
                if (pairsInTeam >= 3) break;
                while (branchGroups[branch].length > 0 && pairsInTeam < 3) {
                    const pair = branchGroups[branch].pop();
                    if (pair) {
                        teamMembers.push(pair.usn1, pair.usn2);
                        pairsInTeam++;
                        pairsRemaining--;
                    }
                }
            }
        }

        if (teamMembers.length > 0) {
            const teamId = `TEAM-${String(teamCounter).padStart(3, "0")}`;
            teams.push({ teamId, members: teamMembers });
            teamCounter++;
        }
    }

    // Step 4: Handle remaining pairs (fewer than 3 pairs left)
    // Group them into one final team
    const remainingMembers: string[] = [];
    for (const branch of branchNames) {
        while (branchGroups[branch].length > 0) {
            const pair = branchGroups[branch].pop();
            if (pair) {
                remainingMembers.push(pair.usn1, pair.usn2);
            }
        }
    }

    if (remainingMembers.length > 0) {
        const teamId = `TEAM-${String(teamCounter).padStart(3, "0")}`;
        teams.push({ teamId, members: remainingMembers });
    }

    return teams;
}
