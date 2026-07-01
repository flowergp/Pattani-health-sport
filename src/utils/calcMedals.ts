import { Match, Medal } from "../types";
import { TEAM_NAMES } from "../initialData";

export const calculateMedals = (matches: Match[]): Medal[] => {
  const medalMap: { [team: string]: Medal } = {};

  // Initialize all teams
  TEAM_NAMES.forEach((team) => {
    medalMap[team] = { team, gold: 0, silver: 0, bronze: 0 };
  });

  // 1. Process Track Finals
  const trackFinals = matches.filter((m) => m.sport === "track" && m.round === "รอบชิงชนะเลิศ" && m.status === "completed");
  trackFinals.forEach((m) => {
    if (!m.ranks || m.ranks.length === 0) return;

    // Rank 1 gets Gold
    const goldWinner = m.ranks.find((r) => r.rank === 1)?.name;
    if (goldWinner && medalMap[goldWinner]) medalMap[goldWinner].gold += 1;

    // Rank 2 gets Silver
    const silverWinner = m.ranks.find((r) => r.rank === 2)?.name;
    if (silverWinner && medalMap[silverWinner]) medalMap[silverWinner].silver += 1;

    // Rank 3 gets Bronze
    const bronzeWinner = m.ranks.find((r) => r.rank === 3)?.name;
    if (bronzeWinner && medalMap[bronzeWinner]) medalMap[bronzeWinner].bronze += 1;
  });

  // 2. Process Petanque, Volleyball, Football Finals and 3rd place matches
  const tournamentSports = ["petanque", "volleyball", "football"] as const;

  tournamentSports.forEach((sport) => {
    const sportMatches = matches.filter((m) => m.sport === sport && m.status === "completed");

    // For Petanque, Volleyball, Football:
    // Final matches are:
    // - Petanque: 'petanque_ทั่วไป ช_32' etc (ends with _32)
    // - Volleyball: 'volley_men_26', 'volley_women_26'
    // - Football: 'football_men_22', 'football_women_22'
    const finals = sportMatches.filter((m) => m.round === "รอบชิงชนะเลิศ");
    const thirdPlaces = sportMatches.filter((m) => m.round === "ชิงที่ 3");

    // Process Finals (Gold and Silver)
    finals.forEach((m) => {
      if (!m.teamA || !m.teamB || m.scoreA === null || m.scoreB === null) return;
      
      const goldWinner = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      const silverWinner = m.scoreA > m.scoreB ? m.teamB : m.teamA;

      if (medalMap[goldWinner]) medalMap[goldWinner].gold += 1;
      if (medalMap[silverWinner]) medalMap[silverWinner].silver += 1;
    });

    // Process 3rd Places (Bronze)
    thirdPlaces.forEach((m) => {
      if (!m.teamA || !m.teamB || m.scoreA === null || m.scoreB === null) return;

      const bronzeWinner = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      if (medalMap[bronzeWinner]) medalMap[bronzeWinner].bronze += 1;
    });
  });

  // Filter out teams with 0 medals or sort all teams
  // We'll return all teams but sorted by Gold -> Silver -> Bronze
  return Object.values(medalMap).sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });
};
