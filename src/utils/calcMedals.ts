import { Match, Medal } from "../types";
import { TEAM_NAMES } from "../initialData";

export const calculateMedals = (matches: Match[], drawLots?: { [key: string]: string[] }): Medal[] => {
  const medalMap: { [team: string]: Medal } = {};

  // Initialize all teams
  TEAM_NAMES.forEach((team) => {
    medalMap[team] = { team, gold: 0, silver: 0, bronze: 0 };
  });

  // 1. Process Track Finals
  // อันดับ 1 = ทอง, 2 = เงิน, 3 = ทองแดง, 4 = ทองแดง (กติกาใหม่: อันดับ 4 นับเป็นทองแดง)
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

    // Rank 4 ALSO gets Bronze (กติกาใหม่: อันดับ 4 นับเป็นทองแดง)
    const bronze2Winner = m.ranks.find((r) => r.rank === 4)?.name;
    if (bronze2Winner && medalMap[bronze2Winner]) medalMap[bronze2Winner].bronze += 1;
  });

  // 1b. Process Track Direct Results from drawLots (ระบบวิ่งใหม่: บันทึกผลโดยตรงไม่ผ่านรอบ)
  // drawLots key format: "track_direct_result_<category>" -> [rank1, rank2, rank3]
  if (drawLots) {
    const trackCategories = Array.from(new Set(
      matches.filter(m => m.sport === "track").map(m => m.category).filter(Boolean)
    ));
    trackCategories.forEach((category) => {
      const resultKey = `track_direct_result_${category}`;
      const result = drawLots[resultKey];
      if (!result || result.length === 0) return;
      const [gold, silver, bronze] = result;
      if (gold && medalMap[gold]) medalMap[gold].gold += 1;
      if (silver && medalMap[silver]) medalMap[silver].silver += 1;
      if (bronze && medalMap[bronze]) medalMap[bronze].bronze += 1;
    });
  }



  // 2. Process Petanque medals from drawLots
  // drawLots key format: "petanque_result_<category>" -> [gold, silver, bronze]
  if (drawLots) {
    const petanqueCategories = Array.from(new Set(
      matches.filter(m => m.sport === "petanque").map(m => m.category).filter(Boolean)
    ));
    petanqueCategories.forEach((category) => {
      const resultKey = `petanque_result_${category}`;
      const result = drawLots[resultKey];
      if (!result || result.length === 0) return;
      const [gold, silver, bronze] = result;
      if (gold && medalMap[gold]) medalMap[gold].gold += 1;
      if (silver && medalMap[silver]) medalMap[silver].silver += 1;
      if (bronze && medalMap[bronze]) medalMap[bronze].bronze += 1;
    });

    // 3. Process Parade medals from drawLots (Excluded as requested)
    // drawLots key format: "parade_result_<category>" -> [gold, silver, bronze]
    /*
    const paradeCategories = Array.from(new Set(
      matches.filter(m => m.sport === "parade").map(m => m.category).filter(Boolean)
    ));
    paradeCategories.forEach((category) => {
      const resultKey = `parade_result_${category}`;
      const result = drawLots[resultKey];
      if (!result || result.length === 0) return;
      const [gold, silver, bronze] = result;
      if (gold && medalMap[gold]) medalMap[gold].gold += 1;
      if (silver && medalMap[silver]) medalMap[silver].silver += 1;
      if (bronze && medalMap[bronze]) medalMap[bronze].bronze += 1;
    });
    */

    // 4. Process Cheerleader medals from drawLots (Excluded as requested)
    // drawLots key format: "cheerleader_result_<category>" -> [gold, silver, bronze]
    /*
    const cheerleaderCategories = Array.from(new Set(
      matches.filter(m => m.sport === "cheerleader").map(m => m.category).filter(Boolean)
    ));
    cheerleaderCategories.forEach((category) => {
      const resultKey = `cheerleader_result_${category}`;
      const result = drawLots[resultKey];
      if (!result || result.length === 0) return;
      const [gold, silver, bronze] = result;
      if (gold && medalMap[gold]) medalMap[gold].gold += 1;
      if (silver && medalMap[silver]) medalMap[silver].silver += 1;
      if (bronze && medalMap[bronze]) medalMap[bronze].bronze += 1;
    });
    */

    // 5. Process Fun Sport medals from drawLots
    // drawLots key format: "fun_sport_result_<category>" -> [gold, silver, bronze]
    const funSportCategories = Array.from(new Set(
      matches.filter(m => m.sport === "fun_sport").map(m => m.category).filter(Boolean)
    ));
    funSportCategories.forEach((category) => {
      const resultKey = `fun_sport_result_${category}`;
      const result = drawLots[resultKey];
      if (!result || result.length === 0) return;
      const [gold, silver, bronze] = result;
      if (gold && medalMap[gold]) medalMap[gold].gold += 1;
      if (silver && medalMap[silver]) medalMap[silver].silver += 1;
      if (bronze && medalMap[bronze]) medalMap[bronze].bronze += 1;
    });
  }

  // 6. Process Volleyball, Football Finals and 3rd place matches
  const tournamentSports = ["volleyball", "football"] as const;

  tournamentSports.forEach((sport) => {
    const sportMatches = matches.filter((m) => m.sport === sport && m.status === "completed");

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

  // Return all teams sorted by Gold -> Silver -> Bronze
  return Object.values(medalMap).sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });
};
