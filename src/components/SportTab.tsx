import React, { useState, useEffect } from "react";
import { Match, Participant } from "../types";
import { calculateGroupStandings } from "../utils/calcStandings";
import { TEAM_NAMES } from "../initialData";
import { 
  Clock, 
  MapPin, 
  Edit3, 
  Check, 
  Play, 
  Award, 
  AlertCircle,
  TrendingUp,
  Table,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Printer
} from "lucide-react";

// Helper to parse Thai date (e.g. "10 ก.ค. 69") to a comparable number
function parseThaiDateToValue(dateStr: string): number {
  if (!dateStr || dateStr === "ไม่ระบุวัน") return 99999999;
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 3) {
    const day = parseInt(parts[0], 10) || 0;
    return day;
  }
  
  const day = parseInt(parts[0], 10) || 0;
  const monthStr = parts[1];
  const year = parseInt(parts[2], 10) || 0;
  
  const months: Record<string, number> = {
    "ม.ค.": 1,
    "ก.พ.": 2,
    "มี.ค.": 3,
    "เม.ย.": 4,
    "พ.ค.": 5,
    "มิ.ย.": 6,
    "ก.ค.": 7,
    "ส.ค.": 8,
    "ก.ย.": 9,
    "ต.ค.": 10,
    "พ.ย.": 11,
    "ธ.ค.": 12
  };
  
  const monthVal = months[monthStr] || 0;
  return (year * 10000) + (monthVal * 100) + day;
}

// Helper to parse Thai time (e.g. "09.30 น.") to minutes
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9999;
  const clean = timeStr.replace(/น\./g, "").replace(/\s/g, "").trim();
  const parts = clean.split(/[.:]/);
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

interface SportTabProps {
  sport: "track" | "petanque" | "volleyball" | "football";
  matches: Match[];
  onUpdateMatch: (id: string, updates: Partial<Match>) => Promise<void>;
  onAddMatch: (match: Omit<Match, "id" | "order">) => Promise<void>;
  isLoggedIn: boolean;
  selectedDistrict?: string;
}

