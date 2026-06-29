import { Match, TeamStanding } from "../types";

export const calculateGroupStandings = (matches: Match[], sport: string, groupName: string, categoryName?: string): TeamStanding[] => {
  // Filter matches for this sport, group, round 'รอบแรก' and optionally category
  const groupMatches = matches.filter(
    (m) => m.sport === sport && 
           m.group === groupName && 
           m.round === "รอบแรก" &&
           (!categoryName || m.category === categoryName)
  );

  const standingsMap: { [team: string]: TeamStanding } = {};

  // Initialize all teams that participated in these matches
  groupMatches.forEach((m) => {
    if (m.teamA && !standingsMap[m.teamA]) {
      standingsMap[m.teamA] = { team: m.teamA, played: 0, won: 0, lost: 0, points: 0, scoreDiff: 0 };
    }
    if (m.teamB && !standingsMap[m.teamB]) {
      standingsMap[m.teamB] = { team: m.teamB, played: 0, won: 0, lost: 0, points: 0, scoreDiff: 0 };
    }
  });

  // Process completed matches
  groupMatches.forEach((m) => {
    if (m.status !== "completed" || !m.teamA || !m.teamB) return;

    const sA = m.scoreA ?? 0;
    const sB = m.scoreB ?? 0;

    const tA = standingsMap[m.teamA];
    const tB = standingsMap[m.teamB];

    if (!tA || !tB) return;

    tA.played += 1;
    tB.played += 1;

    // Tie-breaker points and score difference
    tA.scoreDiff += sA - sB;
    tB.scoreDiff += sB - sA;

    if (sport === "football") {
      // Football scoring: Win = 3, Draw = 1, Loss = 0
      if (sA > sB) {
        tA.won += 1;
        tA.points += 3;
        tB.lost += 1;
      } else if (sB > sA) {
        tB.won += 1;
        tB.points += 3;
        tA.lost += 1;
      } else {
        // Draw
        tA.points += 1;
        tB.points += 1;
      }
    } else {
      // Petanque and Volleyball: Win = 3 points (no draws), or simply sort by Wins/Points
      if (sA > sB) {
        tA.won += 1;
        tA.points += 3;
        tB.lost += 1;
      } else {
        tB.won += 1;
        tB.points += 3;
        tA.lost += 1;
      }
    }
  });

  // Convert map to array and sort
  return Object.values(standingsMap).sort((a, b) => {
    // 1. Sort by points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // 2. Sort by won matches
    if (b.won !== a.won) {
      return b.won - a.won;
    }
    // 3. Sort by score difference
    return b.scoreDiff - a.scoreDiff;
  });
};
