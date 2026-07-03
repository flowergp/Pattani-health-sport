import { Match, ExpenseItem } from "./types";

export const TEAM_NAMES = [
  "เมือง",
  "หนองจิก",
  "ยะรัง",
  "ยะหริ่ง",
  "ปะนาเระ",
  "มายอ",
  "แม่ลาน",
  "ไม้แก่น",
  "โคกโพธิ์",
  "สายบุรี",
  "กะพ้อ",
  "ทุ่งยางแดง",
  "สสจ.ปัตตานี"
];

export const INITIAL_EXPENSES: ExpenseItem[] = [
  { id: "exp_1", name: "คลิปบอร์ด", quantity: 4, pricePerUnit: 45, total: 180 },
  { id: "exp_2", name: "ดินสอ+ยางลบ", quantity: 4, pricePerUnit: 10, total: 40 },
  { id: "exp_3", name: "เชือกไนล่อน 1 ม้วน (ขนาด 5 มม.)", quantity: 1, pricePerUnit: 350, total: 350 },
  { id: "exp_4", name: "ตะปู ขนาด 3 นิ้ว (ครึ่ง กก.)", quantity: 1, pricePerUnit: 50, total: 50 },
  { id: "exp_5", name: "ตลับเมตร", quantity: 2, pricePerUnit: 35, total: 70 },
  { id: "exp_6", name: "ปากกาเคมี", quantity: 4, pricePerUnit: 25, total: 100 }
];