export default function SportTab({ sport, matches, onUpdateMatch, onAddMatch, isLoggedIn, selectedDistrict }: SportTabProps) {
  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRound, setSelectedRound] = useState<string>("all");
  const [teamSearch, setTeamSearch] = useState<string>("");
  const [activeView, setActiveView] = useState<"all" | "standings" | "bracket" | "matches">("all");
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // For adding a custom match
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newRound, setNewRound] = useState("รอบแรก");
  const [newCourt, setNewCourt] = useState("สนามที่ 1");
  const [newTime, setNewTime] = useState("09.00 น.");
  const [newDate, setNewDate] = useState("6 ก.ค. 69");
  const [newTeamA, setNewTeamA] = useState("");
  const [newTeamB, setNewTeamB] = useState("");

  // Edit match state
  const [scoreA, setScoreA] = useState<string>("");
  const [scoreB, setScoreB] = useState<string>("");
  const [matchStatus, setMatchStatus] = useState<"pending" | "live" | "completed">("pending");
  const [winner, setWinner] = useState<string>("");
  const [editTeamA, setEditTeamA] = useState<string>("");
  const [editTeamB, setEditTeamB] = useState<string>("");

  // Volleyball set-score edit state
  const [set1A, setSet1A] = useState("0");
  const [set1B, setSet1B] = useState("0");
  const [set2A, setSet2A] = useState("0");
  const [set2B, setSet2B] = useState("0");
  const [set3A, setSet3A] = useState("0");
  const [set3B, setSet3B] = useState("0");

  // Track event rankings edit state
  // Key: team name, Value: rank & time
  const [trackRanks, setTrackRanks] = useState<{ [team: string]: { rank: number; time: string } }>({});

  // Petanque slot inputs state
  const [showPetanqueDrawForm, setShowPetanqueDrawForm] = useState(false);
  const [isSavingDraw, setIsSavingDraw] = useState(false);
  const [petanqueSlots, setPetanqueSlots] = useState<{ [key: string]: string }>({
    A1: "", A2: "", A3: "", A4: "",
    B1: "", B2: "", B3: "", B4: "",
    C1: "", C2: "", C3: "", C4: "",
    D1: "", D2: "", D3: "", D4: "",
  });

  // Get current sport's matches
  const sportMatches = matches.filter((m) => m.sport === sport);

  const isPetanqueDrawHeld = () => {
    const petanqueMatches = matches.filter(m => m.sport === "petanque");
    if (petanqueMatches.length === 0) return false;
    return petanqueMatches.some(m => 
      (m.teamA && TEAM_NAMES.includes(m.teamA)) || 
      (m.teamB && TEAM_NAMES.includes(m.teamB))
    );
  };
  const petanqueDrawNotHeld = sport === "petanque" && !isPetanqueDrawHeld();

  // Auto-initialize petanque draw inputs when selectedCategory or matches changes
  useEffect(() => {
    if (sport === "petanque" && selectedCategory) {
      const findMatchTeam = (suffix: number, isTeamB = false) => {
        const matchId = `petanque_${selectedCategory}_${suffix}`;
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          return isTeamB ? match.teamB : match.teamA;
        }
        return "";
      };

      setPetanqueSlots({
        A1: findMatchTeam(1) || "",
        A2: findMatchTeam(1, true) || "",
        A3: findMatchTeam(2) || "",
        A4: findMatchTeam(2, true) || "",

        B1: findMatchTeam(7) || "",
        B2: findMatchTeam(7, true) || "",
        B3: findMatchTeam(8) || "",
        B4: findMatchTeam(8, true) || "",

        C1: findMatchTeam(13) || "",
        C2: findMatchTeam(13, true) || "",
        C3: findMatchTeam(14) || "",
        C4: findMatchTeam(14, true) || "",

        D1: findMatchTeam(19) || "",
        D2: findMatchTeam(19, true) || "",
        D3: findMatchTeam(20) || "",
        D4: findMatchTeam(20, true) || "",
      });
    }
  }, [sport, selectedCategory, matches]);

  // Reset selected category when sport changes so the auto-selector can pick the correct category of the new sport
  useEffect(() => {
    setSelectedCategory("");
  }, [sport]);

  // Auto-select first non-empty category for non-track sports if empty
  useEffect(() => {
    if (sport !== "track" && selectedCategory === "") {
      const nonEmptyCats = Array.from(new Set(sportMatches.map((m) => m.category))).filter(Boolean);
      if (nonEmptyCats.length > 0) {
        setSelectedCategory(nonEmptyCats[0]);
      }
    }
  }, [sport, sportMatches, selectedCategory]);

  // Get unique categories for this sport
  const categories = sport === "track"
    ? ["", ...Array.from(new Set(sportMatches.map((m) => m.category))).filter(Boolean)]
    : Array.from(new Set(sportMatches.map((m) => m.category))).filter(Boolean);
  // Get unique rounds for this sport
  const rounds = ["all", ...Array.from(new Set(sportMatches.map((m) => m.round))).filter(r => {
    if (sport === "track") return true;
    return r !== "รอบ 8 ทีม" && r !== "รอบรองชนะเลิศ" && r !== "รอบชิงชนะเลิศ" && r !== "ชิงที่ 3";
  })];

  // Filter matches
  const filteredMatches = sportMatches.filter((m) => {
    // Cut bracket/knockout rounds from the match schedule list (รายการแข่งขัน) (except for track)
    if (sport !== "track" && (m.round === "รอบ 8 ทีม" || m.round === "รอบรองชนะเลิศ" || m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3")) {
      return false;
    }

    const matchCat = selectedCategory === "" ? true : m.category === selectedCategory;
    const matchRound = selectedRound === "all" || m.round === selectedRound;
    
    let matchTeam = true;
    if (teamSearch.trim()) {
      const search = teamSearch.toLowerCase();
      if (m.sport === "track") {
        matchTeam = m.participants?.some(p => p.toLowerCase().includes(search)) ?? false;
      } else {
        matchTeam = 
          (m.teamA?.toLowerCase().includes(search) ?? false) || 
          (m.teamB?.toLowerCase().includes(search) ?? false);
      }
    }

    let matchDistrict = true;
    if (selectedDistrict) {
      if (m.sport === "track") {
        matchDistrict = m.participants?.some(p => p === selectedDistrict) ?? false;
      } else {
        matchDistrict = m.teamA === selectedDistrict || m.teamB === selectedDistrict;
      }
    }

    // If no category is selected, only show matches if a search or district filter is active (except for track, which supports Show All)
    if (selectedCategory === "" && !teamSearch.trim() && !selectedDistrict && sport !== "track") {
      return false;
    }

    return matchCat && matchRound && matchTeam && matchDistrict;
  }).sort((a, b) => {
    // 1. Sort by Date first
    const dateA = parseThaiDateToValue(a.date);
    const dateB = parseThaiDateToValue(b.date);
    if (dateA !== dateB) return dateA - dateB;

    // 2. Sort by Time second
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    if (timeA !== timeB) return timeA - timeB;

    // 3. Fallback to round order for football, or court, or custom order
    if (sport === "football") {
      const roundOrder: Record<string, number> = {
        "รอบแรก": 1,
        "รอบคัดเลือก": 2,
        "รอบ 8 ทีม": 3,
        "รอบรองชนะเลิศ": 4,
        "ชิงที่ 3": 5,
        "รอบชิงชนะเลิศ": 6,
      };
      const roundA = roundOrder[a.round] || 99;
      const roundB = roundOrder[b.round] || 99;
      if (roundA !== roundB) return roundA - roundB;
      
      return a.court.localeCompare(b.court);
    }
    
    return a.order - b.order;
  });

  // Unique groups found in this sport for round 1 (for standings tables)
  const groupStandingsList = sport !== "track" 
    ? Array.from(new Set(sportMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort()
    : [];

  // Determine active category to display in the bracket.
  // We prefer the selected category, but if it is empty, we set it to empty.
  const activeBracketCategory = selectedCategory !== "" 
    ? selectedCategory 
    : "";

  // Suffixes of match IDs for each stage of the bracket depending on the sport
  let qfSuffixes: string[] = [];
  let sfSuffixes: string[] = [];
  let thirdSuffix = "";
  let finalSuffix = "";

  if (sport === "petanque") {
    qfSuffixes = ["25", "27", "26", "28"]; // Top pair feeds into SF1 (25 vs 27), bottom pair feeds into SF2 (26 vs 28)
    sfSuffixes = ["29", "30"];
    thirdSuffix = "31";
    finalSuffix = "32";
  } else if (sport === "volleyball") {
    qfSuffixes = ["19", "21", "20", "22"];
    sfSuffixes = ["23", "24"];
    thirdSuffix = "25";
    finalSuffix = "26";
  } else if (sport === "football") {
    qfSuffixes = ["19", "20", "21", "22"];
    sfSuffixes = ["23", "24"];
    thirdSuffix = "";
    finalSuffix = "26";
  }

  // Filter matches for the active bracket category
  const bracketMatches = sportMatches.filter(m => m.category === activeBracketCategory);

  // Map match ID suffix (e.g. "17") to its Match object for quick lookup
  const koMap: { [key: string]: Match } = {};
  bracketMatches.forEach(m => {
    const suffix = m.id.split("_").pop();
    if (suffix) {
      koMap[suffix] = m;
    }
  });

  const hasQF = qfSuffixes.some(suffix => koMap[suffix] !== undefined);
  const hasSF = sfSuffixes.some(suffix => koMap[suffix] !== undefined);
  const hasFinal = koMap[finalSuffix] !== undefined || koMap[thirdSuffix] !== undefined;
  const hasAnyKnockout = hasQF || hasSF || hasFinal;

  const handleStartEdit = (m: Match) => {
    if (!isLoggedIn) return;
    setEditingMatchId(m.id);
    setScoreA(m.scoreA !== null ? String(m.scoreA) : "");
    setScoreB(m.scoreB !== null ? String(m.scoreB) : "");
    setMatchStatus(m.status);
    setWinner(m.winner ?? "");
    setEditTeamA(m.teamA || "");
    setEditTeamB(m.teamB || "");

    if (sport === "volleyball" && m.sets && m.sets.length >= 3) {
      setSet1A(String(m.sets[0]?.scoreA ?? 0));
      setSet1B(String(m.sets[0]?.scoreB ?? 0));
      setSet2A(String(m.sets[1]?.scoreA ?? 0));
      setSet2B(String(m.sets[1]?.scoreB ?? 0));
      setSet3A(String(m.sets[2]?.scoreA ?? 0));
      setSet3B(String(m.sets[2]?.scoreB ?? 0));
    }

    if (sport === "track" && m.participants) {
      const initialRanks: { [t: string]: { rank: number; time: string } } = {};
      m.participants.forEach((team) => {
        const found = m.ranks?.find((r) => r.name === team);
        initialRanks[team] = {
          rank: found?.rank ?? 0,
          time: found?.time ?? ""
        };
      });
      setTrackRanks(initialRanks);
    }
  };

  const handleSaveEdit = async (m: Match) => {
    const updates: Partial<Match> = {
      status: matchStatus
    };

    if (sport === "track") {
      // Build final ranks array based on input
      const finalRanks: Participant[] = Object.entries(trackRanks)
        .map(([name, val]: [string, any]) => {
          const res: Participant = { name };
          if (val.rank > 0) res.rank = val.rank;
          if (val.time) res.time = val.time;
          return res;
        })
        .filter(r => r.rank !== undefined)
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

      updates.ranks = finalRanks;

      // Handle Qualifier Auto-Progression for Track & Field
      if (matchStatus === "completed" && m.round === "รอบคัดเลือก") {
        // Find the sister qualifying round and final round match
        const sisterGroupId = m.group === "กลุ่ม 1" ? "กลุ่ม 2" : "กลุ่ม 1";
        
        // Find other group match for the same category
        const sisterMatch = sportMatches.find(
          (sm) => sm.category === m.category && sm.group === sisterGroupId && sm.round === "รอบคัดเลือก"
        );

        const finalMatch = sportMatches.find(
          (fm) => fm.category === m.category && fm.round === "รอบชิงชนะเลิศ"
        );

        if (finalMatch) {
          // Get top 4 from current match
          const currentTop4 = finalRanks
            .filter(r => r.rank !== undefined && r.rank <= 4)
            .map(r => r.name);

          let sisterTop4: string[] = [];
          if (sisterMatch && sisterMatch.status === "completed" && sisterMatch.ranks) {
            sisterTop4 = sisterMatch.ranks
              .filter(r => r.rank !== undefined && r.rank <= 4)
              .map(r => r.name);
          }

          // If we have qualifiers, merge them and update the final round match
          const mergedParticipants = [...currentTop4, ...sisterTop4];
          if (mergedParticipants.length > 0) {
            await onUpdateMatch(finalMatch.id, {
              participants: mergedParticipants,
              ranks: mergedParticipants.map(name => ({ name }))
            });
          }
        }
      }

    } else {
      // For Petanque, Volleyball, Football
      const sA = scoreA === "" ? null : Number(scoreA);
      const sB = scoreB === "" ? null : Number(scoreB);

      updates.scoreA = sA;
      updates.scoreB = sB;
      updates.teamA = editTeamA;
      updates.teamB = editTeamB;

      if (sA !== null && sB !== null) {
        if (sA > sB) updates.winner = editTeamA;
        else if (sB > sA) updates.winner = editTeamB;
        else updates.winner = "เสมอ";
      } else {
        updates.winner = null;
      }

      if (sport === "volleyball") {
        const vSets = [
          { scoreA: Number(set1A) || 0, scoreB: Number(set1B) || 0 },
          { scoreA: Number(set2A) || 0, scoreB: Number(set2B) || 0 },
          { scoreA: Number(set3A) || 0, scoreB: Number(set3B) || 0 }
        ];
        updates.sets = vSets;

        // Automatically compute final set score based on sets won
        let setsWonA = 0;
        let setsWonB = 0;
        vSets.forEach((set, i) => {
          // Volley set is usually up to 25, 3rd set to 15, but we check who scored more
          if (set.scoreA > 0 || set.scoreB > 0) {
            if (set.scoreA > set.scoreB) setsWonA += 1;
            else if (set.scoreB > set.scoreA) setsWonB += 1;
          }
        });

        if (matchStatus === "completed") {
          updates.scoreA = setsWonA;
          updates.scoreB = setsWonB;
          updates.winner = setsWonA > setsWonB ? m.teamA : m.teamB;
        }
      }

      // Bracket-Match Automatic Progression for Petanque / Volleyball / Football!
      // When a knockout match is completed, we can propagate the winner to the next round!
      if (matchStatus === "completed" && m.winner && m.round !== "รอบชิงชนะเลิศ" && m.round !== "ชิงที่ 3") {
        // Find if this match determines a spot in a subsequent match
        // Let's analyze the match ID structures:
        // Match numbers:
        // e.g. 'petanque_ทั่วไป ช_17' (QF 1)
        // e.g. 'petanque_ทั่วไป ช_18' (QF 2)
        // e.g. 'petanque_ทั่วไป ช_19' (QF 3)
        // e.g. 'petanque_ทั่วไป ช_20' (QF 4)
        // Semi-final 1: ID '..._21' has TeamA = "ผู้ชนะคู่ที่ 17", TeamB = "ผู้ชนะคู่ที่ 19"
        // Semi-final 2: ID '..._22' has TeamA = "ผู้ชนะคู่ที่ 18", TeamB = "ผู้ชนะคู่ที่ 20"
        
        const suffix = m.id.split("_").pop();
        const matchNum = Number(suffix);

        if (!isNaN(matchNum)) {
          // Petanque Progression (25-28 to 29-30, 29-30 to 31-32)
          if (m.sport === "petanque") {
            const prefix = m.id.replace(`_${matchNum}`, "");
            if (matchNum === 25) await propagateWinner(prefix + "_29", m.winner, "teamA");
            if (matchNum === 27) await propagateWinner(prefix + "_29", m.winner, "teamB");
            if (matchNum === 26) await propagateWinner(prefix + "_30", m.winner, "teamA");
            if (matchNum === 28) await propagateWinner(prefix + "_30", m.winner, "teamB");

            // From Semi finals to Final / 3rd Place
            if (matchNum === 29) {
              const loser = m.winner === m.teamA ? m.teamB : m.teamA;
              await propagateWinner(prefix + "_32", m.winner, "teamA"); // Final TeamA
              await propagateWinner(prefix + "_31", loser!, "teamA"); // 3rd Place TeamA
            }
            if (matchNum === 30) {
              const loser = m.winner === m.teamA ? m.teamB : m.teamA;
              await propagateWinner(prefix + "_32", m.winner, "teamB"); // Final TeamB
              await propagateWinner(prefix + "_31", loser!, "teamB"); // 3rd Place TeamB
            }
          }

          // Volleyball Progression (19-22 to 23-24, 23-24 to 25-26)
          if (m.sport === "volleyball") {
            const prefix = m.id.replace(`_${matchNum}`, "");
            if (matchNum === 19) await propagateWinner(prefix + "_23", m.winner, "teamA");
            if (matchNum === 21) await propagateWinner(prefix + "_23", m.winner, "teamB");
            if (matchNum === 20) await propagateWinner(prefix + "_24", m.winner, "teamA");
            if (matchNum === 22) await propagateWinner(prefix + "_24", m.winner, "teamB");

            if (matchNum === 23) {
              const loser = m.winner === m.teamA ? m.teamB : m.teamA;
              await propagateWinner(prefix + "_26", m.winner, "teamA"); // Final
              await propagateWinner(prefix + "_25", loser!, "teamA"); // 3rd
            }
            if (matchNum === 24) {
              const loser = m.winner === m.teamA ? m.teamB : m.teamA;
              await propagateWinner(prefix + "_26", m.winner, "teamB"); // Final
              await propagateWinner(prefix + "_25", loser!, "teamB"); // 3rd
            }
          }

          // Football Progression (19-22 QF, 23-24 SF, 25 3rd, 26 Final)
          if (m.sport === "football") {
            const prefix = m.id.replace(`_${matchNum}`, "");
            if (matchNum === 19) await propagateWinner(prefix + "_23", m.winner, "teamA");
            if (matchNum === 20) await propagateWinner(prefix + "_23", m.winner, "teamB");
            if (matchNum === 21) await propagateWinner(prefix + "_24", m.winner, "teamA");
            if (matchNum === 22) await propagateWinner(prefix + "_24", m.winner, "teamB");

            if (matchNum === 23) {
              await propagateWinner(prefix + "_26", m.winner, "teamA"); // Final TeamA
            }
            if (matchNum === 24) {
              await propagateWinner(prefix + "_26", m.winner, "teamB"); // Final TeamB
            }
          }
        }
      }
    }

    await onUpdateMatch(m.id, updates);
    setEditingMatchId(null);
  };

  const handleClearScore = async (m: Match) => {
    if (!isLoggedIn) return;
    
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะเคลียร์คะแนนและผลแข่งขันของคู่นี้กลับเป็นค่าเริ่มต้น?`)) {
      return;
    }

    const updates: Partial<Match> = {
      status: "pending",
      scoreA: null,
      scoreB: null,
      winner: null
    };

    if (sport === "volleyball") {
      updates.sets = [
        { scoreA: 0, scoreB: 0 },
        { scoreA: 0, scoreB: 0 },
        { scoreA: 0, scoreB: 0 }
      ];
    }

    if (sport === "track") {
      updates.ranks = [];
    }

    await onUpdateMatch(m.id, updates);
    setEditingMatchId(null);
  };

  const propagateWinner = async (targetMatchId: string, winnerName: string, slot: "teamA" | "teamB") => {
    // Check if target match exists
    const target = matches.find(m => m.id === targetMatchId);
    if (target) {
      await onUpdateMatch(targetMatchId, { [slot]: winnerName });
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim() || !newTeamA.trim() || !newTeamB.trim()) return;

    await onAddMatch({
      sport,
      category: newCat,
      gender: newCat.includes("หญิง") ? "หญิง" : newCat.includes("ผสม") ? "ผสม" : "ชาย",
      group: newGroup,
      round: newRound,
      court: newCourt,
      time: newTime,
      date: newDate,
      status: "pending",
      teamA: newTeamA,
      teamB: newTeamB,
      scoreA: null,
      scoreB: null,
      winner: null
    });

    setNewCat("");
    setNewGroup("");
    setNewTeamA("");
    setNewTeamB("");
    setShowAddForm(false);
  };

  const handleSavePetanqueDraw = async () => {
    if (!isLoggedIn) return;
    setIsSavingDraw(true);

    try {
      // Mapping from match index (1-24) to the updated teams.
      const getTeamsForMatchSuffix = (suffix: number) => {
        const s = petanqueSlots;
        // Group A (1-6)
        if (suffix >= 1 && suffix <= 6) {
          if (suffix === 1) return { teamA: s.A1 || "1 สาย A", teamB: s.A2 || "2 สาย A" };
          if (suffix === 2) return { teamA: s.A3 || "3 สาย A", teamB: s.A4 || "4 สาย A" };
          if (suffix === 3) return { teamA: s.A1 || "1 สาย A", teamB: s.A3 || "3 สาย A" };
          if (suffix === 4) return { teamA: s.A2 || "2 สาย A", teamB: s.A4 || "4 สาย A" };
          if (suffix === 5) return { teamA: s.A1 || "1 สาย A", teamB: s.A4 || "4 สาย A" };
          if (suffix === 6) return { teamA: s.A2 || "2 สาย A", teamB: s.A3 || "3 สาย A" };
        }
        // Group B (7-12)
        if (suffix >= 7 && suffix <= 12) {
          if (suffix === 7) return { teamA: s.B1 || "1 สาย B", teamB: s.B2 || "2 สาย B" };
          if (suffix === 8) return { teamA: s.B3 || "3 สาย B", teamB: s.B4 || "4 สาย B" };
          if (suffix === 9) return { teamA: s.B1 || "1 สาย B", teamB: s.B3 || "3 สาย B" };
          if (suffix === 10) return { teamA: s.B2 || "2 สาย B", teamB: s.B4 || "4 สาย B" };
          if (suffix === 11) return { teamA: s.B1 || "1 สาย B", teamB: s.B4 || "4 สาย B" };
          if (suffix === 12) return { teamA: s.B2 || "2 สาย B", teamB: s.B3 || "3 สาย B" };
        }
        // Group C (13-18)
        if (suffix >= 13 && suffix <= 18) {
          if (suffix === 13) return { teamA: s.C1 || "1 สาย C", teamB: s.C2 || "2 สาย C" };
          if (suffix === 14) return { teamA: s.C3 || "3 สาย C", teamB: s.C4 || "4 สาย C" };
          if (suffix === 15) return { teamA: s.C1 || "1 สาย C", teamB: s.C3 || "3 สาย C" };
          if (suffix === 16) return { teamA: s.C2 || "2 สาย C", teamB: s.C4 || "4 สาย C" };
          if (suffix === 17) return { teamA: s.C1 || "1 สาย C", teamB: s.C4 || "4 สาย C" };
          if (suffix === 18) return { teamA: s.C2 || "2 สาย C", teamB: s.C3 || "3 สาย C" };
        }
        // Group D (19-24)
        if (suffix >= 19 && suffix <= 24) {
          if (suffix === 19) return { teamA: s.D1 || "1 สาย D", teamB: s.D2 || "2 สาย D" };
          if (suffix === 20) return { teamA: s.D3 || "3 สาย D", teamB: s.D4 || "4 สาย D" };
          if (suffix === 21) return { teamA: s.D1 || "1 สาย D", teamB: s.D3 || "3 สาย D" };
          if (suffix === 22) return { teamA: s.D2 || "2 สาย D", teamB: s.D4 || "4 สาย D" };
          if (suffix === 23) return { teamA: s.D1 || "1 สาย D", teamB: s.D4 || "4 สาย D" };
          if (suffix === 24) return { teamA: s.D2 || "2 สาย D", teamB: s.D3 || "3 สาย D" };
        }
        return null;
      };

      // Loop and update all 24 group stage matches
      for (let i = 1; i <= 24; i++) {
        const matchId = `petanque_${selectedCategory}_${i}`;
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          const updatedTeams = getTeamsForMatchSuffix(i);
          if (updatedTeams) {
            // Only update if they actually changed
            if (match.teamA !== updatedTeams.teamA || match.teamB !== updatedTeams.teamB) {
              await onUpdateMatch(matchId, {
                teamA: updatedTeams.teamA,
                teamB: updatedTeams.teamB,
              });
            }
          }
        }
      }
      alert("บันทึกรายชื่อทีมและจัดสายใหม่เรียบร้อยแล้ว!");
      setShowPetanqueDrawForm(false);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setIsSavingDraw(false);
    }
  };

  const renderPetanqueSlotSelector = (group: string, num: number) => {
    const slotKey = `${group}${num}`;
    const value = petanqueSlots[slotKey] || "";
    const defaultPlaceholder = `${num} สาย ${group}`;
    const isCustom = value && value !== defaultPlaceholder && !TEAM_NAMES.includes(value);

    // Current dropdown selection
    const selectValue = TEAM_NAMES.includes(value) || value === defaultPlaceholder
      ? value 
      : (value === "" ? defaultPlaceholder : "custom");

    return (
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-400 font-mono">
          ทีมที่ {num} (Slot {num})
        </label>
        <select
          value={selectValue}
          onChange={(e) => {
            const selected = e.target.value;
            if (selected === "custom") {
              setPetanqueSlots(prev => ({ ...prev, [slotKey]: "" }));
            } else {
              setPetanqueSlots(prev => ({ ...prev, [slotKey]: selected }));
            }
          }}
          className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-500 rounded-none cursor-pointer"
        >
          <option value={defaultPlaceholder}>{defaultPlaceholder} (ค่าเริ่มต้น)</option>
          {TEAM_NAMES.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="custom">✍️ พิมพ์ชื่อทีมเอง...</option>
        </select>

        {(isCustom || value === "" || (!TEAM_NAMES.includes(value) && value !== defaultPlaceholder)) && (
          <input
            type="text"
            value={value}
            onChange={(e) => setPetanqueSlots(prev => ({ ...prev, [slotKey]: e.target.value }))}
            placeholder="พิมพ์ระบุชื่อทีม..."
            className="w-full p-1.5 bg-[#0D1527] text-white border border-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-500 rounded-none mt-1 placeholder-slate-600 animate-fadeIn"
          />
        )}
      </div>
    );
  };

  const renderBracketMatch = (m: Match | undefined) => {
    if (!m) {
      return (
        <div className="border border-dashed border-slate-800 p-3 text-center text-xs text-slate-500 font-bold bg-[#111827]">
          รอยืนยันคู่แข่งขัน
        </div>
      );
    }

    const isLive = m.status === "live";
    const isCompleted = m.status === "completed";

    return (
      <button
        type="button"
        onClick={() => {
          const element = document.getElementById(`match-card-${m.id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-[#00FF66]", "ring-offset-2", "ring-offset-slate-900");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-[#00FF66]", "ring-offset-2", "ring-offset-slate-900");
            }, 2500);
          }
          // Start editing directly when clicked from bracket
          if (isLoggedIn) {
            handleStartEdit(m);
          }
        }}
        className={`w-full text-left border p-2.5 transition-all rounded-none ${
          isLive 
            ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_8px_0_rgba(0,255,102,0.15)]" 
            : isCompleted 
              ? "bg-[#0F172A] border-slate-800" 
              : "bg-[#151F32] border-slate-800 hover:bg-[#1E293B]"
        }`}
      >
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 border-b border-slate-800/60 pb-1 mb-1.5">
          <span className="truncate max-w-[90px]">📍 {m.court}</span>
          <span>🕒 {m.time}</span>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center gap-1">
            <span className={`font-bold truncate max-w-[130px] ${m.winner === m.teamA ? "text-[#00FF66] font-black underline decoration-wavy" : "text-white"}`}>
              {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
            </span>
            <span className="font-mono font-black px-1.5 py-0.5 bg-slate-950 text-slate-200 text-[11px] border border-slate-800 min-w-[20px] text-center">
              {m.scoreA !== null ? m.scoreA : "-"}
            </span>
          </div>

          <div className="flex justify-between items-center gap-1">
            <span className={`font-bold truncate max-w-[130px] ${m.winner === m.teamB ? "text-[#00FF66] font-black underline decoration-wavy" : "text-white"}`}>
              {m.winner === m.teamB && "👑 "}{m.teamB || "TBD"}
            </span>
            <span className="font-mono font-black px-1.5 py-0.5 bg-slate-950 text-slate-200 text-[11px] border border-slate-800 min-w-[20px] text-center">
              {m.scoreB !== null ? m.scoreB : "-"}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-dashed border-slate-800">
          <span className="text-[8px] font-mono bg-slate-950 text-slate-300 px-1.5 py-0.5 border border-slate-800 font-bold">
            คู่ที่ {m.id.split("_").pop()}
          </span>
          {isLive && (
            <span className="text-[8px] text-[#00FF66] font-black animate-pulse font-mono">
              กำลังแข่ง 🔴
            </span>
          )}
          {isCompleted && (
            <span className="text-[8px] text-emerald-400 font-bold font-mono">
              เสร็จสิ้น ✓
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-8" id="sport-tab-section">
      <div className="space-y-8 print:hidden">
        {/* 1. Control Filters Card */}
        <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-base font-black uppercase flex items-center gap-2 text-white">
              <Award size={20} className="text-[#FF5722]" />
              ตัวกรองโปรแกรมการแข่งขัน
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
              >
                <Printer size={14} className="text-[#FF5722]" />
                ส่งออก PDF / พิมพ์ตาราง
              </button>

              {sport === "petanque" && isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPetanqueDrawForm(!showPetanqueDrawForm);
                    setShowAddForm(false);
                  }}
                  className="py-2 px-4 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
                >
                  <Award size={14} />
                  {showPetanqueDrawForm ? "ปิดการจับฉลาก" : "🎯 จับฉลากแบ่งสาย"}
                </button>
              )}

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setShowPetanqueDrawForm(false);
                  }}
                  className="py-2 px-4 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 rounded-none"
                >
                  <Plus size={14} />
                  {showAddForm ? "ปิดหน้าต่างเพิ่ม" : "เพิ่มแมตช์ใหม่ (+)"}
                </button>
              )}
            </div>
          </div>

        {/* Category segment buttons for quick access */}
        {categories.length >= 1 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-2 border-b border-slate-800/60">
            {categories.map((c) => {
              const isActive = selectedCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-2 text-xs font-bold uppercase border transition-all duration-150 cursor-pointer rounded-none ${
                    isActive
                      ? "bg-[#FF5722] text-white border-[#FF5722]"
                      : "bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-[#2D3748]"
                  }`}
                >
                  {c === "" ? (sport === "track" ? "✨ แสดงทั้งหมด" : "⚠️ กรุณาเลือกประเภท") : c}
                </button>
              );
            })}
          </div>
        )}

        {/* 🛠️ Selectable View Options */}
        {sport !== "track" && (
          <div className="pt-2">
            <span className="block text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5 font-mono">
              🖥️ เลือกมุมมองที่ต้องการแสดงผล (Select display section):
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: "all", label: "✨ แสดงทั้งหมด", desc: "รวมทุกส่วน" },
                { id: "standings", label: "📊 ตารางคะแนน", desc: "รอบแบ่งกลุ่ม" },
                { id: "matches", label: "📋 รายการแข่งขัน", desc: "และผลลัพธ์" },
                { id: "bracket", label: "🏆 ผังประกบคู่", desc: "รอบน็อคเอ้าท์" }
              ].map((tab) => {
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveView(tab.id as any)}
                    className={`p-2 border transition-all duration-150 cursor-pointer flex flex-col items-center justify-center text-center leading-tight rounded-none ${
                      isActive
                        ? "bg-[#FF5722] border-[#FF5722] text-white font-black"
                        : "bg-[#151F32] border-slate-800 text-slate-300 hover:bg-[#1E293B]"
                    }`}
                  >
                    <span className="text-xs font-bold">{tab.label}</span>
                    <span className={`text-[9px] font-mono mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-500 font-medium'}`}>{tab.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Sticky Filters Bar (Stays fixed below the header) */}
      <div className="sticky top-[var(--header-height,104px)] z-40 bg-[#111827] border border-slate-800 p-4 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-none text-white transition-all">
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ประเภทการแข่ง</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "" ? (sport === "track" ? "✨ แสดงทั้งหมด" : "⚠️ กรุณาเลือกประเภท") : c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">รอบการแข่งขัน</label>
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
          >
            {rounds.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "🏆 แสดงทุกรอบ" : r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ค้นหาชื่อทีม</label>
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="ค้นหาชื่อ คป.สอ. หรือทีม..."
            className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-500"
          />
        </div>
      </div>

      {/* Petanque Schedule banner when draw has not been held yet */}
      {petanqueDrawNotHeld && (
        <div className="border border-yellow-500/30 bg-[#1E293B]/40 p-8 space-y-6 rounded-none text-white text-center max-w-2xl mx-auto shadow-2xl animate-fadeIn">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-none text-amber-500">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-black uppercase text-amber-400">
              📌 กำหนดการแข่งขันเปตอง
            </h3>
            <p className="text-xs text-slate-400 font-semibold max-w-md leading-relaxed">
              โปรแกรมการแข่งขันและตารางคะแนนรอบแบ่งกลุ่มจะแสดงโดยอัตโนมัติ หลังจากที่มีการกดปุ่ม <span className="text-emerald-400 font-bold">🎯 จับฉลากแบ่งสาย</span> และบันทึกผลการจับฉลากแล้ว
            </p>
          </div>

          <div className="border border-slate-800 bg-slate-950 p-6 rounded-none divide-y divide-slate-800/40 text-left space-y-3.5">
            <div className="pb-3 flex justify-between items-center text-xs font-bold text-slate-300">
              <span>ประเภทชายคู่</span>
              <span className="text-[#00FF66] font-mono">วันที่ 6 กรกฎาคม 2569</span>
            </div>
            <div className="py-3 flex justify-between items-center text-xs font-bold text-slate-300">
              <span>ประเภทหญิงคู่</span>
              <span className="text-[#00FF66] font-mono">วันที่ 7 กรกฎาคม 2569</span>
            </div>
            <div className="py-3 flex justify-between items-center text-xs font-bold text-slate-300">
              <span>ประเภททีมผสม</span>
              <span className="text-[#00FF66] font-mono">วันที่ 8 กรกฎาคม 2569</span>
            </div>
            <div className="pt-4 text-center">
              <span className="text-white text-sm font-black font-sans bg-[#FF5722] px-4 py-1.5 inline-block rounded-none shadow-md">
                เริ่มแข่งขัน 9.00น.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Group Standings Section (Only for Petanque, Volleyball, Football) */}
      {sport !== "track" && selectedCategory !== "" && (activeView === "all" || activeView === "standings") && !petanqueDrawNotHeld && (
        <div className="space-y-4">
          {(selectedCategory === "all" ? categories.filter(c => c !== "all") : [selectedCategory]).map((cat) => {
            const catMatches = sportMatches.filter(m => m.category === cat);
            const catGroups = Array.from(new Set(catMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort();
            
            // Check if there are any standings in this category
            const hasStandings = catGroups.some(grpName => calculateGroupStandings(matches, sport, grpName, cat).length > 0);
            if (!hasStandings) return null;

            return (
              <div key={cat} className="border border-slate-800 bg-[#151F32] p-4 space-y-3 rounded-none">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Table size={16} className="text-[#FF5722]" />
                  <h3 className="text-sm font-black uppercase text-white">
                    ตารางคะแนนรอบแบ่งกลุ่ม - <span className="text-[#00FF66]">{cat}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catGroups.map((grpName) => {
                    const standings = calculateGroupStandings(matches, sport, grpName, cat);
                    if (standings.length === 0) return null;

                    return (
                      <div key={grpName} className="border border-slate-800/80 bg-[#111827] p-3 space-y-2 rounded-none">
                        <div className="bg-[#FF5722] text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                          {grpName}
                        </div>
                        <div className="overflow-x-auto border border-slate-800/60">
                          <table className="w-full text-left font-sans text-[11px]">
                            <thead>
                              <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 font-mono">
                                <th className="py-1.5 px-2 font-bold">ทีม</th>
                                <th className="py-1.5 px-1 text-center font-mono">แข่ง</th>
                                <th className="py-1.5 px-1 text-center font-mono">ชนะ</th>
                                <th className="py-1.5 px-1 text-center font-mono">แพ้</th>
                                <th className="py-1.5 px-1 text-center font-mono">+/-</th>
                                <th className="py-1.5 px-2 text-center bg-[#FF5722]/10 text-[#FF5722] font-mono font-bold">คะแนน</th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((st, i) => (
                                <tr key={st.team} className="border-b border-slate-800/60 font-semibold bg-transparent hover:bg-slate-800/20 text-slate-300">
                                  <td className="py-1.5 px-2 font-bold flex items-center gap-1 text-white">
                                    <span className="font-mono text-slate-500">{i + 1}.</span> {st.team}
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-mono">{st.played}</td>
                                  <td className="py-1.5 px-1 text-center font-mono text-emerald-400">{st.won}</td>
                                  <td className="py-1.5 px-1 text-center font-mono text-red-400">{st.lost}</td>
                                  <td className={`py-1.5 px-1 text-center font-mono font-bold ${st.scoreDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff}
                                  </td>
                                  <td className="py-1.5 px-2 text-center bg-[#FF5722]/5 font-mono font-black text-[11px] border-l border-slate-800/60 text-[#FF5722]">
                                    {st.points}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1.5 Petanque Seeding & Draw Form */}
      {sport === "petanque" && showPetanqueDrawForm && (
        <div className="border border-emerald-500/60 bg-[#1E293B] p-6 space-y-4 rounded-none text-white shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-700/60 pb-3">
            <div>
              <h3 className="text-base font-black uppercase tracking-wide text-emerald-400 flex items-center gap-2">
                <Award size={18} className="text-emerald-400" />
                แผงบันทึกผลการจับฉลากแบ่งสายเปตอง
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                ประเภท: <span className="text-white font-bold">{selectedCategory || "ไม่ได้เลือก"}</span> (ตารางแข่งขัน 24 แมตช์จะปรับเปลี่ยนชื่อทีมคู่แข่งตามข้อมูลที่กรอกที่นี่โดยอัตโนมัติ)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการคืนค่ารายชื่อทีมเป็นค่าเริ่มต้น (เช่น 1 สาย A, 2 สาย A, ...)?")) {
                    setPetanqueSlots({
                      A1: "1 สาย A", A2: "2 สาย A", A3: "3 สาย A", A4: "4 สาย A",
                      B1: "1 สาย B", B2: "2 สาย B", B3: "3 สาย B", B4: "4 สาย B",
                      C1: "1 สาย C", C2: "2 สาย C", C3: "3 สาย C", C4: "4 สาย C",
                      D1: "1 สาย D", D2: "2 สาย D", D3: "3 สาย D", D4: "4 สาย D",
                    });
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold border border-slate-700 rounded-none cursor-pointer"
              >
                🔄 คืนค่าตัวเลือกเริ่มต้น
              </button>
            </div>
          </div>

          {!selectedCategory || selectedCategory === "all" ? (
            <div className="p-4 bg-[#0A0F1D] text-slate-400 text-xs border border-yellow-800/50 text-center font-bold">
              ⚠️ กรุณาเลือกประเภทการแข่งขัน (เช่น ทั่วไป ชายคู่, ทั่วไป หญิงคู่, ทีมผสม) จากตัวกรองด้านบนก่อนทำการจัดการจัดสาย
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Group A */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-[#FF5722] text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย A (Group A)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("A", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Group B */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-emerald-600 text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย B (Group B)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("B", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Group C */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-indigo-600 text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย C (Group C)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("C", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Group D */}
                <div className="border border-slate-800 bg-[#0F172A] p-4 space-y-3">
                  <div className="bg-purple-600 text-white py-0.5 px-2 inline-block font-mono text-[9px] font-bold uppercase rounded-none">
                    สาย D (Group D)
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((num) => (
                      <React.Fragment key={num}>
                        {renderPetanqueSlotSelector("D", num)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePetanqueDraw}
                  disabled={isSavingDraw}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide border border-emerald-500 transition-all cursor-pointer rounded-none disabled:opacity-50"
                >
                  {isSavingDraw ? "⏳ กำลังบันทึกข้อมูลและปรับปรุงตารางแข่ง..." : "💾 บันทึกรายชื่อทีมแบ่งสายลงตารางแข่งขัน"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Add Custom Match Form (Collapsible) */}
      {showAddForm && (
        <form onSubmit={handleCreateMatch} className="border border-[#FF5722]/60 bg-[#1E293B] p-6 space-y-4 rounded-none text-white">
          <h3 className="text-base font-black uppercase tracking-wide text-white flex items-center gap-2">
            <Plus size={18} className="text-[#FF5722]" /> สร้างรอบการแข่ง/แมตช์แข่งขันใหม่
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ประเภทกีฬา/การแข่ง</label>
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="เช่น วิ่ง 100 เมตร หญิง, ทั่วไป ชายคู่"
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">กลุ่ม/สาย (ระบุถ้ามี)</label>
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="เช่น สาย A, กลุ่ม 1"
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">รอบการแข่งขัน</label>
              <select
                value={newRound}
                onChange={(e) => setNewRound(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
              >
                <option value="รอบแรก">รอบแรก</option>
                <option value="รอบคัดเลือก">รอบคัดเลือก</option>
                <option value="รอบ 8 ทีม">รอบ 8 ทีม</option>
                <option value="รอบรองชนะเลิศ">รอบรองชนะเลิศ</option>
                <option value="ชิงที่ 3">ชิงที่ 3</option>
                <option value="รอบชิงชนะเลิศ">รอบชิงชนะเลิศ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">สถานที่ / สนาม</label>
              <input
                type="text"
                value={newCourt}
                onChange={(e) => setNewCourt(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">เวลาแข่งขัน</label>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">วันที่แข่งขัน</label>
              <input
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ทีม A / สังกัด A</label>
              <input
                type="text"
                value={newTeamA}
                onChange={(e) => setNewTeamA(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required={sport !== "track"}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">ทีม B / สังกัด B</label>
              <input
                type="text"
                value={newTeamB}
                onChange={(e) => setNewTeamB(e.target.value)}
                className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                required={sport !== "track"}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer rounded-none border-0"
          >
            สร้างโปรแกรมการแข่งแข่งขันใหม่ (+)
          </button>
        </form>
      )}

      {/* 3. Add Custom Match Form (Collapsible) placeholder to keep order clear */}

      {/* 4. Match List Grid */}
      {activeView !== "bracket" && (activeView === "all" || activeView === "matches" || sport === "track" || selectedCategory === "") && !petanqueDrawNotHeld && (
        <div className="space-y-4">
          <h3 className="text-base font-black uppercase text-white tracking-wide">
            📅 รายการแข่งขันและผลลัพธ์ {selectedCategory !== "" ? `(${filteredMatches.length})` : filteredMatches.length > 0 ? `(แสดงเฉพาะ คป.สอ. ${selectedDistrict || teamSearch}) (${filteredMatches.length})` : ""}
          </h3>

          {selectedCategory === "" && filteredMatches.length === 0 ? (
            <div className="border border-dashed border-slate-800 bg-[#111827] p-8 text-center rounded-none text-white">
              <AlertCircle className="mx-auto text-[#FF5722] mb-3" size={32} />
              <h4 className="text-base font-black uppercase tracking-wide">
                {sport === "track" ? "ไม่พบรายการแข่งขัน" : "กรุณาเลือกประเภทการแข่งขัน"}
              </h4>
              <p className="text-xs text-slate-400 mt-2 font-semibold font-mono max-w-xl mx-auto leading-relaxed">
                {sport === "track"
                  ? "ไม่พบบันทึกการแข่งขันกรีฑาในประเภทที่เลือก หรือรายการนี้ยังไม่มีการจัดแข่งในตาราง"
                  : selectedDistrict 
                    ? `ไม่พบรายการแข่งขันของ คป.สอ. ${selectedDistrict} ในกีฬานี้ หรือกรุณาเลือกประเภทการแข่งขันด้านบน` 
                    : "กรุณาคลิกเลือกประเภทการแข่งขันด้านบน เพื่อแสดงตารางคะแนน, ผังประกบคู่ และโปรแกรมการแข่งขันทั้งหมด"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMatches.map((m) => {
                const isEditing = editingMatchId === m.id;
                const isLive = m.status === "live";
                const isCompleted = m.status === "completed";
                const isTrack = m.sport === "track";

                return (
                  <div
                    key={m.id}
                    id={`match-card-${m.id}`}
                    className={`border p-5 flex flex-col justify-between transition-all rounded-none ${
                      isLive 
                        ? "bg-[#1E293B] border-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.12)] text-white" 
                        : isCompleted 
                          ? "bg-[#0F172A] border-slate-800 text-slate-300" 
                          : "bg-[#111827] border-slate-800 text-slate-300"
                    }`}
                  >
                    <div>
                      {/* Top bar info */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="space-y-1.5">
                          {/* Prominent Date/Time indicator */}
                          <div className="flex items-center gap-1.5 text-amber-400 bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-none w-fit text-[10px] font-mono font-black uppercase tracking-wider">
                            <Clock size={11} className="text-[#FF5722]" />
                            <span>{m.date} • {m.time}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="bg-[#FF5722] text-white text-[9px] font-mono px-2 py-0.5 font-bold uppercase block w-fit rounded-none">
                              {m.category}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-400 block">
                              รอบ: {m.round} {m.group ? `(${m.group})` : ""}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono font-black px-2 py-0.5 border uppercase rounded-none whitespace-nowrap ${
                            isLive
                              ? "border-[#00FF66] bg-[#00FF66]/10 text-[#00FF66] animate-pulse"
                              : isCompleted
                              ? "border-slate-700 bg-slate-800 text-slate-300"
                              : "border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {isLive ? "กำลังแข่ง 🔴" : isCompleted ? "เสร็จสิ้น" : "ยังไม่แข่ง"}
                        </span>
                      </div>

                  {/* Match Body content */}
                  {!isEditing ? (
                    <div className="py-4 space-y-3">
                      {isTrack ? (
                        // Improved Track race display
                        <div className="space-y-3">
                          {m.round === "รอบคัดเลือก" && (
                            <div className="text-[10px] bg-sky-950/40 border border-sky-800/60 text-sky-400 px-2.5 py-1.5 font-bold rounded-none flex items-center gap-1.5 font-sans">
                              <span>📢 หมายเหตุ: คัดเลือกอันดับที่ 1-4 เพื่อเข้าสู่รอบชิงชนะเลิศ</span>
                            </div>
                          )}
                          
                          {isCompleted && m.ranks && m.ranks.some(r => r.rank !== undefined) ? (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-[#FF5722] font-mono block uppercase tracking-wider">🏆 ผลการแข่งขันอย่างเป็นทางการ:</span>
                              <div className="border border-slate-800/80 divide-y divide-slate-800/60 bg-slate-950">
                                {m.ranks
                                  .filter(r => r.rank !== undefined)
                                  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                                  .map((r) => {
                                    const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `${r.rank}`;
                                    const isQualified = m.round === "รอบคัดเลือก" && r.rank! <= 4;
                                    return (
                                      <div key={r.name} className="flex justify-between items-center p-2 text-xs font-mono font-semibold">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 text-center font-bold">{medal}</span>
                                          <span className="text-white font-bold">{r.name}</span>
                                          {isQualified && (
                                            <span className="text-[9px] bg-green-950 text-green-400 border border-green-800/40 px-1 py-0.2 rounded-none font-sans font-bold">
                                              เข้ารอบชิง 🎉
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-slate-400 font-bold">{r.time || "-"}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : m.round === "รอบชิงชนะเลิศ" ? (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase">ผู้มีสิทธิ์ร่วมแข่ง:</span>
                              <div className="text-xs italic text-slate-400 font-bold font-mono bg-slate-950/40 p-2.5 border border-slate-850/60">
                                ⏳ รายชื่อทีมเข้ารอบชิงชนะเลิศจะแสดงเมื่อเสร็จสิ้นการแข่งขัน
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase">ผู้มีสิทธิ์ร่วมแข่ง ({m.participants?.length || 0} ทีม):</span>
                              <div className="flex flex-wrap gap-1.5">
                                {m.participants && m.participants.length > 0 ? (
                                  m.participants.map((p) => {
                                    const rankInfo = m.ranks?.find(r => r.name === p);
                                    return (
                                      <span
                                        key={p}
                                        className={`px-2 py-1 text-xs font-mono font-bold border rounded-none ${
                                          rankInfo?.rank === 1
                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                            : rankInfo?.rank === 2
                                            ? "bg-slate-300/10 text-slate-300 border-slate-400/30"
                                            : rankInfo?.rank === 3
                                            ? "bg-amber-700/10 text-amber-600 border-amber-700/30"
                                            : "bg-slate-900 border-slate-800 text-slate-400"
                                        }`}
                                      >
                                        {rankInfo?.rank ? `#${rankInfo.rank} ` : "🏃 "}
                                        {p}
                                        {rankInfo?.time ? ` (${rankInfo.time})` : ""}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs italic text-red-400 font-bold font-mono">
                                    ⏳ รอดึงผลอันดับ 1-4 จากรอบคัดเลือกกลุ่ม 1 และ 2
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Dual Sports (Petanque, Volleyball, Football)
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between items-center bg-[#151F32] p-2.5 border border-slate-800/80 rounded-none">
                            <span className={`font-bold text-sm ${m.winner === m.teamA ? "text-[#00FF66] underline decoration-wavy underline-offset-4 font-black" : "text-white"}`}>
                              {m.teamA}
                            </span>
                            <span className="font-mono font-black text-lg bg-slate-950 text-white px-3 py-0.5 border border-slate-800 rounded-none">
                              {m.scoreA !== null ? m.scoreA : "-"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center bg-[#151F32] p-2.5 border border-slate-800/80 rounded-none">
                            <span className={`font-bold text-sm ${m.winner === m.teamB ? "text-[#00FF66] underline decoration-wavy underline-offset-4 font-black" : "text-white"}`}>
                              {m.teamB}
                            </span>
                            <span className="font-mono font-black text-lg bg-slate-950 text-white px-3 py-0.5 border border-slate-800 rounded-none">
                              {m.scoreB !== null ? m.scoreB : "-"}
                            </span>
                          </div>

                          {/* Show sets for Volleyball */}
                          {m.sport === "volleyball" && m.sets && m.sets.some(s => s.scoreA > 0 || s.scoreB > 0) && (
                            <div className="bg-slate-950 p-2 border border-slate-800 flex justify-around items-center font-mono text-[10px] font-black text-slate-400 rounded-none">
                              <span>Set 1: {m.sets[0]?.scoreA} - {m.sets[0]?.scoreB}</span>
                              <span>Set 2: {m.sets[1]?.scoreA} - {m.sets[1]?.scoreB}</span>
                              <span>Set 3: {m.sets[2]?.scoreA} - {m.sets[2]?.scoreB}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // EDITING STATE MODAL INLINE
                    <div className="py-4 space-y-4 bg-[#1E293B] p-4 border border-slate-700 my-2 text-white rounded-none">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <span className="font-mono text-xs font-bold text-[#FF5722]">✍️ บันทึกคะแนนและสถานะ</span>
                        <span className="font-mono text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 border border-slate-800">ID: {m.id}</span>
                      </div>

                      {/* Status select */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-400">สถานะแข่ง</label>
                        <select
                          value={matchStatus}
                          onChange={(e) => setMatchStatus(e.target.value as any)}
                          className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                        >
                          <option value="pending">ยังไม่แข่ง (Pending)</option>
                          <option value="live">กำลังแข่ง (Live)</option>
                          <option value="completed">เสร็จสิ้นการแข่ง (Completed)</option>
                        </select>
                      </div>

                      {isTrack ? (
                        // Edit track ranks
                        <div className="space-y-2">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">
                            {m.round === "รอบชิงชนะเลิศ" ? "จัดอันดับและสถิติเวลา (รอบชิงชนะเลิศ):" : "จัดอันดับและสถิติเวลา (1-4 ผ่านเข้ารอบชิง):"}
                          </label>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {m.participants?.map((team) => (
                              <div key={team} className="flex items-center justify-between gap-2 bg-[#151F32] p-1.5 border border-slate-800 rounded-none">
                                <span className="font-bold text-xs text-white">{team}</span>
                                <div className="flex gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    max="14"
                                    placeholder="อันดับ"
                                    value={trackRanks[team]?.rank || ""}
                                    onChange={(e) => {
                                      const rank = parseInt(e.target.value) || 0;
                                      setTrackRanks({
                                        ...trackRanks,
                                        [team]: { ...trackRanks[team], rank }
                                      });
                                    }}
                                    className="w-14 p-1 text-center bg-[#0A0F1D] text-white border border-slate-700 font-mono font-bold text-xs rounded-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="เวลา (วิ)"
                                    value={trackRanks[team]?.time || ""}
                                    onChange={(e) => {
                                      const time = e.target.value;
                                      setTrackRanks({
                                        ...trackRanks,
                                        [team]: { ...trackRanks[team], time }
                                      });
                                    }}
                                    className="w-20 p-1 text-center bg-[#0A0F1D] text-white border border-slate-700 font-mono text-xs rounded-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Edit team score
                        <div className="space-y-3">
                          {sport === "volleyball" ? (
                            // Volleyball set editor
                            <div className="space-y-2">
                              <span className="block text-[10px] font-mono font-bold text-slate-400">ระบุคะแนนเซต (Volleyball Set Scores):</span>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-1.5 bg-[#151F32] border border-slate-800 rounded-none">
                                  <span className="font-mono text-[9px] font-bold block text-slate-400">Set 1</span>
                                  <div className="flex gap-1 justify-center mt-1 items-center">
                                    <input type="text" value={set1A} onChange={e => setSet1A(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                                    <span className="text-slate-400">:</span>
                                    <input type="text" value={set1B} onChange={e => setSet1B(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                                  </div>
                                </div>

                                <div className="p-1.5 bg-[#151F32] border border-slate-800 rounded-none">
                                  <span className="font-mono text-[9px] font-bold block text-slate-400">Set 2</span>
                                  <div className="flex gap-1 justify-center mt-1 items-center">
                                    <input type="text" value={set2A} onChange={e => setSet2A(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                                    <span className="text-slate-400">:</span>
                                    <input type="text" value={set2B} onChange={e => setSet2B(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                                  </div>
                                </div>

                                <div className="p-1.5 bg-[#151F32] border border-slate-800 rounded-none">
                                  <span className="font-mono text-[9px] font-bold block text-slate-400">Set 3</span>
                                  <div className="flex gap-1 justify-center mt-1 items-center">
                                    <input type="text" value={set3A} onChange={e => setSet3A(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                                    <span className="text-slate-400">:</span>
                                    <input type="text" value={set3B} onChange={e => setSet3B(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Standard dual sport score editor
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-slate-400 truncate">ชื่อทีมฝั่ง A</label>
                                <input
                                  type="text"
                                  value={editTeamA}
                                  onChange={(e) => setEditTeamA(e.target.value)}
                                  placeholder="ชื่อทีมฝั่ง A"
                                  className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none mb-1"
                                />
                                <label className="block text-[10px] font-mono font-bold text-slate-400">คะแนนทีม A</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={scoreA !== null ? scoreA : ""}
                                  onChange={(e) => setScoreA(e.target.value === "" ? null : parseInt(e.target.value))}
                                  className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-slate-400 truncate">ชื่อทีมฝั่ง B</label>
                                <input
                                  type="text"
                                  value={editTeamB}
                                  onChange={(e) => setEditTeamB(e.target.value)}
                                  placeholder="ชื่อทีมฝั่ง B"
                                  className="w-full p-1.5 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none mb-1"
                                />
                                <label className="block text-[10px] font-mono font-bold text-slate-400">คะแนนทีม B</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={scoreB !== null ? scoreB : ""}
                                  onChange={(e) => setScoreB(e.target.value === "" ? null : parseInt(e.target.value))}
                                  className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(m)}
                          className="flex-1 py-1.5 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                        >
                          บันทึกข้อมูล
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearScore(m)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0 flex items-center gap-1"
                        >
                          🔄 เคลียร์สกอร์
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMatchId(null)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Foot metadata */}
                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-mono font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {m.time} ({m.date})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {m.court}
                    </span>
                  </div>
                </div>

                {/* Edit Button footer */}
                {!isEditing && (
                  isLoggedIn ? (
                    <button
                      onClick={() => handleStartEdit(m)}
                      className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer rounded-none transition-all border-0"
                    >
                      <Edit3 size={12} />
                      บันทึกคะแนน / อัปเดตผลแข่งขัน
                    </button>
                  ) : (
                    <div className="w-full mt-4 py-2 bg-slate-900/50 text-slate-500 font-bold text-[10px] uppercase font-mono tracking-wider flex items-center justify-center gap-1.5 border border-slate-800/80">
                      🔒 กรุณาเข้าสู่ระบบเพื่อแก้ไขคะแนน
                    </div>
                  )
                )}
              </div>
            );
          })}

          {filteredMatches.length === 0 && (
            <div className="py-16 text-center text-slate-500 font-bold font-mono col-span-2 bg-[#111827] border border-dashed border-slate-800">
              ❌ ไม่พบตารางการแข่งขันตามตัวกรองที่เลือก
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* 2. Knockout Bracket Display Card */}
      {sport !== "track" && activeBracketCategory && (activeView === "all" || activeView === "bracket") && !petanqueDrawNotHeld && (
        <div className="border border-slate-800 bg-[#111827] p-6 space-y-4 rounded-none text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-[#FF5722]" />
              <h2 className="text-base font-black uppercase tracking-wide text-white">
                ผังประกบคู่รอบน็อคเอ้าท์ (Knockout Bracket)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#FF5722] text-white text-xs font-mono px-3 py-1 font-bold uppercase rounded-none">
                {activeBracketCategory}
              </span>
            </div>
          </div>

          <div className="space-y-4">
              <p className="text-xs text-slate-400 font-semibold font-mono">
                💡 คลิกที่คู่แข่งขันในผังเพื่อเลื่อนหน้าจอไปยังการบันทึกคะแนน/แก้ไขผลลัพธ์ของคู่นั้นโดยตรง
              </p>

              {!hasAnyKnockout ? (
                <div className="border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center rounded-none">
                  <AlertCircle className="mx-auto text-slate-500 mb-2" size={24} />
                  <p className="text-sm font-black text-slate-300">
                    ไม่พบข้อมูลโปรแกรมการแข่งขันรอบน็อคเอ้าท์สำหรับ <span className="text-[#FF5722]">{activeBracketCategory}</span> ในขณะนี้
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    (โปรแกรมจะเริ่มแสดงเมื่อถึงรอบ 8 ทีม หรือรอบรองชนะเลิศ)
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  {/* Bracket Flow Row Container */}
                  <div className="flex gap-6 md:gap-12 min-w-[700px] pt-4 justify-between items-stretch">
                    
                    {/* 1. QUARTERFINALS COLUMN */}
                    {hasQF && (
                      <div className="flex-1 min-w-[220px] flex flex-col justify-around py-2 space-y-8">
                        <div className="text-center font-bold text-[10px] uppercase bg-slate-900 text-slate-300 py-1.5 border border-slate-800 rounded-none font-mono">
                          รอบ 8 ทีม (Quarterfinals)
                        </div>
                        
                        {/* Match 1 & 2 Pair */}
                        <div className="space-y-4 bg-[#151F32] p-2.5 border border-slate-800 rounded-none relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#FF5722] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit rounded-none">
                            สายบนคู่ที่ 1 & 2
                          </span>
                          {renderBracketMatch(koMap[qfSuffixes[0]])}
                          {renderBracketMatch(koMap[qfSuffixes[1]])}
                        </div>

                        {/* Match 3 & 4 Pair */}
                        <div className="space-y-4 bg-[#151F32] p-2.5 border border-slate-800 rounded-none relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#FF5722] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit rounded-none">
                            สายล่างคู่ที่ 3 & 4
                          </span>
                          {renderBracketMatch(koMap[qfSuffixes[2]])}
                          {renderBracketMatch(koMap[qfSuffixes[3]])}
                        </div>
                      </div>
                    )}

                    {/* 2. SEMIFINALS COLUMN */}
                    {hasSF && (
                      <div className="flex-1 min-w-[220px] flex flex-col justify-around py-2 space-y-8">
                        <div className="text-center font-bold text-[10px] uppercase bg-slate-900 text-slate-300 py-1.5 border border-slate-800 rounded-none font-mono">
                          รอบรองชนะเลิศ (Semifinals)
                        </div>

                        {/* SF 1 Card Container */}
                        <div className="flex flex-col justify-center h-1/2 min-h-[140px] relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#00FF66] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit mb-1 rounded-none">
                            รอบรองคู่ที่ 1
                          </span>
                          {renderBracketMatch(koMap[sfSuffixes[0]])}
                        </div>

                        {/* SF 2 Card Container */}
                        <div className="flex flex-col justify-center h-1/2 min-h-[140px] relative">
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-[#FF5722] font-black text-xs z-10">
                            →
                          </div>
                          <span className="text-[8px] font-mono bg-slate-900 text-[#00FF66] px-1.5 py-0.5 border border-slate-800 font-bold uppercase block w-fit mb-1 rounded-none">
                            รอบรองคู่ที่ 2
                          </span>
                          {renderBracketMatch(koMap[sfSuffixes[1]])}
                        </div>
                      </div>
                    )}

                    {/* 3. FINALS & 3RD PLACE COLUMN */}
                    <div className="flex-1 min-w-[220px] flex flex-col justify-around py-2 space-y-8">
                      <div className="text-center font-bold text-[10px] uppercase bg-slate-900 text-slate-300 py-1.5 border border-slate-800 rounded-none font-mono">
                        รอบชิงชนะเลิศ (Medal Matches)
                      </div>

                      {/* Gold Match */}
                      <div className="flex flex-col justify-center min-h-[120px] bg-amber-500/5 p-2.5 border border-amber-500/20 rounded-none">
                        <span className="text-[8px] font-mono bg-amber-500/10 text-amber-400 px-2 py-1 border border-amber-500/30 font-black uppercase block w-fit mb-2 rounded-none">
                          🏆 รอบชิงชนะเลิศ (เหรียญทอง)
                        </span>
                        {renderBracketMatch(koMap[finalSuffix])}
                      </div>

                      {/* Bronze Match */}
                      {koMap[thirdSuffix] && (
                        <div className="flex flex-col justify-center min-h-[120px] bg-slate-900/20 p-2.5 border border-slate-800 rounded-none">
                          <span className="text-[8px] font-mono bg-slate-800 text-slate-300 px-2 py-1 border border-slate-700 font-black uppercase block w-fit mb-2 rounded-none">
                            🥉 ชิงอันดับที่ 3 (เหรียญทองแดง)
                          </span>
                          {renderBracketMatch(koMap[thirdSuffix])}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* 5. Hidden editing match modal (e.g. for "รอบ 8 ทีม" that are not in filteredMatches) */}
      {(() => {
        const isEditingHiddenMatch = editingMatchId && !filteredMatches.some(m => m.id === editingMatchId);
        const hiddenEditingMatch = isEditingHiddenMatch ? matches.find(m => m.id === editingMatchId) : null;
        if (!hiddenEditingMatch) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg border border-slate-700 bg-[#1E293B] p-6 space-y-4 rounded-none text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="font-mono text-sm font-black text-[#FF5722] flex items-center gap-1.5">
                  ✍️ บันทึกคะแนน {hiddenEditingMatch.round} ({hiddenEditingMatch.category})
                </span>
                <button 
                  type="button"
                  onClick={() => setEditingMatchId(null)}
                  className="text-slate-400 hover:text-white font-bold font-mono text-xs cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-400 block">
                  รอบ: {hiddenEditingMatch.round} {hiddenEditingMatch.group ? `(${hiddenEditingMatch.group})` : ""}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-400 block">
                  สนาม: {hiddenEditingMatch.court} | เวลา: {hiddenEditingMatch.time}
                </span>
              </div>

              {/* Status select */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-400">สถานะแข่ง</label>
                <select
                  value={matchStatus}
                  onChange={(e) => setMatchStatus(e.target.value as any)}
                  className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none"
                >
                  <option value="pending">ยังไม่แข่ง (Pending)</option>
                  <option value="live">กำลังแข่ง (Live)</option>
                  <option value="completed">เสร็จสิ้นการแข่ง (Completed)</option>
                </select>
              </div>

              {/* Edit team score */}
              <div className="space-y-3">
                {sport === "volleyball" ? (
                  <div className="space-y-2">
                    <span className="block text-[10px] font-mono font-bold text-slate-400">ระบุคะแนนเซต (Volleyball Set Scores):</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-1.5 bg-[#151F32] border border-slate-800 rounded-none">
                        <span className="font-mono text-[9px] font-bold block text-slate-400">Set 1</span>
                        <div className="flex gap-1 justify-center mt-1 items-center">
                          <input type="text" value={set1A} onChange={e => setSet1A(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                          <span className="text-slate-400">:</span>
                          <input type="text" value={set1B} onChange={e => setSet1B(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                        </div>
                      </div>

                      <div className="p-1.5 bg-[#151F32] border border-slate-800 rounded-none">
                        <span className="font-mono text-[9px] font-bold block text-slate-400">Set 2</span>
                        <div className="flex gap-1 justify-center mt-1 items-center">
                          <input type="text" value={set2A} onChange={e => setSet2A(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                          <span className="text-slate-400">:</span>
                          <input type="text" value={set2B} onChange={e => setSet2B(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                        </div>
                      </div>

                      <div className="p-1.5 bg-[#151F32] border border-slate-800 rounded-none">
                        <span className="font-mono text-[9px] font-bold block text-slate-400">Set 3</span>
                        <div className="flex gap-1 justify-center mt-1 items-center">
                          <input type="text" value={set3A} onChange={e => setSet3A(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                          <span className="text-slate-400">:</span>
                          <input type="text" value={set3B} onChange={e => setSet3B(e.target.value)} className="w-8 text-center bg-[#0A0F1D] text-white border border-slate-700 text-xs rounded-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono font-bold text-slate-400 truncate">{hiddenEditingMatch.teamA || "TBD"}</label>
                      <input
                        type="number"
                        min="0"
                        value={scoreA !== null ? scoreA : ""}
                        onChange={(e) => setScoreA(e.target.value === "" ? null : parseInt(e.target.value))}
                        className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono font-bold text-slate-400 truncate">{hiddenEditingMatch.teamB || "TBD"}</label>
                      <input
                        type="number"
                        min="0"
                        value={scoreB !== null ? scoreB : ""}
                        onChange={(e) => setScoreB(e.target.value === "" ? null : parseInt(e.target.value))}
                        className="w-full p-2 bg-[#0A0F1D] text-white border border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#FF5722] rounded-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveEdit(hiddenEditingMatch)}
                  className="flex-1 py-2 bg-[#FF5722] hover:bg-[#E04E1D] text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                >
                  บันทึกข้อมูล
                </button>
                <button
                  type="button"
                  onClick={() => handleClearScore(hiddenEditingMatch)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0 flex items-center gap-1"
                >
                  🔄 เคลียร์สกอร์
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMatchId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-none transition-all cursor-pointer border-0"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      </div>

      {/* 4. Beautiful Printable Official PDF Section (Hidden on screen, shown ONLY during Print/PDF export) */}
      <div className="hidden print:block bg-white text-black p-6 min-h-screen font-sans">
        {/* Header Block */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-center mb-1 text-4xl">🏆</div>
          <h1 className="text-xl font-black uppercase tracking-wide text-black">
            ใบรายงานผลและตารางการแข่งขันอย่างเป็นทางการ (Official Match Report)
          </h1>
          <h2 className="text-sm font-bold text-gray-800 mt-1 font-sans">
            การแข่งขันกีฬาบุคลากรสาธารณสุข จังหวัดปัตตานี ประจำปี 2569 "ปัตตานีเกมส์"
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 font-semibold font-mono">
            ณ สนามกีฬาเทศบาลเมืองบานา จังหวัดปัตตานี
          </p>
          <div className="mt-4 flex justify-between items-center text-xs font-semibold px-4 text-gray-700 bg-gray-100 py-2 border border-gray-300">
            <span>ชนิดกีฬา: <strong className="text-black font-extrabold">{
              sport === "football" ? "ฟุตบอล (Football)" :
              sport === "volleyball" ? "วอลเลย์บอล (Volleyball)" :
              sport === "petanque" ? "เปตอง (Petanque)" :
              sport === "track" ? "กรีฑา (Track & Field)" : sport
            }</strong></span>
            {selectedCategory && (
              <span>ประเภท: <strong className="text-black font-extrabold">{selectedCategory}</strong></span>
            )}
            {selectedRound !== "all" && (
              <span>รอบ: <strong className="text-black font-extrabold">{selectedRound}</strong></span>
            )}
            <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} น.</span>
          </div>
        </div>

        {/* Content sections based on sport type */}
        <div className="space-y-6 text-black">
          {petanqueDrawNotHeld ? (
            <div className="border border-black p-6 bg-gray-50 rounded-none text-center space-y-4">
              <h3 className="text-base font-black text-black border-b border-black pb-2">
                📌 กำหนดการแข่งขันเปตอง
              </h3>
              <div className="text-xs font-bold text-gray-800 space-y-2.5 leading-relaxed inline-block text-left mx-auto py-2">
                <p>ประเภทชายคู่ วันที่ 6 กรกฎาคม 2569</p>
                <p>ประเภทหญิงคู่ วันที่ 7 กรกฎาคม 2569</p>
                <p>ประเภททีมผสม วันที่ 8 กรกฎาคม 2569</p>
                <p className="mt-4 text-black text-sm font-black text-center font-sans">เริ่มแข่งขัน 9.00น.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Group Standings (if applicable) */}
              {sport !== "track" && selectedCategory !== "" && (
            <div>
              {(selectedCategory === "all" ? categories.filter(c => c !== "all") : [selectedCategory]).map((cat) => {
                const catMatches = sportMatches.filter(m => m.category === cat);
                const catGroups = Array.from(new Set(catMatches.filter(m => m.round === "รอบแรก" && m.group).map(m => m.group))).sort();
                
                const hasStandings = catGroups.some(grpName => calculateGroupStandings(matches, sport, grpName, cat).length > 0);
                if (!hasStandings) return null;

                return (
                  <div key={cat} className="mb-6">
                    <h3 className="text-xs font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans flex items-center gap-1">
                      📊 ตารางคะแนนแบ่งกลุ่ม ({cat})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catGroups.map((grpName) => {
                        const standings = calculateGroupStandings(matches, sport, grpName, cat);
                        if (standings.length === 0) return null;

                        return (
                          <div key={grpName} className="border border-black p-2 bg-gray-50/50">
                            <div className="font-bold text-xs bg-black text-white px-2 py-0.5 inline-block mb-2 font-mono">
                              {grpName}
                            </div>
                            <table className="w-full text-left text-[10px] border-collapse text-black">
                              <thead>
                                <tr className="border-b border-black bg-gray-100 font-bold">
                                  <th className="py-1 px-1.5 border-r border-gray-300">อันดับ/ทีม</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">แข่ง</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">ชนะ</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">แพ้</th>
                                  <th className="py-1 px-0.5 text-center border-r border-gray-300">+/-</th>
                                  <th className="py-1 px-1.5 text-center">คะแนน</th>
                                </tr>
                              </thead>
                              <tbody>
                                {standings.map((st, i) => (
                                  <tr key={st.team} className="border-b border-gray-200">
                                    <td className="py-1 px-1.5 border-r border-gray-300 font-bold">
                                      {i + 1}. {st.team}
                                    </td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300">{st.played}</td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 text-emerald-700 font-bold">{st.won}</td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 text-red-700">{st.lost}</td>
                                    <td className="py-1 px-0.5 text-center border-r border-gray-300 font-bold">{st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff}</td>
                                    <td className="py-1 px-1.5 text-center font-bold bg-gray-100">{st.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Matches Schedule Table */}
          <div>
            <h3 className="text-xs font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
              📅 โปรแกรมแข่งขันและผลการแข่งขันอย่างเป็นทางการ ({filteredMatches.length} รายการ)
            </h3>
            {filteredMatches.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-4 font-sans">ไม่มีรายการแข่งขันที่ตรงตามตัวกรองที่เลือก</p>
            ) : (
              <table className="w-full text-[10px] border-collapse border border-black text-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-left">
                    <th className="p-1.5 border-r border-black font-bold text-center w-[40px]">คู่ที่</th>
                    <th className="p-1.5 border-r border-black font-bold w-[90px]">วัน/เวลาแข่งขัน</th>
                    <th className="p-1.5 border-r border-black font-bold w-[80px]">สนาม</th>
                    <th className="p-1.5 border-r border-black font-bold w-[120px]">ประเภท / รอบ</th>
                    {sport === "track" ? (
                      <th className="p-1.5 border-black font-bold">สรุปผลการแข่งขันกรีฑา</th>
                    ) : (
                      <>
                        <th className="p-1.5 border-r border-black font-bold text-right w-[180px]">ทีมฝั่ง A</th>
                        <th className="p-1.5 border-r border-black font-bold text-center w-[80px]">คะแนน</th>
                        <th className="p-1.5 border-r border-black font-bold w-[180px]">ทีมฝั่ง B</th>
                        <th className="p-1.5 border-black font-bold text-center w-[80px]">สถานะ/ผู้ชนะ</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((m) => {
                    const matchNum = m.id.split("_").pop();
                    const isCompleted = m.status === "completed";
                    const isLive = m.status === "live";

                    return (
                      <tr key={m.id} className="border-b border-gray-300 hover:bg-gray-50 text-left">
                        <td className="p-1.5 border-r border-black font-bold text-center bg-gray-50 font-mono">{matchNum}</td>
                        <td className="p-1.5 border-r border-black font-mono font-medium text-[9px]">
                          <div>{m.date}</div>
                          <div className="font-bold">{m.time}</div>
                        </td>
                        <td className="p-1.5 border-r border-black font-semibold">{m.court}</td>
                        <td className="p-1.5 border-r border-black">
                          <div className="font-bold">{m.category}</div>
                          <div className="text-gray-600 font-mono text-[9px]">{m.round} {m.group ? `(${m.group})` : ""}</div>
                        </td>

                        {sport === "track" ? (
                          <td className="p-1.5">
                            {m.participants && m.participants.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1">
                                {m.participants.map((p, idx) => {
                                  const rank = m.ranks?.[idx]?.rank;
                                  const score = m.ranks?.[idx]?.score;
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[9px] border-b border-gray-100 pb-0.5">
                                      <span>{idx + 1}. <strong className="font-bold text-black">{p}</strong></span>
                                      <span className="font-mono text-gray-700">
                                        {score ? `เวลา/ระยะ: ${score}` : ""} {rank ? `[อันดับ: ${rank}]` : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">ยังไม่มีผู้ลงทะเบียน</span>
                            )}
                          </td>
                        ) : (
                          <>
                            <td className={`p-1.5 border-r border-black text-right font-bold ${m.winner === m.teamA ? "text-emerald-800" : ""}`}>
                              {m.winner === m.teamA && "👑 "}{m.teamA || "TBD"}
                            </td>
                            <td className="p-1.5 border-r border-black text-center font-mono font-black bg-gray-50 text-xs">
                              {m.scoreA !== null ? m.scoreA : "-"} : {m.scoreB !== null ? m.scoreB : "-"}
                            </td>
                            <td className={`p-1.5 border-r border-black font-bold ${m.winner === m.teamB ? "text-emerald-800" : ""}`}>
                              {m.teamB || "TBD"}{m.winner === m.teamB && " 👑"}
                            </td>
                            <td className="p-1.5 text-center">
                              {isLive ? (
                                <span className="font-bold text-red-600 animate-pulse">กำลังแข่ง 🔴</span>
                              ) : isCompleted ? (
                                <span className="text-emerald-700 font-bold">เสร็จสิ้น ({m.winner || "-"})</span>
                              ) : (
                                <span className="text-gray-400">ยังไม่แข่งขัน</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bracket / Finals Report for Cup structure if category is selected and not track */}
          {sport !== "track" && selectedCategory !== "" && (
            <div className="border border-black p-4 bg-gray-50/20">
              <h3 className="text-xs font-bold border-b-2 border-black pb-1 mb-2 uppercase text-black font-sans">
                🏆 ผลการแข่งขันรอบน็อคเอาท์ (Knockout Playoff Matches)
              </h3>
              {(() => {
                const koMatches = sportMatches.filter(m => 
                  m.category === selectedCategory && 
                  (m.round === "รอบ 8 ทีม" || m.round === "รอบรองชนะเลิศ" || m.round === "รอบชิงชนะเลิศ" || m.round === "ชิงที่ 3")
                ).sort((a,b) => (a.order || 0) - (b.order || 0));

                if (koMatches.length === 0) {
                  return <p className="text-xs text-gray-500 italic font-sans">ไม่มีบันทึกการแข่งขันรอบน็อคเอาท์ของประเภทนี้</p>;
                }

                return (
                  <table className="w-full text-[9px] border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left">
                        <th className="p-1.5 border-r border-black font-bold w-[120px]">รอบ</th>
                        <th className="p-1.5 border-r border-black font-bold text-right">ทีมฝั่ง A</th>
                        <th className="p-1.5 border-r border-black font-bold text-center w-[60px]">คะแนน</th>
                        <th className="p-1.5 border-r border-black font-bold text-left font-sans">ทีมฝั่ง B</th>
                        <th className="p-1.5 border-black font-bold text-center w-[120px]">ผู้ชนะเข้ารอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {koMatches.map((m) => (
                        <tr key={m.id} className="border-b border-gray-300">
                          <td className="p-1.5 border-r border-black font-bold">{m.round} {m.group ? `(${m.group})` : ""}</td>
                          <td className={`p-1.5 border-r border-black text-right ${m.winner === m.teamA ? "font-black text-emerald-800" : ""}`}>{m.teamA || "TBD"}</td>
                          <td className="p-1.5 border-r border-black text-center font-bold bg-gray-50 font-mono">{m.scoreA !== null ? m.scoreA : "-"} : {m.scoreB !== null ? m.scoreB : "-"}</td>
                          <td className={`p-1.5 border-r border-black text-left ${m.winner === m.teamB ? "font-black text-emerald-800" : ""}`}>{m.teamB || "TBD"}</td>
                          <td className="p-1.5 text-center font-bold text-emerald-700">{m.winner ? `🏆 ${m.winner}` : "รอยืนยันผล"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
          </>)}

          {/* Footer Signature Block */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-black font-sans">
            <div className="text-center">
              <p className="mb-12">ลงชื่อ ............................................................ ผู้รายงานผล</p>
              <p>( ............................................................ )</p>
              <p className="text-gray-500 mt-1">เจ้าหน้าที่ประสานงานการแข่งขัน</p>
            </div>
            <div className="text-center">
              <p className="mb-12">ลงชื่อ ............................................................ ผู้แทนผู้ตัดสิน</p>
              <p>( ............................................................ )</p>
              <p className="text-gray-500 mt-1">หัวหน้าคณะผู้ตัดสิน</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