export const getInitialMatches = (): Match[] => {
  const matches: Match[] = [];
  let currentOrder = 1;

  // --- 1. TRACK & FIELD (กรีฑา) ---
  const trackCategories = [
    {
      id: "track_100_w",
      name: "วิ่ง 100 เมตร หญิง",
      gender: "หญิง" as const,
      g1: ["ไม้แก่น", "ทุ่งยางแดง", "สสจ.ปัตตานี", "มายอ", "สายบุรี", "หนองจิก"],
      g2: ["กะพ้อ", "ปะนาเระ", "ยะรัง", "โคกโพธิ์", "เมือง", "ยะหริ่ง", "แม่ลาน"]
    },
    {
      id: "track_100_m",
      name: "วิ่ง 100 เมตร ชาย",
      gender: "ชาย" as const,
      g1: ["ปะนาเระ", "มายอ", "หนองจิก", "เมือง", "ทุ่งยางแดง", "ยะหริ่ง", "แม่ลาน"],
      g2: ["ไม้แก่น", "กะพ้อ", "สายบุรี", "ยะรัง", "สสจ.ปัตตานี", "โคกโพธิ์"]
    },
    {
      id: "track_8x50_mix",
      name: "วิ่งพลัดผสม 8X50 เมตร (ชาย4 หญิง4)",
      gender: "ผสม" as const,
      g1: ["ไม้แก่น", "ยะรัง", "มายอ", "หนองจิก", "ทุ่งยางแดง", "แม่ลาน"],
      g2: ["ยะหริ่ง", "กะพ้อ", "ปะนาเระ", "เมือง", "โคกโพธิ์", "สสจ.ปัตตานี", "สายบุรี"]
    },
    {
      id: "track_4x100_w",
      name: "วิ่งพลัด 4X100 เมตร หญิง",
      gender: "หญิง" as const,
      g1: ["แม่ลาน", "กะพ้อ", "สายบุรี", "หนองจิก", "ทุ่งยางแดง", "เมือง"],
      g2: ["ไม้แก่น", "มายอ", "สสจ.ปัตตานี", "ปะนาเระ", "โคกโพธิ์", "ยะรัง", "ยะหริ่ง"]
    },
    {
      id: "track_4x100_m",
      name: "วิ่งพลัด 4X100 เมตร ชาย",
      gender: "ชาย" as const,
      g1: ["เมือง", "มายอ", "โคกโพธิ์", "แม่ลาน", "หนองจิก", "ปะนาเระ"],
      g2: ["ยะหริ่ง", "ไม้แก่น", "ยะรัง", "สายบุรี", "กะพ้อ", "สสจ.ปัตตานี", "ทุ่งยางแดง"]
    },
    {
      id: "track_4x100_mix",
      name: "วิ่งพลัดผสม 4X100 เมตร (ชาย2 หญิง2)",
      gender: "ผสม" as const,
      g1: ["สายบุรี", "เมือง", "ยะหริ่ง", "หนองจิก", "ไม้แก่น", "กะพ้อ"],
      g2: ["ปะนาเระ", "ยะรัง", "สสจ.ปัตตานี", "โคกโพธิ์", "ทุ่งยางแดง", "แม่ลาน", "มายอ"]
    }
  ];

  // Add Track Qualifying rounds (101 to 112)
  trackCategories.forEach((cat, index) => {
    // Group 1
    const idG1 = 101 + index * 2;
    matches.push({
      id: `track_${idG1}`,
      sport: "track",
      category: cat.name,
      gender: cat.gender,
      group: "กลุ่ม 1",
      round: "รอบคัดเลือก",
      court: "ลู่วิ่งกรีฑา",
      time: "09.00 น.",
      date: "10 ก.ค. 69",
      status: "pending",
      participants: cat.g1,
      ranks: cat.g1.map(name => ({ name })),
      order: currentOrder++
    });

    // Group 2
    const idG2 = 102 + index * 2;
    matches.push({
      id: `track_${idG2}`,
      sport: "track",
      category: cat.name,
      gender: cat.gender,
      group: "กลุ่ม 2",
      round: "รอบคัดเลือก",
      court: "ลู่วิ่งกรีฑา",
      time: "09.30 น.",
      date: "10 ก.ค. 69",
      status: "pending",
      participants: cat.g2,
      ranks: cat.g2.map(name => ({ name })),
      order: currentOrder++
    });
  });

  // Add Track Finals (113 to 118)
  const finalSequence = [
    { id: 113, catIndex: 2 }, // 8x50 Mix
    { id: 114, catIndex: 5 }, // 4x100 Mix
    { id: 115, catIndex: 3 }, // 4x100 W
    { id: 116, catIndex: 4 }, // 4x100 M
    { id: 117, catIndex: 0 }, // 100 W
    { id: 118, catIndex: 1 }  // 100 M
  ];

  finalSequence.forEach((fin) => {
    const cat = trackCategories[fin.catIndex];
    matches.push({
      id: `track_${fin.id}`,
      sport: "track",
      category: cat.name,
      gender: cat.gender,
      group: "",
      round: "รอบชิงชนะเลิศ",
      court: "ลู่วิ่งกรีฑา",
      time: "14.00 น.",
      date: "10 ก.ค. 69",
      status: "pending",
      participants: [], // Wait to be filled by Top 4 of G1 & G2
      ranks: [],
      order: currentOrder++
    });
  });


  // --- 2. PETANQUE (เปตอง) ---
  const petanqueGenders = [
    { category: "ทั่วไป ชายคู่", gender: "ชาย" as const, date: "7 ก.ค. 69" },
    { category: "ทั่วไป หญิงคู่", gender: "หญิง" as const, date: "6 ก.ค. 69" },
    { category: "ทีมผสม (ชาย 1 หญิง 2)", gender: "ผสม" as const, date: "8 ก.ค. 69" }
  ];

  const petanqueGroupStageMatches = [
    // Group A
    { group: "สาย A", court: "สนามที่ 1", teamA: "1 สาย A", teamB: "2 สาย A", time: "09.00 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "3 สาย A", teamB: "4 สาย A", time: "09.30 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "1 สาย A", teamB: "3 สาย A", time: "10.00 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "2 สาย A", teamB: "4 สาย A", time: "10.30 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "1 สาย A", teamB: "4 สาย A", time: "11.00 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "2 สาย A", teamB: "3 สาย A", time: "11.30 น." },
    // Group B
    { group: "สาย B", court: "สนามที่ 2", teamA: "1 สาย B", teamB: "2 สาย B", time: "09.00 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "3 สาย B", teamB: "4 สาย B", time: "09.30 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "1 สาย B", teamB: "3 สาย B", time: "10.00 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "2 สาย B", teamB: "4 สาย B", time: "10.30 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "1 สาย B", teamB: "4 สาย B", time: "11.00 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "2 สาย B", teamB: "3 สาย B", time: "11.30 น." },
    // Group C
    { group: "สาย C", court: "สนามที่ 3", teamA: "1 สาย C", teamB: "2 สาย C", time: "09.00 น." },
    { group: "สาย C", court: "สนามที่ 3", teamA: "3 สาย C", teamB: "4 สาย C", time: "09.30 น." },
    { group: "สาย C", court: "สนามที่ 3", teamA: "1 สาย C", teamB: "3 สาย C", time: "10.00 น." },
    { group: "สาย C", court: "สนามที่ 3", teamA: "2 สาย C", teamB: "4 สาย C", time: "10.30 น." },
    { group: "สาย C", court: "สนามที่ 3", teamA: "1 สาย C", teamB: "4 สาย C", time: "11.00 น." },
    { group: "สาย C", court: "สนามที่ 3", teamA: "2 สาย C", teamB: "3 สาย C", time: "11.30 น." },
    // Group D
    { group: "สาย D", court: "สนามที่ 4", teamA: "1 สาย D", teamB: "2 สาย D", time: "09.00 น." },
    { group: "สาย D", court: "สนามที่ 4", teamA: "3 สาย D", teamB: "4 สาย D", time: "09.30 น." },
    { group: "สาย D", court: "สนามที่ 4", teamA: "1 สาย D", teamB: "3 สาย D", time: "10.00 น." },
    { group: "สาย D", court: "สนามที่ 4", teamA: "2 สาย D", teamB: "4 สาย D", time: "10.30 น." },
    { group: "สาย D", court: "สนามที่ 4", teamA: "1 สาย D", teamB: "4 สาย D", time: "11.00 น." },
    { group: "สาย D", court: "สนามที่ 4", teamA: "2 สาย D", teamB: "3 สาย D", time: "11.30 น." }
  ];

  petanqueGenders.forEach((gen) => {
    // First round (Group Stage, Match 1 - 24)
    petanqueGroupStageMatches.forEach((m, idx) => {
      matches.push({
        id: `petanque_${gen.category}_${idx + 1}`,
        sport: "petanque",
        category: gen.category,
        gender: gen.gender,
        group: m.group,
        round: "รอบแรก",
        court: m.court,
        time: m.time,
        date: gen.date,
        status: "pending",
        teamA: m.teamA,
        teamB: m.teamB,
        scoreA: null,
        scoreB: null,
        winner: null,
        order: currentOrder++
      });
    });

    // Quarter-finals (Round 8 Teams, Match 25 - 28)
    const qf = [
      { id: 25, court: "สนามที่ 1", labelA: "ที่ 1 สาย A", labelB: "ที่ 2 สาย B" },
      { id: 26, court: "สนามที่ 2", labelA: "ที่ 1 สาย B", labelB: "ที่ 2 สาย A" },
      { id: 27, court: "สนามที่ 3", labelA: "ที่ 1 สาย C", labelB: "ที่ 2 สาย D" },
      { id: 28, court: "สนามที่ 4", labelA: "ที่ 1 สาย D", labelB: "ที่ 2 สาย C" }
    ];

    qf.forEach((m) => {
      matches.push({
        id: `petanque_${gen.category}_${m.id}`,
        sport: "petanque",
        category: gen.category,
        gender: gen.gender,
        group: "",
        round: "รอบ 8 ทีม",
        court: m.court,
        time: "13.30 น.",
        date: gen.date,
        status: "pending",
        teamA: m.labelA,
        teamB: m.labelB,
        scoreA: null,
        scoreB: null,
        winner: null,
        order: currentOrder++
      });
    });

    // Semi-finals (Match 29 - 30)
    matches.push({
      id: `petanque_${gen.category}_29`,
      sport: "petanque",
      category: gen.category,
      gender: gen.gender,
      group: "",
      round: "รอบรองชนะเลิศ",
      court: "สนามที่ 1",
      time: "15.00 น.",
      date: gen.date,
      status: "pending",
      teamA: "ผู้ชนะคู่ที่ 25",
      teamB: "ผู้ชนะคู่ที่ 27",
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });

    matches.push({
      id: `petanque_${gen.category}_30`,
      sport: "petanque",
      category: gen.category,
      gender: gen.gender,
      group: "",
      round: "รอบรองชนะเลิศ",
      court: "สนามที่ 2",
      time: "15.00 น.",
      date: gen.date,
      status: "pending",
      teamA: "ผู้ชนะคู่ที่ 26",
      teamB: "ผู้ชนะคู่ที่ 28",
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });

    // Match 31: 3rd place (ชิงที่ 3)
    matches.push({
      id: `petanque_${gen.category}_31`,
      sport: "petanque",
      category: gen.category,
      gender: gen.gender,
      group: "",
      round: "ชิงที่ 3",
      court: "สนามที่ 1",
      time: "16.00 น.",
      date: gen.date,
      status: "pending",
      teamA: "ผู้แพ้คู่ที่ 29",
      teamB: "ผู้แพ้คู่ที่ 30",
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });

    // Match 32: Final (ชิงชนะเลิศ)
    matches.push({
      id: `petanque_${gen.category}_32`,
      sport: "petanque",
      category: gen.category,
      gender: gen.gender,
      group: "",
      round: "รอบชิงชนะเลิศ",
      court: "สนามที่ 1",
      time: "16.30 น.",
      date: gen.date,
      status: "pending",
      teamA: "ผู้ชนะคู่ที่ 29",
      teamB: "ผู้ชนะคู่ที่ 30",
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });
  });


  // --- 3. VOLLEYBALL (วอลเลย์บอล) ---
  const volleyCategories = [
    { category: "ทีมชาย", gender: "ชาย" as const, date: "6 ก.ค. 69", matchesDate: "6 ก.ค. 69" },
    { category: "ทีมหญิง", gender: "หญิง" as const, date: "7 ก.ค. 69", matchesDate: "7 ก.ค. 69" }
  ];

  const volleyGroupMatchesMale = [
    // สนามที่ 1
    { matchNo: 1, group: "สาย A", court: "สนามที่ 1", teamA: "เมือง", teamB: "มายอ", time: "09.00 น." },
    { matchNo: 2, group: "สาย A", court: "สนามที่ 1", teamA: "กะพ้อ", teamB: "สสจ.ปัตตานี", time: "09.45 น." },
    { matchNo: 3, group: "สาย B", court: "สนามที่ 1", teamA: "ยะหริ่ง", teamB: "สายบุรี", time: "10.30 น." },
    { matchNo: 4, group: "สาย A", court: "สนามที่ 1", teamA: "เมือง", teamB: "สสจ.ปัตตานี", time: "11.15 น." },
    { matchNo: 5, group: "สาย A", court: "สนามที่ 1", teamA: "กะพ้อ", teamB: "มายอ", time: "13.00 น." },
    { matchNo: 6, group: "สาย B", court: "สนามที่ 1", teamA: "ทุ่งยางแดง", teamB: "สายบุรี", time: "13.45 น." },
    { matchNo: 7, group: "สาย A", court: "สนามที่ 1", teamA: "มายอ", teamB: "สสจ.ปัตตานี", time: "14.30 น." },

    // สนามที่ 2
    { matchNo: 8, group: "สาย B", court: "สนามที่ 2", teamA: "ยะหริ่ง", teamB: "ทุ่งยางแดง", time: "09.00 น." },
    { matchNo: 9, group: "สาย C", court: "สนามที่ 2", teamA: "ยะรัง", teamB: "โคกโพธิ์", time: "09.45 น." },
    { matchNo: 10, group: "สาย D", court: "สนามที่ 2", teamA: "ปะนาเระ", teamB: "ไม้แก่น", time: "10.30 น." },
    { matchNo: 11, group: "สาย C", court: "สนามที่ 2", teamA: "ยะรัง", teamB: "หนองจิก", time: "11.15 น." },
    { matchNo: 12, group: "สาย D", court: "สนามที่ 2", teamA: "ปะนาเระ", teamB: "แม่ลาน", time: "13.00 น." },
    { matchNo: 13, group: "สาย C", court: "สนามที่ 2", teamA: "โคกโพธิ์", teamB: "หนองจิก", time: "13.45 น." },
    { matchNo: 14, group: "สาย D", court: "สนามที่ 2", teamA: "ไม้แก่น", teamB: "แม่ลาน", time: "14.30 น." },
    { matchNo: 15, group: "สาย A", court: "สนามที่ 2", teamA: "เมือง", teamB: "กะพ้อ", time: "15.15 น." }
  ];

  const volleyGroupMatchesFemale = [
    // สนามที่ 1
    { matchNo: 1, group: "สาย C", court: "สนามที่ 1", teamA: "สายบุรี", teamB: "สสจ.ปัตตานี", time: "09.00 น." },
    { matchNo: 2, group: "สาย A", court: "สนามที่ 1", teamA: "แม่ลาน", teamB: "โคกโพธิ์", time: "09.45 น." },
    { matchNo: 3, group: "สาย B", court: "สนามที่ 1", teamA: "ปะนาเระ", teamB: "มายอ", time: "10.30 น." },
    { matchNo: 4, group: "สาย A", court: "สนามที่ 1", teamA: "แม่ลาน", teamB: "ยะหริ่ง", time: "11.15 น." },
    { matchNo: 5, group: "สาย B", court: "สนามที่ 1", teamA: "ปะนาเระ", teamB: "เมือง", time: "13.00 น." },
    { matchNo: 6, group: "สาย A", court: "สนามที่ 1", teamA: "โคกโพธิ์", teamB: "ยะหริ่ง", time: "13.45 น." },
    { matchNo: 7, group: "สาย B", court: "สนามที่ 1", teamA: "มายอ", teamB: "เมือง", time: "14.30 น." },
    { matchNo: 8, group: "สาย D", court: "สนามที่ 1", teamA: "หนองจิก", teamB: "ไม้แก่น", time: "15.15 น." },

    // สนามที่ 2
    { matchNo: 9, group: "สาย D", court: "สนามที่ 2", teamA: "หนองจิก", teamB: "ทุ่งยางแดง", time: "09.00 น." },
    { matchNo: 10, group: "สาย D", court: "สนามที่ 2", teamA: "ไม้แก่น", teamB: "ยะรัง", time: "09.45 น." },
    { matchNo: 11, group: "สาย C", court: "สนามที่ 2", teamA: "สายบุรี", teamB: "กะพ้อ", time: "10.30 น." },
    { matchNo: 12, group: "สาย D", court: "สนามที่ 2", teamA: "หนองจิก", teamB: "ยะรัง", time: "11.15 น." },
    { matchNo: 13, group: "สาย D", court: "สนามที่ 2", teamA: "ไม้แก่น", teamB: "ทุ่งยางแดง", time: "13.00 น." },
    { matchNo: 14, group: "สาย C", court: "สนามที่ 2", teamA: "กะพ้อ", teamB: "สสจ.ปัตตานี", time: "13.45 น." },
    { matchNo: 15, group: "สาย D", court: "สนามที่ 2", teamA: "ทุ่งยางแดง", teamB: "ยะรัง", time: "14.30 น." }
  ];

  volleyCategories.forEach((cat) => {
    const isMale = cat.gender === "ชาย";
    const dataset = isMale ? volleyGroupMatchesMale : volleyGroupMatchesFemale;

    dataset.forEach((m) => {
      matches.push({
        id: `volley_${isMale ? "men" : "women"}_${m.matchNo}`,
        sport: "volleyball",
        category: cat.category,
        gender: cat.gender,
        group: m.group,
        round: "รอบแรก",
        court: m.court,
        time: m.time,
        date: cat.matchesDate,
        status: "pending",
        teamA: m.teamA,
        teamB: m.teamB,
        scoreA: null,
        scoreB: null,
        winner: null,
        sets: [{ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }],
        order: currentOrder++
      });
    });

    // Quarter-finals (Round 8 Teams)
    const qf = [
      { id: 19, court: "สนามที่ 1", labelA: "ที่ 1 สาย A", labelB: "ที่ 2 สาย C" },
      { id: 20, court: "สนามที่ 1", labelA: "ที่ 1 สาย C", labelB: "ที่ 2 สาย A" },
      { id: 21, court: "สนามที่ 2", labelA: "ที่ 1 สาย B", labelB: "ที่ 2 สาย D" },
      { id: 22, court: "สนามที่ 2", labelA: "ที่ 1 สาย D", labelB: "ที่ 2 สาย B" }
    ];

    qf.forEach((m) => {
      matches.push({
        id: `volley_${isMale ? "men" : "women"}_${m.id}`,
        sport: "volleyball",
        category: cat.category,
        gender: cat.gender,
        group: "",
        round: "รอบ 8 ทีม",
        court: m.court,
        time: "10.00 น.",
        date: "8 ก.ค. 69",
        status: "pending",
        teamA: m.labelA,
        teamB: m.labelB,
        scoreA: null,
        scoreB: null,
        winner: null,
        sets: [{ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }],
        order: currentOrder++
      });
    });

    // Semi-finals
    matches.push({
      id: `volley_${isMale ? "men" : "women"}_23`,
      sport: "volleyball",
      category: cat.category,
      gender: cat.gender,
      group: "",
      round: "รอบรองชนะเลิศ",
      court: "สนามที่ 1",
      time: "09.00 น.",
      date: "9 ก.ค. 69",
      status: "pending",
      teamA: "ผู้ชนะคู่ที่ 19",
      teamB: "ผู้ชนะคู่ที่ 21",
      scoreA: null,
      scoreB: null,
      winner: null,
      sets: [{ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }],
      order: currentOrder++
    });

    matches.push({
      id: `volley_${isMale ? "men" : "women"}_24`,
      sport: "volleyball",
      category: cat.category,
      gender: cat.gender,
      group: "",
      round: "รอบรองชนะเลิศ",
      court: "สนามที่ 2",
      time: "09.00 น.",
      date: "9 ก.ค. 69",
      status: "pending",
      teamA: "ผู้ชนะคู่ที่ 20",
      teamB: "ผู้ชนะคู่ที่ 22",
      scoreA: null,
      scoreB: null,
      winner: null,
      sets: [{ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }],
      order: currentOrder++
    });

    // Match 25: 3rd place (ชิงที่ 3)
    matches.push({
      id: `volley_${isMale ? "men" : "women"}_25`,
      sport: "volleyball",
      category: cat.category,
      gender: cat.gender,
      group: "",
      round: "ชิงที่ 3",
      court: "สนามที่ 1",
      time: "13.00 น.",
      date: "9 ก.ค. 69",
      status: "pending",
      teamA: "ผู้แพ้คู่ที่ 23",
      teamB: "ผู้แพ้คู่ที่ 24",
      scoreA: null,
      scoreB: null,
      winner: null,
      sets: [{ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }],
      order: currentOrder++
    });

    // Match 26: Final (ชิงชนะเลิศ)
    matches.push({
      id: `volley_${isMale ? "men" : "women"}_26`,
      sport: "volleyball",
      category: cat.category,
      gender: cat.gender,
      group: "",
      round: "รอบชิงชนะเลิศ",
      court: "สนามที่ 1",
      time: "14.30 น.",
      date: "9 ก.ค. 69",
      status: "pending",
      teamA: "ผู้ชนะคู่ที่ 23",
      teamB: "ผู้ชนะคู่ที่ 24",
      scoreA: null,
      scoreB: null,
      winner: null,
      sets: [{ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 }],
      order: currentOrder++
    });
  });


  // --- 4. FOOTBALL (ฟุตบอล) ---
  const womenGroupData = [
    // สนามที่ 1
    { group: "สาย A", court: "สนามที่ 1", teamA: "เมือง", teamB: "ยะรัง", time: "09.00 น." },
    { group: "สาย C", court: "สนามที่ 1", teamA: "แม่ลาน", teamB: "ไม้แก่น", time: "09.30 น." },
    { group: "สาย D", court: "สนามที่ 1", teamA: "ทุ่งยางแดง", teamB: "สายบุรี", time: "10.00 น." },
    { group: "สาย B", court: "สนามที่ 1", teamA: "ยะหริ่ง", teamB: "สสจ.ปัตตานี", time: "10.30 น." },
    { group: "สาย D", court: "สนามที่ 1", teamA: "สายบุรี", teamB: "โคกโพธิ์", time: "11.00 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "กะพ้อ", teamB: "ยะรัง", time: "11.30 น." },
    { group: "สาย C", court: "สนามที่ 1", teamA: "หนองจิก", teamB: "แม่ลาน", time: "13.30 น." },
    { group: "สาย D", court: "สนามที่ 1", teamA: "ปะนาเระ", teamB: "สายบุรี", time: "14.00 น." },

    // สนามที่ 2
    { group: "สาย B", court: "สนามที่ 2", teamA: "มายอ", teamB: "ยะหริ่ง", time: "09.00 น." },
    { group: "สาย D", court: "สนามที่ 2", teamA: "โคกโพธิ์", teamB: "ปะนาเระ", time: "09.30 น." },
    { group: "สาย A", court: "สนามที่ 2", teamA: "เมือง", teamB: "กะพ้อ", time: "10.00 น." },
    { group: "สาย C", court: "สนามที่ 2", teamA: "ไม้แก่น", teamB: "หนองจิก", time: "10.30 น." },
    { group: "สาย D", court: "สนามที่ 2", teamA: "ปะนาเระ", teamB: "ทุ่งยางแดง", time: "11.00 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "สสจ.ปัตตานี", teamB: "มายอ", time: "11.30 น." },
    { group: "สาย D", court: "สนามที่ 2", teamA: "ทุ่งยางแดง", teamB: "โคกโพธิ์", time: "13.30 น." }
  ];

  const menGroupData = [
    // สนามที่ 1
    { group: "สาย A", court: "สนามที่ 1", teamA: "มายอ", teamB: "ไม้แก่น", time: "09.00 น." },
    { group: "สาย B", court: "สนามที่ 1", teamA: "หนองจิก", teamB: "ปะนาเระ", time: "09.30 น." },
    { group: "สาย D", court: "สนามที่ 1", teamA: "สสจ.ปัตตานี", teamB: "กะพ้อ", time: "10.00 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "มายอ", teamB: "แม่ลาน", time: "10.30 น." },
    { group: "สาย C", court: "สนามที่ 1", teamA: "ยะรัง", teamB: "เมือง", time: "11.00 น." },
    { group: "สาย A", court: "สนามที่ 1", teamA: "ยะหริ่ง", teamB: "มายอ", time: "11.30 น." },
    { group: "สาย B", court: "สนามที่ 1", teamA: "สายบุรี", teamB: "หนองจิก", time: "13.30 น." },
    { group: "สาย D", court: "สนามที่ 1", teamA: "โคกโพธิ์", teamB: "สสจ.ปัตตานี", time: "14.00 น." },

    // สนามที่ 2
    { group: "สาย A", court: "สนามที่ 2", teamA: "ยะหริ่ง", teamB: "แม่ลาน", time: "09.00 น." },
    { group: "สาย C", court: "สนามที่ 2", teamA: "ทุ่งยางแดง", teamB: "ยะรัง", time: "09.30 น." },
    { group: "สาย A", court: "สนามที่ 2", teamA: "ไม้แก่น", teamB: "ยะหริ่ง", time: "10.00 น." },
    { group: "สาย B", court: "สนามที่ 2", teamA: "ปะนาเระ", teamB: "สายบุรี", time: "10.30 น." },
    { group: "สาย D", court: "สนามที่ 2", teamA: "กะพ้อ", teamB: "โคกโพธิ์", time: "11.00 น." },
    { group: "สาย A", court: "สนามที่ 2", teamA: "แม่ลาน", teamB: "ไม้แก่น", time: "11.30 น." },
    { group: "สาย C", court: "สนามที่ 2", teamA: "เมือง", teamB: "ทุ่งยางแดง", time: "13.30 น." }
  ];

  // Populate Women's Football
  womenGroupData.forEach((m, idx) => {
    matches.push({
      id: `football_women_${idx + 1}`,
      sport: "football",
      category: "ฟุตบอลหญิง",
      gender: "หญิง",
      group: m.group,
      round: "รอบแรก",
      court: m.court,
      time: m.time,
      date: "6 ก.ค. 69",
      status: "pending",
      teamA: m.teamA,
      teamB: m.teamB,
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });
  });

  // Women's Quarter-finals
  const womenQF = [
    { id: 19, court: "สนามที่ 2", labelA: "ที่ 1 สาย A", labelB: "ที่ 2 สาย B", time: "09.00 น." },
    { id: 20, court: "สนามที่ 2", labelA: "ที่ 1 สาย C", labelB: "ที่ 2 สาย D", time: "09.30 น." },
    { id: 21, court: "สนามที่ 2", labelA: "ที่ 1 สาย B", labelB: "ที่ 2 สาย A", time: "10.00 น." },
    { id: 22, court: "สนามที่ 2", labelA: "ที่ 1 สาย D", labelB: "ที่ 2 สาย C", time: "10.30 น." }
  ];
  womenQF.forEach((m) => {
    matches.push({
      id: `football_women_${m.id}`,
      sport: "football",
      category: "ฟุตบอลหญิง",
      gender: "หญิง",
      group: "",
      round: "รอบ 8 ทีม",
      court: m.court,
      time: m.time,
      date: "9 ก.ค. 69",
      status: "pending",
      teamA: m.labelA,
      teamB: m.labelB,
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });
  });

  // Women's Semi-finals
  matches.push({
    id: "football_women_23",
    sport: "football",
    category: "ฟุตบอลหญิง",
    gender: "หญิง",
    group: "",
    round: "รอบรองชนะเลิศ",
    court: "สนามที่ 2",
    time: "13.30 น.",
    date: "9 ก.ค. 69",
    status: "pending",
    teamA: "ผู้ชนะคู่ที่ 19 หญิง",
    teamB: "ผู้ชนะคู่ที่ 20 หญิง",
    scoreA: null,
    scoreB: null,
    winner: null,
    order: currentOrder++
  });
  matches.push({
    id: "football_women_24",
    sport: "football",
    category: "ฟุตบอลหญิง",
    gender: "หญิง",
    group: "",
    round: "รอบรองชนะเลิศ",
    court: "สนามที่ 2",
    time: "14.00 น.",
    date: "9 ก.ค. 69",
    status: "pending",
    teamA: "ผู้ชนะคู่ที่ 21 หญิง",
    teamB: "ผู้ชนะคู่ที่ 22 หญิง",
    scoreA: null,
    scoreB: null,
    winner: null,
    order: currentOrder++
  });

  // Women's Final
  matches.push({
    id: "football_women_26",
    sport: "football",
    category: "ฟุตบอลหญิง",
    gender: "หญิง",
    group: "",
    round: "รอบชิงชนะเลิศ",
    court: "สนามที่ 2",
    time: "15.00 น.",
    date: "10 ก.ค. 69",
    status: "pending",
    teamA: "ผู้ชนะคู่ที่ 23 หญิง",
    teamB: "ผู้ชนะคู่ที่ 24 หญิง",
    scoreA: null,
    scoreB: null,
    winner: null,
    order: currentOrder++
  });

  // Populate Men's Football
  menGroupData.forEach((m, idx) => {
    matches.push({
      id: `football_men_${idx + 1}`,
      sport: "football",
      category: "ฟุตบอลชาย",
      gender: "ชาย",
      group: m.group,
      round: "รอบแรก",
      court: m.court,
      time: m.time,
      date: "7 ก.ค. 69",
      status: "pending",
      teamA: m.teamA,
      teamB: m.teamB,
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });
  });

  // Men's Quarter-finals
  const menQF = [
    { id: 19, court: "สนามที่ 1", labelA: "ที่ 1 สาย A", labelB: "ที่ 2 สาย B", time: "09.00 น." },
    { id: 20, court: "สนามที่ 1", labelA: "ที่ 1 สาย C", labelB: "ที่ 2 สาย D", time: "09.30 น." },
    { id: 21, court: "สนามที่ 1", labelA: "ที่ 1 สาย B", labelB: "ที่ 2 สาย A", time: "10.00 น." },
    { id: 22, court: "สนามที่ 1", labelA: "ที่ 1 สาย D", labelB: "ที่ 2 สาย C", time: "10.30 น." }
  ];
  menQF.forEach((m) => {
    matches.push({
      id: `football_men_${m.id}`,
      sport: "football",
      category: "ฟุตบอลชาย",
      gender: "ชาย",
      group: "",
      round: "รอบ 8 ทีม",
      court: m.court,
      time: m.time,
      date: "9 ก.ค. 69",
      status: "pending",
      teamA: m.labelA,
      teamB: m.labelB,
      scoreA: null,
      scoreB: null,
      winner: null,
      order: currentOrder++
    });
  });

  // Men's Semi-finals
  matches.push({
    id: "football_men_23",
    sport: "football",
    category: "ฟุตบอลชาย",
    gender: "ชาย",
    group: "",
    round: "รอบรองชนะเลิศ",
    court: "สนามที่ 1",
    time: "13.30 น.",
    date: "9 ก.ค. 69",
    status: "pending",
    teamA: "ผู้ชนะคู่ที่ 19 ชาย",
    teamB: "ผู้ชนะคู่ที่ 20 ชาย",
    scoreA: null,
    scoreB: null,
    winner: null,
    order: currentOrder++
  });
  matches.push({
    id: "football_men_24",
    sport: "football",
    category: "ฟุตบอลชาย",
    gender: "ชาย",
    group: "",
    round: "รอบรองชนะเลิศ",
    court: "สนามที่ 1",
    time: "14.00 น.",
    date: "9 ก.ค. 69",
    status: "pending",
    teamA: "ผู้ชนะคู่ที่ 21 ชาย",
    teamB: "ผู้ชนะคู่ที่ 22 ชาย",
    scoreA: null,
    scoreB: null,
    winner: null,
    order: currentOrder++
  });

  // Men's Final
  matches.push({
    id: "football_men_26",
    sport: "football",
    category: "ฟุตบอลชาย",
    gender: "ชาย",
    group: "",
    round: "รอบชิงชนะเลิศ",
    court: "สนามที่ 1",
    time: "15.30 น.",
    date: "10 ก.ค. 69",
    status: "pending",
    teamA: "ผู้ชนะคู่ที่ 23 ชาย",
    teamB: "ผู้ชนะคู่ที่ 24 ชาย",
    scoreA: null,
    scoreB: null,
    winner: null,
    order: currentOrder++
  });

  return matches;
};
